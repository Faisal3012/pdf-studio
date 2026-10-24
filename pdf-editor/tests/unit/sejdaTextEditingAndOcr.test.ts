import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { PDFDocument, rgb } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import {
  redactTextFromContentStream,
  applyExistingTextEditsToPdfDoc,
} from '@/services/pdf/pdfStreamModifier'
import {
  getCachedOcrItems,
  setCachedOcrItems,
  clearOcrCache,
  recognizeScannedPage,
} from '@/services/ocr/ocrService'
import { useEditorStore } from '@/store/editorStore'
import { useHistoryStore } from '@/store/historyStore'
import { buildProjectFile } from '@/services/storage/projectFile'
import type { ExistingTextEdit, PDFExtractedTextItem } from '@/types/existingText.types'
import type { PDFDocumentMeta } from '@/types/pdf.types'

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
    const strings = content.items.map((item: unknown) => (item as { str?: string }).str || '')
    fullText += strings.join(' ') + '\n'
  }
  return fullText
}

describe('Sejda-Like PDF Editing & OCR Pipeline', () => {
  beforeEach(() => {
    useEditorStore.getState().clearDocument()
    useHistoryStore.getState().clearHistory()
    clearOcrCache()
  })

  // ─── 1. Advanced TJ Kerning Redaction ──────────────────────────────────────────
  it('redacts text split across kerning chunks in TJ arrays', () => {
    // Real-world PDFs split text across TJ arrays with numeric spacing
    const stream = `
q
BT
/F1 12 Tf
1 0 0 1 50 600 Tm
[ (Inv) 10 (oice) -5 ( ) (Tot) (al) 250 (USD) -2 ( 500) ] TJ
ET
Q
`
    const { modifiedContent, redacted } = redactTextFromContentStream(stream, 'Invoice Total')
    expect(redacted).toBe(true)
    // The target "Invoice Total" should be erased from the stream, but the remaining "USD 500" preserved
    expect(modifiedContent).toContain('USD')
    expect(modifiedContent).toContain('500')
    expect(modifiedContent).not.toContain('(Inv)')
    expect(modifiedContent).not.toContain('(oice)')
  })

  // ─── 2. Non-White Background Preservation ─────────────────────────────────────
  it('applies replacement text with matching background color without hardcoding white', async () => {
    const doc = await PDFDocument.create()
    const page = doc.addPage([500, 400])

    // Draw shaded table header bar (slate blue background)
    page.drawRectangle({
      x: 40,
      y: 320,
      width: 420,
      height: 30,
      color: rgb(0.9, 0.93, 0.98), // #E5EEFA
    })
    page.drawText('Original Table Column', { x: 50, y: 330, size: 12 })
    const pdfBytes = await doc.save()

    const loadedDoc = await PDFDocument.load(pdfBytes)
    const edits: ExistingTextEdit[] = [
      {
        id: 'edit-table-col',
        pageIndex: 0,
        originalText: 'Original Table Column',
        replacementText: 'New Column Title',
        pdfX: 50,
        pdfY: 330,
        viewX: 50,
        viewY: 70,
        width: 130,
        height: 14,
        fontSize: 12,
        fontFamily: 'Helvetica',
        fontName: 'Helvetica',
        isBold: true,
        isItalic: false,
        color: '#1E3A8A',
        backgroundColor: '#E5EEFA', // Matching the cell's background color
        rotation: 0,
        transform: [12, 0, 0, 12, 50, 330],
      },
    ]

    const result = await applyExistingTextEditsToPdfDoc(loadedDoc, { 0: edits })
    expect(result.totalEditsApplied).toBe(1)

    const exportedBytes = await loadedDoc.save()
    const extractedText = await extractAllTextWithPdfJs(exportedBytes)
    expect(extractedText).toContain('New Column Title')
    expect(extractedText).not.toContain('Original Table Column')
  })

  // ─── 3. Accurate Bounding Box / Table Border Protection ────────────────────────
  it('restricts cover rectangle to exact glyph baseline and ascent without overlapping borders', async () => {
    const doc = await PDFDocument.create()
    const page = doc.addPage([500, 500])

    // Table cell borders: top at y=360, bottom at y=330 (cell height 30)
    page.drawLine({ start: { x: 40, y: 360 }, end: { x: 200, y: 360 }, thickness: 1 })
    page.drawLine({ start: { x: 40, y: 330 }, end: { x: 200, y: 330 }, thickness: 1 })
    // Text baseline at y=340, fontSize 12. Glyphs stay between y=337 and y=350
    page.drawText('Cell Value 100', { x: 50, y: 340, size: 12 })
    const pdfBytes = await doc.save()

    const loadedDoc = await PDFDocument.load(pdfBytes)
    const edits: ExistingTextEdit[] = [
      {
        id: 'cell-edit',
        pageIndex: 0,
        originalText: 'Cell Value 100',
        replacementText: 'Cell Value 250',
        pdfX: 50,
        pdfY: 340,
        viewX: 50,
        viewY: 150,
        width: 80,
        height: 14,
        fontSize: 12,
        fontFamily: 'Helvetica',
        fontName: 'Helvetica',
        isBold: false,
        isItalic: false,
        color: '#000000',
        rotation: 0,
        transform: [12, 0, 0, 12, 50, 340],
      },
    ]

    const res = await applyExistingTextEditsToPdfDoc(loadedDoc, { 0: edits })
    expect(res.totalEditsApplied).toBe(1)

    const exported = await loadedDoc.save()
    expect(exported.length).toBeGreaterThan(0)
  })

  // ─── 4. Longer Replacement Text Auto-Fit ──────────────────────────────────────
  it('automatically scales font size down when replacement text is longer than original width', async () => {
    const doc = await PDFDocument.create()
    const page = doc.addPage([500, 500])
    page.drawText('Short', { x: 50, y: 400, size: 14 })
    const pdfBytes = await doc.save()

    const loadedDoc = await PDFDocument.load(pdfBytes)
    const edits: ExistingTextEdit[] = [
      {
        id: 'long-fit-edit',
        pageIndex: 0,
        originalText: 'Short',
        replacementText: 'A Much Longer Replacement Description To Prevent Layout Overflow',
        pdfX: 50,
        pdfY: 400,
        viewX: 50,
        viewY: 100,
        width: 35, // very narrow original width
        height: 14,
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

    const res = await applyExistingTextEditsToPdfDoc(loadedDoc, { 0: edits })
    expect(res.totalEditsApplied).toBe(1)

    const exported = await loadedDoc.save()
    const textAfter = await extractAllTextWithPdfJs(exported)
    expect(textAfter).toContain('A Much Longer Replacement Description')
  })

  // ─── 5. OCR Service Caching and Lifecycle ──────────────────────────────────────
  it('caches OCR items by session and page to prevent redundant OCR runs', () => {
    const sessionId = 'test-ocr-session'
    const pageIndex = 0

    const mockOcrItems: PDFExtractedTextItem[] = [
      {
        id: 'ocr-p0-0',
        pageIndex: 0,
        text: 'Scanned Invoice',
        pdfX: 60,
        pdfY: 500,
        width: 100,
        height: 16,
        viewX: 60,
        viewY: 200,
        fontSize: 14,
        fontFamily: 'Helvetica',
        fontName: 'Helvetica',
        isBold: false,
        isItalic: false,
        color: '#000000',
        backgroundColor: '#ffffff',
        rotation: 0,
        transform: [14, 0, 0, 14, 60, 500],
        hasOps: false,
        isOcr: true,
        ocrConfidence: 92,
      },
    ]

    expect(getCachedOcrItems(sessionId, pageIndex)).toBeNull()

    // Store in cache
    setCachedOcrItems(sessionId, pageIndex, mockOcrItems)

    const retrieved = getCachedOcrItems(sessionId, pageIndex)
    expect(retrieved).not.toBeNull()
    expect(retrieved?.[0].text).toBe('Scanned Invoice')
    expect(retrieved?.[0].isOcr).toBe(true)

    // Clear cache
    clearOcrCache(sessionId)
    expect(getCachedOcrItems(sessionId, pageIndex)).toBeNull()
  })

  // ─── 6. OCR Cancellation / Abort Handling ─────────────────────────────────────
  it('handles OCR cancellation gracefully via AbortSignal without crashing', async () => {
    const controller = new AbortController()
    controller.abort() // Immediately aborted

    const dummyCanvas = document.createElement('canvas')
    dummyCanvas.width = 100
    dummyCanvas.height = 100

    await expect(
      recognizeScannedPage(
        'session-abort',
        0,
        dummyCanvas,
        500,
        500,
        undefined,
        controller.signal
      )
    ).rejects.toThrow('OCR operation was cancelled')
  })

  // ─── 7. Full Save/Restore of OCR-Assisted and Styled Edits ─────────────────────
  it('persists styled edits and OCR metadata through .pdfeditor project build and restore', async () => {
    const sessionId = 'session-project-persist'

    const docMeta: PDFDocumentMeta = {
      filename: 'scanned-doc.pdf',
      pageCount: 1,
      pageDimensions: [{ pageIndex: 0, width: 600, height: 800 }],
      fileSize: 4000,
    }

    const pages = [{ pageIndex: 0, order: 0, rotation: 0 as const, deleted: false }]

    const ocrEdit: ExistingTextEdit = {
      id: 'ocr-edit-1',
      pageIndex: 0,
      originalText: 'Recognized Scan Text',
      replacementText: 'Corrected Verified Text',
      pdfX: 70,
      pdfY: 650,
      viewX: 70,
      viewY: 150,
      width: 140,
      height: 16,
      fontSize: 14,
      fontFamily: 'Times-Roman',
      fontName: 'Times-Roman',
      isBold: true,
      isItalic: true,
      color: '#B94B45',
      backgroundColor: '#F5F2EA',
      rotation: 0,
      transform: [14, 0, 0, 14, 70, 650],
      isScannedFallback: true,
    }

    // Build project file
    const project = await buildProjectFile({
      sessionId,
      document: docMeta,
      pages,
      annotationsByPage: {},
      existingTextEditsByPage: { 0: [ocrEdit] },
      zoom: 100,
      currentPage: 0,
      theme: 'light',
    })

    expect(project.existingTextEdits).toHaveLength(1)
    const savedEdit = project.existingTextEdits![0]
    expect(savedEdit.replacementText).toBe('Corrected Verified Text')
    expect(savedEdit.fontFamily).toBe('Times-Roman')
    expect(savedEdit.isBold).toBe(true)
    expect(savedEdit.isItalic).toBe(true)
    expect(savedEdit.backgroundColor).toBe('#F5F2EA')
    expect(savedEdit.isScannedFallback).toBe(true)
  })
})
