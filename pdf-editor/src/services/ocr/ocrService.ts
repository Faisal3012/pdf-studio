import { createWorker, type Word } from 'tesseract.js'
import type { PDFExtractedTextItem } from '@/types/existingText.types'
import { sampleBackgroundColorFromCanvas } from '@/services/pdf/pdfTextExtractor'

// ─── OCR Result Cache ────────────────────────────────────────────────────────
// Caches OCR items by sessionId and pageIndex so unchanged pages do not re-run OCR.
const ocrResultsCache = new Map<string, PDFExtractedTextItem[]>()

export function getOcrCacheKey(sessionId: string, pageIndex: number): string {
  return `${sessionId}_page_${pageIndex}`
}

export function getCachedOcrItems(sessionId: string, pageIndex: number): PDFExtractedTextItem[] | null {
  return ocrResultsCache.get(getOcrCacheKey(sessionId, pageIndex)) ?? null
}

export function setCachedOcrItems(sessionId: string, pageIndex: number, items: PDFExtractedTextItem[]): void {
  ocrResultsCache.set(getOcrCacheKey(sessionId, pageIndex), items)
}

export function clearOcrCache(sessionId?: string): void {
  if (sessionId) {
    for (const key of ocrResultsCache.keys()) {
      if (key.startsWith(`${sessionId}_`)) {
        ocrResultsCache.delete(key)
      }
    }
  } else {
    ocrResultsCache.clear()
  }
}

export interface OcrProgressCallback {
  (progressPercent: number, statusText: string): void
}

/**
 * Checks if client-side OCR is supported in the current environment.
 */
export function isOcrSupported(): boolean {
  return typeof window !== 'undefined' && typeof Worker !== 'undefined'
}

/**
 * Recognize words and bounding boxes from a scanned PDF page canvas using Tesseract.js.
 * Runs in a Web Worker, supports progress reporting, cancellation via AbortSignal, and caching.
 */
export async function recognizeScannedPage(
  sessionId: string,
  pageIndex: number,
  canvas: HTMLCanvasElement,
  pageWidth: number,
  pageHeight: number,
  onProgress?: OcrProgressCallback,
  abortSignal?: AbortSignal,
  language: string = 'eng'
): Promise<PDFExtractedTextItem[]> {
  // Check cache first
  const cached = getCachedOcrItems(sessionId, pageIndex)
  if (cached && cached.length > 0) {
    onProgress?.(100, 'Loaded from cache')
    return cached
  }

  if (abortSignal?.aborted) {
    throw new DOMException('OCR operation was cancelled by the user', 'AbortError')
  }

  // Graceful fallback for non-browser or canvas-unsupported test environments
  if (!canvas || typeof canvas.getContext !== 'function') {
    return []
  }

  let worker: Awaited<ReturnType<typeof createWorker>> | null = null

  try {
    onProgress?.(10, 'Initializing OCR engine...')

    worker = await createWorker(language, 1, {
      logger: (m) => {
        if (abortSignal?.aborted) return
        if (m.status === 'recognizing text') {
          const pct = 20 + Math.round((m.progress || 0) * 75)
          onProgress?.(pct, `Recognizing text (${Math.round((m.progress || 0) * 100)}%)...`)
        } else if (m.status === 'loading tesseract core') {
          onProgress?.(15, 'Loading OCR core...')
        }
      },
    })

    if (abortSignal?.aborted) {
      throw new DOMException('OCR operation was cancelled by the user', 'AbortError')
    }

    onProgress?.(30, 'Analyzing scanned page layout...')

    const ret = await worker.recognize(canvas)

    if (abortSignal?.aborted) {
      throw new DOMException('OCR operation was cancelled by the user', 'AbortError')
    }

    onProgress?.(95, 'Structuring recognized text items...')

    const canvasWidth = canvas.width || pageWidth
    const canvasHeight = canvas.height || pageHeight
    const scaleX = pageWidth / canvasWidth
    const scaleY = pageHeight / canvasHeight

    const items: PDFExtractedTextItem[] = []
    const words: Word[] = []
    if (ret.data.blocks) {
      for (const block of ret.data.blocks) {
        for (const para of block.paragraphs) {
          for (const line of para.lines) {
            for (const word of line.words) {
              words.push(word)
            }
          }
        }
      }
    }

    words.forEach((word: Word, idx: number) => {
      const cleanText = (word.text || '').trim()
      if (!cleanText) return

      const bbox = word.bbox
      const viewX = Math.round(bbox.x0 * scaleX)
      const viewY = Math.round(bbox.y0 * scaleY)
      const width = Math.max(14, Math.round((bbox.x1 - bbox.x0) * scaleX))
      const height = Math.max(12, Math.round((bbox.y1 - bbox.y0) * scaleY))

      // Estimate font size from bbox height
      const fontSize = Math.max(8, Math.round(height * 0.82))
      const pdfX = viewX
      // In PDF coordinates: baseline y from bottom
      const pdfY = Math.max(0, pageHeight - viewY - Math.round(fontSize * 0.82))

      // Sample local background color from canvas
      const backgroundColor = sampleBackgroundColorFromCanvas(canvas, viewX, viewY)

      items.push({
        id: `ocr-p${pageIndex}-${idx}`,
        pageIndex,
        text: cleanText,
        pdfX,
        pdfY,
        width,
        height,
        viewX,
        viewY,
        fontSize,
        fontFamily: 'Helvetica',
        fontName: 'Helvetica',
        isBold: false,
        isItalic: false,
        color: '#1a1a1a',
        backgroundColor,
        rotation: 0,
        transform: [fontSize, 0, 0, fontSize, pdfX, pdfY],
        hasOps: false,
        isOcr: true,
        ocrConfidence: word.confidence,
      })
    })

    // Store in cache
    setCachedOcrItems(sessionId, pageIndex, items)
    onProgress?.(100, `OCR complete: ${items.length} words recognized`)

    return items
  } catch (err: unknown) {
    if (abortSignal?.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
      throw new DOMException('OCR operation was cancelled by the user', 'AbortError')
    }
    console.error('[OCR Service] Error during recognition:', err)
    throw err
  } finally {
    if (worker) {
      try {
        await worker.terminate()
      } catch {
        // Ignore termination cleanup errors
      }
    }
  }
}
