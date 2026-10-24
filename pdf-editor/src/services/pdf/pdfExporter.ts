import { PDFDocument, degrees } from 'pdf-lib'
import { getPDF } from '@/services/storage/indexedDB'
import { applyExistingTextEditsToPdfDoc } from '@/services/pdf/pdfStreamModifier'
import type { Annotation, TextAnnotation, DrawAnnotation, HighlightAnnotation, ShapeAnnotation } from '@/types/annotation.types'
import type { PageState } from '@/types/editor.types'
import type { ExistingTextEdit } from '@/types/existingText.types'

import type { ApplyTextEditsResult } from '@/services/pdf/pdfStreamModifier'

export interface ExportPDFOptions {
  sessionId: string
  filename: string
  pages: PageState[]
  annotationsByPage: Record<number, Annotation[]>
  existingTextEditsByPage?: Record<number, ExistingTextEdit[]>
  onProgress?: (progressPercent: number) => void
}

export interface ExportPDFResult {
  pdfBytes: Uint8Array
  editsResult?: ApplyTextEditsResult
}

/**
 * Render annotations of a page onto an offscreen canvas and return as PNG bytes.
 */
function renderAnnotationsToCanvas(
  annotations: Annotation[],
  width: number,
  height: number
): HTMLCanvasElement | null {
  if (!annotations || annotations.length === 0) return null

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width)
  canvas.height = Math.round(height)

  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.clearRect(0, 0, width, height)

  for (const anno of annotations) {
    ctx.save()
    ctx.globalAlpha = anno.opacity ?? 1

    if (anno.type === 'text') {
      const textAnno = anno as TextAnnotation
      ctx.font = `${textAnno.fontStyle || 'normal'} ${textAnno.fontSize || 16}px ${textAnno.fontFamily || 'Arial'}`
      ctx.fillStyle = textAnno.fill || '#1e293b'
      ctx.textAlign = (textAnno.align as CanvasTextAlign) || 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(textAnno.text, textAnno.x, textAnno.y)
    } else if (anno.type === 'draw') {
      const drawAnno = anno as DrawAnnotation
      if (drawAnno.points && drawAnno.points.length >= 4) {
        ctx.beginPath()
        ctx.strokeStyle = drawAnno.stroke || '#1e293b'
        ctx.lineWidth = drawAnno.strokeWidth || 3
        ctx.lineCap = (drawAnno.lineCap as CanvasLineCap) || 'round'
        ctx.lineJoin = 'round'
        ctx.moveTo(drawAnno.points[0], drawAnno.points[1])
        for (let i = 2; i < drawAnno.points.length; i += 2) {
          ctx.lineTo(drawAnno.points[i], drawAnno.points[i + 1])
        }
        ctx.stroke()
      }
    } else if (anno.type === 'highlight') {
      const hlAnno = anno as HighlightAnnotation
      ctx.fillStyle = hlAnno.fill || '#FFD700'
      ctx.fillRect(hlAnno.x, hlAnno.y, hlAnno.width, hlAnno.height)
    } else if (anno.type === 'rect') {
      const shape = anno as ShapeAnnotation
      ctx.lineWidth = shape.strokeWidth || 2
      ctx.strokeStyle = shape.stroke || '#2563eb'
      if (shape.fill && shape.fill !== 'transparent') {
        ctx.fillStyle = shape.fill
        ctx.fillRect(shape.x, shape.y, shape.width, shape.height)
      }
      ctx.strokeRect(shape.x, shape.y, shape.width, shape.height)
    } else if (anno.type === 'circle') {
      const shape = anno as ShapeAnnotation
      const radius = shape.width / 2
      ctx.lineWidth = shape.strokeWidth || 2
      ctx.strokeStyle = shape.stroke || '#2563eb'
      ctx.beginPath()
      ctx.arc(shape.x + radius, shape.y + radius, radius, 0, Math.PI * 2)
      if (shape.fill && shape.fill !== 'transparent') {
        ctx.fillStyle = shape.fill
        ctx.fill()
      }
      ctx.stroke()
    } else if (anno.type === 'line' || anno.type === 'arrow') {
      const shape = anno as ShapeAnnotation
      ctx.lineWidth = shape.strokeWidth || 2
      ctx.strokeStyle = shape.stroke || '#2563eb'
      ctx.beginPath()
      ctx.moveTo(shape.x, shape.y)
      ctx.lineTo(shape.x + shape.width, shape.y + shape.height)
      ctx.stroke()
    } else if (anno.type === 'image' || anno.type === 'signature') {
      const imgAnno = anno as import('@/types/annotation.types').ImageAnnotation
      if (imgAnno.imageDbKey) {
        const img = new Image()
        img.src = imgAnno.imageDbKey
        if (img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, imgAnno.x, imgAnno.y, imgAnno.width, imgAnno.height)
        }
      }
    }

    ctx.restore()
  }

  return canvas
}

/**
 * Export the PDF document with all page rotations, reordering, and flattened annotations.
 */
export async function exportPDF({
  sessionId,
  pages,
  annotationsByPage,
  existingTextEditsByPage = {},
  onProgress,
}: ExportPDFOptions): Promise<ExportPDFResult> {
  const rawBuffer = await getPDF(sessionId)
  if (!rawBuffer) {
    throw new Error('Original PDF file data could not be retrieved from storage.')
  }

  onProgress?.(10)

  // Load into pdf-lib
  const srcBytes = new Uint8Array(rawBuffer)
  const srcDoc = await PDFDocument.load(srcBytes, { ignoreEncryption: true })

  let editsResult: ApplyTextEditsResult | undefined
  // Apply true existing text edits to srcDoc content streams & vector layers
  if (Object.keys(existingTextEditsByPage).length > 0) {
    editsResult = await applyExistingTextEditsToPdfDoc(srcDoc, existingTextEditsByPage)
  }

  const outDoc = await PDFDocument.create()

  const activePages = pages.filter((p) => !p.deleted)
  const total = activePages.length

  for (let idx = 0; idx < total; idx++) {
    const pageState = activePages[idx]
    const [copiedPage] = await outDoc.copyPages(srcDoc, [pageState.pageIndex])

    // Apply rotation
    if (pageState.rotation) {
      const currentRot = copiedPage.getRotation().angle
      copiedPage.setRotation(degrees((currentRot + pageState.rotation) % 360))
    }

    // Embed flattened annotations if any exist on this page
    const pageAnnos = annotationsByPage[pageState.pageIndex] || []
    if (pageAnnos.length > 0) {
      const { width, height } = copiedPage.getSize()
      const annoCanvas = renderAnnotationsToCanvas(pageAnnos, width, height)

      if (annoCanvas) {
        const dataUrl = annoCanvas.toDataURL('image/png')
        // Directly decode base64 without fetch() to avoid CSP connect-src and fetch restrictions
        const base64Data = dataUrl.split(',')[1]
        const binaryString = atob(base64Data)
        const pngImageBytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          pngImageBytes[i] = binaryString.charCodeAt(i)
        }
        const embeddedPng = await outDoc.embedPng(pngImageBytes)

        copiedPage.drawImage(embeddedPng, {
          x: 0,
          y: 0,
          width,
          height,
        })
      }
    }

    outDoc.addPage(copiedPage)
    onProgress?.(10 + Math.round(((idx + 1) / total) * 80))
  }

  const pdfBytes = await outDoc.save()
  onProgress?.(100)

  return { pdfBytes, editsResult }
}

/**
 * Helper to trigger file download in the browser.
 */
export function downloadBytes(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
