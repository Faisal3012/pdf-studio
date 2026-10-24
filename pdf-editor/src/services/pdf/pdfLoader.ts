import { getPDF } from '@/services/storage/indexedDB'
import { pdfjsLib } from '@/services/pdf/pdfWorker'
import type { PDFDocumentProxy } from 'pdfjs-dist'

// ─── PDF Document & Page Render Cache ─────────────────────────────────────────

interface PDFCacheEntry {
  pdfDoc: PDFDocumentProxy
  renderedPages: Map<string, HTMLCanvasElement> // cache key: `${pageIndex}_${scale}_${rotation}`
}

const activeCaches = new Map<string, PDFCacheEntry>()

/**
 * Get or load PDFDocumentProxy for a given session.
 */
export async function getOrLoadPDFDocument(
  sessionId: string,
  rawBuffer?: ArrayBuffer
): Promise<PDFDocumentProxy> {
  const cached = activeCaches.get(sessionId)
  if (cached) {
    return cached.pdfDoc
  }

  let buffer = rawBuffer
  if (!buffer) {
    const fetched = await getPDF(sessionId)
    if (!fetched) {
      throw new Error(`PDF data not found in IndexedDB for session: ${sessionId}`)
    }
    buffer = fetched
  }

  // Slice buffer so worker doesn't detach original
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer.slice(0)),
  })
  const pdfDoc = await loadingTask.promise

  activeCaches.set(sessionId, {
    pdfDoc,
    renderedPages: new Map(),
  })

  return pdfDoc
}

/**
 * Render a single PDF page to an offscreen HTMLCanvasElement.
 * Uses high-DPI scaling (window.devicePixelRatio) for crisp rendering.
 */
export async function renderPDFPageToCanvas(
  sessionId: string,
  pageIndex: number, // 0-indexed
  zoomScale: number,  // e.g. 1.0 = 100%
  rotation: 0 | 90 | 180 | 270 = 0
): Promise<HTMLCanvasElement> {
  const pdfDoc = await getOrLoadPDFDocument(sessionId)
  const entry = activeCaches.get(sessionId)!

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const cacheKey = `${pageIndex}_${zoomScale.toFixed(2)}_${rotation}_${dpr}`

  if (entry.renderedPages.has(cacheKey)) {
    return entry.renderedPages.get(cacheKey)!
  }

  // PDF.js is 1-indexed for getPage
  const page = await pdfDoc.getPage(pageIndex + 1)
  const viewport = page.getViewport({ scale: zoomScale * dpr, rotation })

  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)

  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) {
    throw new Error('Failed to get 2D context for PDF rendering')
  }

  // Draw white background before rendering
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const renderContext = {
    canvasContext: ctx,
    canvas,
    viewport,
  }

  await page.render(renderContext).promise

  // Limit cache size per session to prevent memory leaks (keep max 10 rendered views)
  if (entry.renderedPages.size > 10) {
    const firstKey = entry.renderedPages.keys().next().value
    if (firstKey) entry.renderedPages.delete(firstKey)
  }

  entry.renderedPages.set(cacheKey, canvas)
  return canvas
}

/**
 * Clear cached PDF instance & renders when session changes or is destroyed.
 */
export function clearPDFCache(sessionId?: string): void {
  if (sessionId) {
    const entry = activeCaches.get(sessionId)
    if (entry) {
      const doc = entry.pdfDoc as { destroy?: () => Promise<void>; cleanup?: () => Promise<void> }
      doc.destroy?.()
      activeCaches.delete(sessionId)
    }
  } else {
    for (const [, entry] of activeCaches) {
      const doc = entry.pdfDoc as { destroy?: () => Promise<void>; cleanup?: () => Promise<void> }
      doc.destroy?.()
    }
    activeCaches.clear()
  }
}
