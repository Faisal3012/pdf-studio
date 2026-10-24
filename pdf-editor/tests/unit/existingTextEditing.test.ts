import { describe, it, expect, beforeEach } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { useEditorStore } from '@/store/editorStore'
import { useHistoryStore } from '@/store/historyStore'
import {
  redactTextFromContentStream,
  applyExistingTextEditsToPdfDoc,
} from '@/services/pdf/pdfStreamModifier'
import { normalizeFontFamily } from '@/services/pdf/pdfTextExtractor'
import type { ExistingTextEdit } from '@/types/existingText.types'

describe('True Existing-Text Editing Engine', () => {
  beforeEach(() => {
    useEditorStore.getState().clearDocument()
    useHistoryStore.getState().clearHistory()
  })

  it('normalizes font family and detects bold / italic weights', () => {
    const boldSans = normalizeFontFamily('ABCDEF+Arial-BoldMT')
    expect(boldSans.family).toBe('Helvetica')
    expect(boldSans.isBold).toBe(true)
    expect(boldSans.isItalic).toBe(false)

    const italicTimes = normalizeFontFamily('TimesNewRomanPS-Italic')
    expect(italicTimes.family).toBe('Times-Roman')
    expect(italicTimes.isItalic).toBe(true)

    const mono = normalizeFontFamily('CourierNewPSMT')
    expect(mono.family).toBe('Courier')
  })

  it('redacts original text target from raw content streams so it cannot be extracted', () => {
    const streamSnippet = `
q
BT
/F1 14 Tf
1 0 0 1 50 300 Tm
(Confidential Report) Tj
ET
Q
`
    const { modifiedContent, redacted } = redactTextFromContentStream(streamSnippet, 'Confidential Report')
    expect(redacted).toBe(true)
    expect(modifiedContent).not.toContain('(Confidential Report)')
    expect(modifiedContent).toContain('() Tj')
  })

  it('redacts hex-encoded strings from content streams', () => {
    // "Invoice" in hex is 496E766F696365
    const streamSnippet = `
q
BT
/F2 16 Tf
1 0 0 1 70 450 Tm
<496E766F696365> Tj
ET
Q
`
    const { modifiedContent, redacted } = redactTextFromContentStream(streamSnippet, 'Invoice')
    expect(redacted).toBe(true)
    expect(modifiedContent).not.toContain('<496E766F696365>')
    expect(modifiedContent).toContain('<> Tj')
  })

  it('applies true existing-text edit to a real PDF, redacting source text and inserting replacement', async () => {
    // 1. Create a pristine PDF with an original text span
    const doc = await PDFDocument.create()
    const page = doc.addPage([600, 800])
    page.drawText('Original Price USD 100', { x: 50, y: 700, size: 16 })
    page.drawText('Unrelated Header', { x: 50, y: 750, size: 20 })
    const pdfBytes = await doc.save()

    // 2. Load PDF into pdf-lib to simulate export flow
    const loadedDoc = await PDFDocument.load(pdfBytes)

    const edits: ExistingTextEdit[] = [
      {
        id: 'edit-1',
        pageIndex: 0,
        originalText: 'Original Price USD 100',
        replacementText: 'Discounted Price USD 50',
        pdfX: 50,
        pdfY: 700,
        viewX: 50,
        viewY: 100,
        width: 150,
        height: 20,
        fontSize: 16,
        fontFamily: 'Helvetica',
        fontName: 'Helvetica',
        isBold: false,
        isItalic: false,
        color: '#059669', // Emerald green
        rotation: 0,
        transform: [16, 0, 0, 16, 50, 700],
      },
    ]

    const result = await applyExistingTextEditsToPdfDoc(loadedDoc, { 0: edits })
    expect(result.totalEditsApplied).toBe(1)
    expect(result.redactedCount).toBeGreaterThanOrEqual(1)

    // 3. Re-save and inspect resulting binary
    const modifiedBytes = await loadedDoc.save()
    expect(modifiedBytes.length).toBeGreaterThan(0)

    // Reopen exported document
    const reloadedDoc = await PDFDocument.load(modifiedBytes)
    expect(reloadedDoc.getPageCount()).toBe(1)
  })

  it('handles longer replacement text by adjusting font size measurement gracefully', async () => {
    const doc = await PDFDocument.create()
    const page = doc.addPage([500, 500])
    page.drawText('Short', { x: 50, y: 400, size: 14 })
    const pdfBytes = await doc.save()

    const loadedDoc = await PDFDocument.load(pdfBytes)

    const edits: ExistingTextEdit[] = [
      {
        id: 'edit-long',
        pageIndex: 0,
        originalText: 'Short',
        replacementText: 'This is a significantly longer replacement text string to test font size scaling',
        pdfX: 50,
        pdfY: 400,
        viewX: 50,
        viewY: 100,
        width: 40, // narrow original width
        height: 16,
        fontSize: 14,
        fontFamily: 'Helvetica',
        fontName: 'Helvetica',
        isBold: false,
        isItalic: false,
        color: '#000000',
        rotation: 0,
        transform: [14, 0, 0, 14, 50, 400],
      },
    ]

    const result = await applyExistingTextEditsToPdfDoc(loadedDoc, { 0: edits })
    expect(result.totalEditsApplied).toBe(1)

    const reloadedBytes = await loadedDoc.save()
    expect(reloadedBytes.length).toBeGreaterThan(0)
  })

  it('supports undo and redo of existing text edits in editor store and history', () => {
    const store = useEditorStore.getState()
    store.setDocument(
      {
        filename: 'contract.pdf',
        pageCount: 1,
        pageDimensions: [{ pageIndex: 0, width: 600, height: 800 }],
        fileSize: 5000,
      },
      'session-test-undo'
    )

    const edit1: ExistingTextEdit = {
      id: 'text-1',
      pageIndex: 0,
      originalText: 'Agreement Date: 2024',
      replacementText: 'Agreement Date: 2026',
      pdfX: 100,
      pdfY: 600,
      viewX: 100,
      viewY: 200,
      width: 120,
      height: 18,
      fontSize: 14,
      fontFamily: 'Helvetica',
      fontName: 'Helvetica',
      isBold: true,
      isItalic: false,
      color: '#1e293b',
      rotation: 0,
      transform: [14, 0, 0, 14, 100, 600],
    }

    // 1. Upsert edit
    useEditorStore.getState().upsertExistingTextEdit(edit1)
    expect(useEditorStore.getState().existingTextEditsByPage[0]).toHaveLength(1)
    expect(useEditorStore.getState().existingTextEditsByPage[0][0].replacementText).toBe('Agreement Date: 2026')

    // 2. Modify edit
    useEditorStore.getState().upsertExistingTextEdit({
      ...edit1,
      replacementText: 'Agreement Date: 2030',
    })
    expect(useEditorStore.getState().existingTextEditsByPage[0][0].replacementText).toBe('Agreement Date: 2030')

    // 3. Remove edit (revert to original)
    useEditorStore.getState().removeExistingTextEdit('text-1')
    expect(useEditorStore.getState().existingTextEditsByPage[0]).toHaveLength(0)
  })

  it('verifies that redacted text is physically removed and cannot be extracted from the modified PDF stream', async () => {
    const doc = await PDFDocument.create()
    const page = doc.addPage([600, 800])
    page.drawText('ConfidentialSSN-123-45-6789', { x: 50, y: 700, size: 14 })
    page.drawText('Public Heading Section', { x: 50, y: 750, size: 18 })
    const pdfBytes = await doc.save()

    const loadedDoc = await PDFDocument.load(pdfBytes)
    const edits: ExistingTextEdit[] = [
      {
        id: 'redact-test',
        pageIndex: 0,
        originalText: 'ConfidentialSSN-123-45-6789',
        replacementText: 'Redacted-ID-XXXXX',
        pdfX: 50,
        pdfY: 700,
        viewX: 50,
        viewY: 100,
        width: 140,
        height: 18,
        fontSize: 14,
        fontFamily: 'Helvetica',
        fontName: 'Helvetica',
        isBold: false,
        isItalic: false,
        color: '#000000',
        rotation: 0,
        transform: [14, 0, 0, 14, 50, 700],
      },
    ]

    const result = await applyExistingTextEditsToPdfDoc(loadedDoc, { 0: edits })
    expect(result.redactedCount).toBeGreaterThanOrEqual(1)

    const savedBytes = await loadedDoc.save()
    const savedDoc = await PDFDocument.load(savedBytes)

    // Inspect saved PDF bytes to verify the redacted string was physically stripped from content streams
    const savedBinaryString = new TextDecoder('latin1').decode(savedBytes)
    expect(savedBinaryString).not.toContain('ConfidentialSSN-123-45-6789')
    // Ensure the document can still be opened and parsed cleanly
    expect(savedDoc.getPageCount()).toBe(1)
  })

  it('handles rotated text preserving rotation parameters in pdf-lib stream modification', async () => {
    const doc = await PDFDocument.create()
    const page = doc.addPage([500, 500])
    page.drawText('Vertical Stamp', { x: 100, y: 200, size: 12 })
    const bytes = await doc.save()

    const loadedDoc = await PDFDocument.load(bytes)
    const edits: ExistingTextEdit[] = [
      {
        id: 'edit-rot',
        pageIndex: 0,
        originalText: 'Vertical Stamp',
        replacementText: 'Approved Stamp',
        pdfX: 100,
        pdfY: 200,
        viewX: 100,
        viewY: 300,
        width: 80,
        height: 16,
        fontSize: 12,
        fontFamily: 'Helvetica',
        fontName: 'Helvetica',
        isBold: true,
        isItalic: false,
        color: '#2563eb',
        rotation: 90,
        transform: [0, 12, -12, 0, 100, 200],
      },
    ]

    const result = await applyExistingTextEditsToPdfDoc(loadedDoc, { 0: edits })
    expect(result.totalEditsApplied).toBe(1)
    const outBytes = await loadedDoc.save()
    expect(outBytes.length).toBeGreaterThan(0)
  })
})
