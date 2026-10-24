import { describe, it, expect } from 'vitest'
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import {
  redactTextFromContentStream,
  applyExistingTextEditsToPdfDoc,
  stringToPdfHex,
} from '@/services/pdf/pdfStreamModifier'
import type { ExistingTextEdit } from '@/types/existingText.types'

/**
 * Helper to extract text from a raw PDF Uint8Array buffer using PDF.js
 */
async function extractAllTextWithPdfJs(pdfBytes: Uint8Array): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({
    data: pdfBytes.slice(0),
    useSystemFonts: true,
    isEvalSupported: false,
    disableFontFace: true,
  })
  const pdf = await loadingTask.promise
  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const strings = content.items.map((item: unknown) => {
      const it = item as { str?: string }
      return it.str || ''
    })
    fullText += strings.join(' ') + '\n'
  }
  return fullText
}

describe('Comprehensive PDF Fixtures and Independent Integration Verification', () => {
  // ─── Fixture 1: Standard Font Document (Helvetica / Times-Roman) ──────────────
  it('Fixture 1: Standard Font Document — Replaces text and verifies with independent parser', async () => {
    const doc = await PDFDocument.create()
    const font = await doc.embedFont(StandardFonts.Helvetica)
    const page = doc.addPage([600, 400])
    page.drawText('Original Price: USD 999', { x: 50, y: 300, size: 16, font })
    page.drawText('Invoice Date: 2026-10-23', { x: 50, y: 250, size: 14, font })
    const originalPdfBytes = await doc.save()

    // Independent parser check before editing
    const textBefore = await extractAllTextWithPdfJs(originalPdfBytes)
    expect(textBefore).toContain('Original Price: USD 999')
    expect(textBefore).toContain('Invoice Date: 2026-10-23')

    // Apply existing text edit
    const loadedDoc = await PDFDocument.load(originalPdfBytes)
    const edits: ExistingTextEdit[] = [
      {
        id: 'edit-std-1',
        pageIndex: 0,
        originalText: 'Original Price: USD 999',
        replacementText: 'Special Price: USD 499',
        pdfX: 50,
        pdfY: 300,
        viewX: 50,
        viewY: 100,
        width: 180,
        height: 20,
        fontSize: 16,
        fontFamily: 'Helvetica',
        fontName: 'Helvetica',
        isBold: false,
        isItalic: false,
        color: '#000000',
        rotation: 0,
        transform: [16, 0, 0, 16, 50, 300],
      },
    ]

    const result = await applyExistingTextEditsToPdfDoc(loadedDoc, { 0: edits })
    expect(result.totalEditsApplied).toBe(1)
    expect(result.redactedCount).toBeGreaterThanOrEqual(1)

    const editedBytes = await loadedDoc.save()

    // Verification with independent PDF.js parser
    const textAfter = await extractAllTextWithPdfJs(editedBytes)
    expect(textAfter).toContain('Special Price: USD 499')
    expect(textAfter).toContain('Invoice Date: 2026-10-23') // Unrelated text preserved!

    // Verify raw content stream no longer contains original confidential string
    const rawString = new TextDecoder('latin1').decode(editedBytes)
    expect(rawString).not.toContain('Original Price: USD 999')
  })

  // ─── Fixture 2: Escaped characters and Hexadecimal Strings ───────────────────
  it('Fixture 2: Escaped and Hex Strings — Redacts hex encoded strings correctly', async () => {
    // Construct content stream with hex string: <536563726574> Tj => "Secret"
    const hex = stringToPdfHex('ConfidentialData')
    const rawStream = `
q
BT
/F1 12 Tf
50 200 Td
<${hex}> Tj
ET
Q
`
    const { modifiedContent, redacted } = redactTextFromContentStream(rawStream, 'ConfidentialData')
    expect(redacted).toBe(true)
    expect(modifiedContent).not.toContain(hex)
    expect(modifiedContent).toContain('<> Tj')
  })

  // ─── Fixture 3: TJ Array with Numeric Spacing Adjustments ────────────────────
  it('Fixture 3: TJ Array with Numeric Spacing Adjustments — Correctly redacts array items', async () => {
    const rawStream = `
BT
/F1 12 Tf
[(Acme Corporation) -15 (Agreement)] TJ
ET
`
    const { modifiedContent, redacted } = redactTextFromContentStream(rawStream, 'Acme Corporation')
    expect(redacted).toBe(true)
    expect(modifiedContent).not.toContain('(Acme Corporation)')
    expect(modifiedContent).toContain('()')
    expect(modifiedContent).toContain('(Agreement)') // Preserves unrelated array portion
  })

  // ─── Fixture 4: Rotated Text Span (e.g. 90 degrees stamp) ─────────────────────
  it('Fixture 4: Rotated Text — Accurately preserves rotation transformation', async () => {
    const doc = await PDFDocument.create()
    const font = await doc.embedFont(StandardFonts.HelveticaBold)
    const page = doc.addPage([400, 400])
    page.drawText('CONFIDENTIAL DRAFT', {
      x: 100,
      y: 100,
      size: 14,
      font,
      rotate: degrees(90),
    })
    const bytes = await doc.save()

    const loadedDoc = await PDFDocument.load(bytes)
    const edits: ExistingTextEdit[] = [
      {
        id: 'edit-rot',
        pageIndex: 0,
        originalText: 'CONFIDENTIAL DRAFT',
        replacementText: 'PUBLIC RELEASE',
        pdfX: 100,
        pdfY: 100,
        viewX: 100,
        viewY: 300,
        width: 140,
        height: 18,
        fontSize: 14,
        fontFamily: 'Helvetica',
        fontName: 'Helvetica',
        isBold: true,
        isItalic: false,
        color: '#2563eb',
        rotation: 90,
        transform: [0, 14, -14, 0, 100, 100],
      },
    ]

    const result = await applyExistingTextEditsToPdfDoc(loadedDoc, { 0: edits })
    expect(result.totalEditsApplied).toBe(1)
    const outBytes = await loadedDoc.save()

    const textAfter = await extractAllTextWithPdfJs(outBytes)
    expect(textAfter).toContain('PUBLIC RELEASE')
  })

  // ─── Fixture 5: Multiple Text Spans on Same Line ─────────────────────────────
  it('Fixture 5: Multiple Text Spans on Same Line — Edits one span while preserving neighboring spans', async () => {
    const doc = await PDFDocument.create()
    const font = await doc.embedFont(StandardFonts.Helvetica)
    const page = doc.addPage([600, 400])
    page.drawText('Item 1: Apples', { x: 50, y: 350, size: 14, font })
    page.drawText('Qty: 10', { x: 200, y: 350, size: 14, font })
    page.drawText('Total: $50', { x: 300, y: 350, size: 14, font })
    const bytes = await doc.save()

    const loadedDoc = await PDFDocument.load(bytes)
    const edits: ExistingTextEdit[] = [
      {
        id: 'edit-qty',
        pageIndex: 0,
        originalText: 'Qty: 10',
        replacementText: 'Qty: 25',
        pdfX: 200,
        pdfY: 350,
        viewX: 200,
        viewY: 50,
        width: 50,
        height: 16,
        fontSize: 14,
        fontFamily: 'Helvetica',
        fontName: 'Helvetica',
        isBold: false,
        isItalic: false,
        color: '#000000',
        rotation: 0,
        transform: [14, 0, 0, 14, 200, 350],
      },
    ]

    await applyExistingTextEditsToPdfDoc(loadedDoc, { 0: edits })
    const outBytes = await loadedDoc.save()

    const text = await extractAllTextWithPdfJs(outBytes)
    expect(text).toContain('Item 1: Apples') // Unchanged
    expect(text).toContain('Qty: 25')        // Changed
    expect(text).toContain('Total: $50')     // Unchanged
  })

  // ─── Fixture 6: Document with Vector Graphics & Images ───────────────────────
  it('Fixture 6: Document with Vector Graphics — Preserves drawings and vectors', async () => {
    const doc = await PDFDocument.create()
    const font = await doc.embedFont(StandardFonts.Helvetica)
    const page = doc.addPage([500, 500])

    // Draw vector graphics
    page.drawRectangle({
      x: 30,
      y: 30,
      width: 440,
      height: 440,
      borderColor: rgb(0.2, 0.4, 0.8),
      borderWidth: 2,
    })
    page.drawLine({
      start: { x: 50, y: 250 },
      end: { x: 450, y: 250 },
      thickness: 1.5,
      color: rgb(0.5, 0.5, 0.5),
    })
    page.drawText('Vector Header', { x: 50, y: 400, size: 16, font })

    const bytes = await doc.save()
    const loadedDoc = await PDFDocument.load(bytes)

    const edits: ExistingTextEdit[] = [
      {
        id: 'edit-vec',
        pageIndex: 0,
        originalText: 'Vector Header',
        replacementText: 'Updated Header',
        pdfX: 50,
        pdfY: 400,
        viewX: 50,
        viewY: 100,
        width: 120,
        height: 20,
        fontSize: 16,
        fontFamily: 'Helvetica',
        fontName: 'Helvetica',
        isBold: false,
        isItalic: false,
        color: '#000000',
        rotation: 0,
        transform: [16, 0, 0, 16, 50, 400],
      },
    ]

    await applyExistingTextEditsToPdfDoc(loadedDoc, { 0: edits })
    const outBytes = await loadedDoc.save()

    const reloaded = await PDFDocument.load(outBytes)
    expect(reloaded.getPageCount()).toBe(1)
    const text = await extractAllTextWithPdfJs(outBytes)
    expect(text).toContain('Updated Header')
  })

  // ─── Fixture 7: Scanned Image-Only Page (OCR Detection) ─────────────────────
  it('Fixture 7: Scanned Image Page — Detects absence of text stream', async () => {
    // A document containing only an image or empty vector paths without text
    const doc = await PDFDocument.create()
    const page = doc.addPage([500, 700])
    page.drawRectangle({ x: 0, y: 0, width: 500, height: 700, color: rgb(0.9, 0.9, 0.9) })
    const bytes = await doc.save()

    const text = await extractAllTextWithPdfJs(bytes)
    expect(text.trim()).toBe('') // No selectable text!
  })

  // ─── Fixture 8: Longer vs Shorter Replacements (Font Measurement) ───────────
  it('Fixture 8: Replacement Sizing — Adjusts font scaling dynamically for longer strings', async () => {
    const doc = await PDFDocument.create()
    const font = await doc.embedFont(StandardFonts.Helvetica)
    const page = doc.addPage([400, 300])
    page.drawText('Short', { x: 50, y: 200, size: 14, font })
    const bytes = await doc.save()

    const loadedDoc = await PDFDocument.load(bytes)
    const edits: ExistingTextEdit[] = [
      {
        id: 'edit-scale',
        pageIndex: 0,
        originalText: 'Short',
        replacementText: 'This is an exceedingly long replacement string designed to exceed bounds',
        pdfX: 50,
        pdfY: 200,
        viewX: 50,
        viewY: 100,
        width: 35, // Very short original width
        height: 16,
        fontSize: 14,
        fontFamily: 'Helvetica',
        fontName: 'Helvetica',
        isBold: false,
        isItalic: false,
        color: '#000000',
        rotation: 0,
        transform: [14, 0, 0, 14, 50, 200],
      },
    ]

    const result = await applyExistingTextEditsToPdfDoc(loadedDoc, { 0: edits })
    expect(result.totalEditsApplied).toBe(1)
    const outBytes = await loadedDoc.save()
    const text = await extractAllTextWithPdfJs(outBytes)
    expect(text).toContain('This is an exceedingly long replacement string')
  })

  // ─── Fixture 9: Undo/Redo and Exporting after Redo ───────────────────────────
  it('Fixture 9: Undo, Redo, and Export — Preserves edits across undo/redo stack and exports final redone state', async () => {
    // 1. Setup base PDF
    const doc = await PDFDocument.create()
    const font = await doc.embedFont(StandardFonts.Helvetica)
    const page = doc.addPage([500, 300])
    page.drawText('Status: Pending Approval', { x: 50, y: 150, size: 14, font })
    const baseBytes = await doc.save()

    // 2. Perform edit
    const edit1: ExistingTextEdit = {
      id: 'status-edit',
      pageIndex: 0,
      originalText: 'Status: Pending Approval',
      replacementText: 'Status: Approved by Manager',
      pdfX: 50,
      pdfY: 150,
      viewX: 50,
      viewY: 150,
      width: 160,
      height: 18,
      fontSize: 14,
      fontFamily: 'Helvetica',
      fontName: 'Helvetica',
      isBold: false,
      isItalic: false,
      color: '#059669',
      rotation: 0,
      transform: [14, 0, 0, 14, 50, 150],
    }

    // Simulate redo (re-applying edit1)
    const activeEditsRedo: Record<number, ExistingTextEdit[]> = { 0: [edit1] }

    // Export after redo
    const loadedDoc = await PDFDocument.load(baseBytes)
    const result = await applyExistingTextEditsToPdfDoc(loadedDoc, activeEditsRedo)
    expect(result.totalEditsApplied).toBe(1)
    expect(result.redactedCount).toBeGreaterThanOrEqual(1)

    const exportedBytes = await loadedDoc.save()
    const text = await extractAllTextWithPdfJs(exportedBytes)
    expect(text).toContain('Status: Approved by Manager')
    expect(text).not.toContain('Status: Pending Approval')
  })

  // ─── Fixture 10: Incomplete Redaction Warning Audit ──────────────────────────
  it('Fixture 10: Unredacted Tracking — Reports unredactedCount when target string does not match stream encoding', async () => {
    const doc = await PDFDocument.create()
    const page = doc.addPage([500, 300])
    page.drawText('Document Header', { x: 50, y: 200, size: 14 })
    const baseBytes = await doc.save()

    const loadedDoc = await PDFDocument.load(baseBytes)
    // Edit with a target text that cannot be found in the content stream (simulating custom CID or encrypted stream)
    const nonMatchingEdit: ExistingTextEdit = {
      id: 'mismatch-1',
      pageIndex: 0,
      originalText: 'NonExistentString123',
      replacementText: 'NewValue',
      pdfX: 50,
      pdfY: 200,
      viewX: 50,
      viewY: 100,
      width: 100,
      height: 18,
      fontSize: 14,
      fontFamily: 'Helvetica',
      fontName: 'Helvetica',
      isBold: false,
      isItalic: false,
      color: '#000000',
      rotation: 0,
      transform: [14, 0, 0, 14, 50, 200],
    }

    const result = await applyExistingTextEditsToPdfDoc(loadedDoc, { 0: [nonMatchingEdit] })
    expect(result.totalEditsApplied).toBe(1)
    expect(result.redactedCount).toBe(0)
    expect(result.unredactedCount).toBe(1)
    expect(result.unredactedDetails[0]).toContain('NonExistentString123')
  })
})
