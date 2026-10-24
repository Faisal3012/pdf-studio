import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import { buildProjectFile, loadProjectFile, decodePDFFromProject } from '@/services/storage/projectFile'
import {
  storePDF,
  storeSession,
  getSession,
  storeAnnotations,
  getAnnotations,
  storeExistingTextEdits,
  getExistingTextEdits,
  clearFullSession,
} from '@/services/storage/indexedDB'
import { exportPDF } from '@/services/pdf/pdfExporter'
import type { ExistingTextEdit } from '@/types/existingText.types'
import type { Annotation } from '@/types/annotation.types'
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
    const strings = content.items.map((item: unknown) => {
      const it = item as { str?: string }
      return it.str || ''
    })
    fullText += strings.join(' ') + '\n'
  }
  return fullText
}

describe('Runtime Acceptance Integration — Full End-to-End Tests', () => {
  const sessionId = 'test-session-accept-1'

  beforeEach(async () => {
    localStorage.clear()
    await clearFullSession(sessionId).catch(() => {})
  })

  it('Test A: Save and Restore (.pdfeditor project lifecycle with existing-text edits and annotations)', async () => {
    // 1. Create a real multi-page PDF with 2 pages
    const rawDoc = await PDFDocument.create()
    const font = await rawDoc.embedFont(StandardFonts.Helvetica)
    
    const p1 = rawDoc.addPage([600, 400])
    p1.drawText('Page 1 Contract Total: $10,000', { x: 50, y: 300, size: 14, font })
    
    const p2 = rawDoc.addPage([600, 400])
    p2.drawText('Page 2 Termination Terms: 30 Days Notice', { x: 50, y: 300, size: 14, font })
    
    const pdfBytes = await rawDoc.save()

    // Store in IndexedDB
    await storePDF(sessionId, pdfBytes.buffer, 'multi-page-contract.pdf')

    const docMeta: PDFDocumentMeta = {
      filename: 'multi-page-contract.pdf',
      pageCount: 2,
      pageDimensions: [
        { width: 600, height: 400 },
        { width: 600, height: 400 },
      ],
      fileSizeBytes: pdfBytes.byteLength,
    }

    const pages = [
      { pageIndex: 0, order: 0, rotation: 0 as const, deleted: false },
      { pageIndex: 1, order: 1, rotation: 0 as const, deleted: false },
    ]

    // 2. Existing text edit on Page 1
    const textEditP1: ExistingTextEdit = {
      id: 'existing-edit-1',
      pageIndex: 0,
      originalText: 'Page 1 Contract Total: $10,000',
      replacementText: 'Page 1 Contract Total: $25,000',
      pdfX: 50,
      pdfY: 300,
      viewX: 50,
      viewY: 100,
      width: 200,
      height: 18,
      fontSize: 14,
      fontFamily: 'Helvetica',
      fontName: 'Helvetica',
      isBold: false,
      isItalic: false,
      color: '#000000',
      rotation: 0,
      transform: [14, 0, 0, 14, 50, 300],
    }

    // 3. Separate text annotation on Page 2
    const annotationP2: Annotation = {
      id: 'annot-text-1',
      pageIndex: 1,
      type: 'text',
      x: 60,
      y: 150,
      width: 150,
      height: 30,
      content: 'Approved by Legal Dept',
      fontSize: 12,
      fontFamily: 'Helvetica',
      color: '#23483B',
      opacity: 1,
      zIndex: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    // Store in IndexedDB (autosave / persist flow)
    await storeExistingTextEdits(sessionId, { 0: [textEditP1] })
    await storeAnnotations(sessionId, { 1: [annotationP2] })
    await storeSession(sessionId, docMeta, [0, 1], { 0: 0, 1: 0 })

    // Verify IndexedDB restore
    const restoredEdits = await getExistingTextEdits(sessionId)
    expect(restoredEdits).not.toBeNull()
    expect(restoredEdits![0]).toHaveLength(1)
    expect(restoredEdits![0][0].replacementText).toBe('Page 1 Contract Total: $25,000')

    const restoredAnnots = await getAnnotations(sessionId)
    expect(restoredAnnots).not.toBeNull()
    expect(restoredAnnots![1]).toHaveLength(1)
    expect(restoredAnnots![1][0].content).toBe('Approved by Legal Dept')

    const restoredSession = await getSession(sessionId)
    expect(restoredSession).not.toBeNull()
    expect(restoredSession!.document.filename).toBe('multi-page-contract.pdf')
    expect(restoredSession!.pageOrder).toEqual([0, 1])

    // 4. Build .pdfeditor Project File (for local download/backup)
    const projectFile = await buildProjectFile({
      sessionId,
      document: docMeta,
      pages,
      annotationsByPage: { 1: [annotationP2] },
      existingTextEditsByPage: { 0: [textEditP1] },
      zoom: 1.25,
      currentPage: 0,
      theme: 'dark',
    })

    expect(projectFile.existingTextEdits).toBeDefined()
    expect(projectFile.existingTextEdits).toHaveLength(1)
    expect(projectFile.existingTextEdits![0].replacementText).toBe('Page 1 Contract Total: $25,000')
    expect(projectFile.annotations).toHaveLength(1)
    expect(projectFile.annotations[0].content).toBe('Approved by Legal Dept')
    expect(projectFile.pdfBase64).toBeDefined()

    // 5. Simulate reopening project from file
    const fileBlob = new Blob([JSON.stringify(projectFile)], { type: 'application/json' })
    const fileObj = new File([fileBlob], 'multi-page-contract.pdfeditor')
    const loadedProject = await loadProjectFile(fileObj)

    expect(loadedProject.document.filename).toBe('multi-page-contract.pdf')
    expect(loadedProject.existingTextEdits).toHaveLength(1)
    expect(loadedProject.existingTextEdits![0].originalText).toBe('Page 1 Contract Total: $10,000')
    expect(loadedProject.existingTextEdits![0].replacementText).toBe('Page 1 Contract Total: $25,000')

    const decodedPdfBuffer = decodePDFFromProject(loadedProject)
    expect(decodedPdfBuffer).not.toBeNull()
    expect(decodedPdfBuffer!.byteLength).toBe(pdfBytes.byteLength)

    // 6. Make a second edit, re-save, and verify update
    const textEditP2: ExistingTextEdit = {
      id: 'existing-edit-2',
      pageIndex: 1,
      originalText: 'Page 2 Termination Terms: 30 Days Notice',
      replacementText: 'Page 2 Termination Terms: 90 Days Notice',
      pdfX: 50,
      pdfY: 300,
      viewX: 50,
      viewY: 100,
      width: 250,
      height: 18,
      fontSize: 14,
      fontFamily: 'Helvetica',
      fontName: 'Helvetica',
      isBold: false,
      isItalic: false,
      color: '#000000',
      rotation: 0,
      transform: [14, 0, 0, 14, 50, 300],
    }

    await storeExistingTextEdits(sessionId, { 0: [textEditP1], 1: [textEditP2] })
    const secondRestoredEdits = await getExistingTextEdits(sessionId)
    expect(secondRestoredEdits![0]).toHaveLength(1)
    expect(secondRestoredEdits![1]).toHaveLength(1)
    expect(secondRestoredEdits![1][0].replacementText).toBe('Page 2 Termination Terms: 90 Days Notice')
  })

  it('Test B & C: Export Integrity, Independent PDF.js Parser Verification, and Content Stream Redaction', async () => {
    // 1. Create multi-page PDF
    const rawDoc = await PDFDocument.create()
    const font = await rawDoc.embedFont(StandardFonts.Helvetica)
    
    const p1 = rawDoc.addPage([600, 400])
    p1.drawText('Confidential Salary: $120,000 / year', { x: 50, y: 320, size: 14, font })
    p1.drawText('Unrelated Header: Employee Details', { x: 50, y: 360, size: 16, font })

    const p2 = rawDoc.addPage([600, 400])
    p2.drawText('Department: Engineering', { x: 50, y: 320, size: 14, font })

    const pdfBytes = await rawDoc.save()
    const exportSessionId = 'test-session-export-1'
    await storePDF(exportSessionId, pdfBytes.buffer, 'audit-report.pdf')

    const pages = [
      { pageIndex: 0, order: 0, rotation: 0 as const, deleted: false },
      { pageIndex: 1, order: 1, rotation: 0 as const, deleted: false },
    ]

    const edits: Record<number, ExistingTextEdit[]> = {
      0: [
        {
          id: 'salary-edit',
          pageIndex: 0,
          originalText: 'Confidential Salary: $120,000 / year',
          replacementText: 'Public Band: Grade L5 Engineer',
          pdfX: 50,
          pdfY: 320,
          viewX: 50,
          viewY: 80,
          width: 240,
          height: 18,
          fontSize: 14,
          fontFamily: 'Helvetica',
          fontName: 'Helvetica',
          isBold: false,
          isItalic: false,
          color: '#1a1a1a',
          rotation: 0,
          transform: [14, 0, 0, 14, 50, 320],
        },
      ],
    }

    const annots: Record<number, Annotation[]> = {
      1: [
        {
          id: 'annot-stamp-1',
          pageIndex: 1,
          type: 'text',
          x: 50,
          y: 100,
          width: 140,
          height: 30,
          content: 'Verified Human Resources',
          fontSize: 12,
          fontFamily: 'Helvetica',
          color: '#23483B',
          opacity: 1,
          zIndex: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
    }

    // 2. Export document
    let reportedProgress = 0
    const exportResult = await exportPDF({
      sessionId: exportSessionId,
      filename: 'audit-report-edited.pdf',
      pages,
      annotationsByPage: annots,
      existingTextEditsByPage: edits,
      onProgress: (p) => {
        reportedProgress = p
      },
    })

    expect(reportedProgress).toBe(100)
    expect(exportResult.editsResult).toBeDefined()
    expect(exportResult.editsResult!.totalEditsApplied).toBe(1)
    expect(exportResult.editsResult!.redactedCount).toBe(1)
    expect(exportResult.editsResult!.unredactedCount).toBe(0)

    // 3. Verify with independent PDF.js parser
    const extractedText = await extractAllTextWithPdfJs(exportResult.pdfBytes)

    // Verify replacement text is present
    expect(extractedText).toContain('Public Band: Grade L5 Engineer')

    // Verify unrelated text on page 1 and page 2 remain intact
    expect(extractedText).toContain('Unrelated Header: Employee Details')
    expect(extractedText).toContain('Department: Engineering')

    // Verify original sensitive text is NOT in the extracted text
    expect(extractedText).not.toContain('Confidential Salary: $120,000 / year')

    // 4. Content stream verification: Confirm raw stream does not contain original literal
    const rawContentStr = new TextDecoder('latin1').decode(exportResult.pdfBytes)
    expect(rawContentStr).not.toContain('Confidential Salary: $120,000 / year')
  })

  it('Test C.6: Unredacted fallback detection properly populates unredactedDetails and unredactedCount', async () => {
    // When a text edit cannot be found in the content stream (e.g. synthetic or non-matching string)
    const doc = await PDFDocument.create()
    const font = await doc.embedFont(StandardFonts.Helvetica)
    const page = doc.addPage([500, 300])
    page.drawText('Sample text here', { x: 50, y: 150, size: 12, font })
    const pdfBytes = await doc.save()

    const unredactSessionId = 'test-session-unredacted-fallback'
    await storePDF(unredactSessionId, pdfBytes.buffer, 'sample.pdf')

    const unredactableEdit: ExistingTextEdit = {
      id: 'missing-edit-1',
      pageIndex: 0,
      originalText: 'NonExistentStringThatCannotBeMatchedInStream',
      replacementText: 'Replacement Fallback',
      pdfX: 50,
      pdfY: 150,
      viewX: 50,
      viewY: 150,
      width: 120,
      height: 16,
      fontSize: 12,
      fontFamily: 'Helvetica',
      fontName: 'Helvetica',
      isBold: false,
      isItalic: false,
      color: '#000000',
      rotation: 0,
      transform: [12, 0, 0, 12, 50, 150],
    }

    const exportResult = await exportPDF({
      sessionId: unredactSessionId,
      filename: 'fallback.pdf',
      pages: [{ pageIndex: 0, order: 0, rotation: 0, deleted: false }],
      annotationsByPage: {},
      existingTextEditsByPage: { 0: [unredactableEdit] },
    })

    // Confirm that it was flagged as unredacted
    expect(exportResult.editsResult).toBeDefined()
    expect(exportResult.editsResult!.unredactedCount).toBe(1)
    expect(exportResult.editsResult!.unredactedDetails.length).toBeGreaterThan(0)
    expect(exportResult.editsResult!.unredactedDetails[0]).toContain('NonExistentStringThatCannotBeM')
    expect(exportResult.editsResult!.unredactedDetails[0]).toContain('(custom encoding or complex TJ structure)')
  })
})
