import { getOrLoadPDFDocument } from '@/services/pdf/pdfLoader'
import type { PDFExtractedTextItem, ScannedPageDetectionResult } from '@/types/existingText.types'

/**
 * Normalizes font name extracted from PDF font dictionary or item
 */
export function normalizeFontFamily(rawFontName: string): {
  family: string
  isBold: boolean
  isItalic: boolean
} {
  const cleanName = (rawFontName || '').replace(/^[A-Z]{6}\+/, '') // strip subset tag e.g. ABCDEF+Arial
  const lower = cleanName.toLowerCase()

  const isBold = lower.includes('bold') || lower.includes('black') || lower.includes('heavy')
  const isItalic = lower.includes('italic') || lower.includes('oblique')

  let family = 'Helvetica'
  if (lower.includes('times') || lower.includes('cambria') || lower.includes('georgia') || lower.includes('serif')) {
    family = 'Times-Roman'
  } else if (lower.includes('courier') || lower.includes('mono') || lower.includes('consolas')) {
    family = 'Courier'
  } else if (lower.includes('arial') || lower.includes('helvetica') || lower.includes('sans')) {
    family = 'Helvetica'
  }

  return { family, isBold, isItalic }
}

/**
 * Extract selectable/editable text items from a specific page using PDF.js
 */
export async function extractPageTextItems(
  sessionId: string,
  pageIndex: number,
  pageHeight: number
): Promise<PDFExtractedTextItem[]> {
  const pdfDoc = await getOrLoadPDFDocument(sessionId)
  const page = await pdfDoc.getPage(pageIndex + 1)
  const textContent = await page.getTextContent({ includeMarkedContent: true })

  const items: PDFExtractedTextItem[] = []

  textContent.items.forEach((rawItem: unknown, idx: number) => {
    // PDF.js TextItem has `str`, `transform`, `width`, `height`, `fontName`
    const item = rawItem as { str?: string; transform?: number[]; width?: number; height?: number; fontName?: string }
    if (!item.str || item.str.trim() === '') {
      return
    }

    const str = item.str
    const transform = (item.transform || [1, 0, 0, 1, 0, 0]) as number[] // [a, b, c, d, e, f]
    // transform[4] is x in PDF coordinates, transform[5] is baseline y in PDF coordinates
    const pdfX = transform[4]
    const pdfY = transform[5]

    // Determine font size from matrix scale: sqrt(c^2 + d^2) or height
    const scaleY = Math.sqrt(transform[2] * transform[2] + transform[3] * transform[3])
    const fontSize = Math.round(item.height || scaleY || 12)

    // Compute rotation angle from transform matrix
    const rad = Math.atan2(transform[1], transform[0])
    let rotation = Math.round((rad * 180) / Math.PI)
    if (rotation < 0) rotation += 360
    if (rotation >= 350 || rotation <= 10) rotation = 0
    else if (rotation >= 80 && rotation <= 100) rotation = 90
    else if (rotation >= 170 && rotation <= 190) rotation = 180
    else if (rotation >= 260 && rotation <= 280) rotation = 270

    const rawFontName = item.fontName || ''
    const { family, isBold, isItalic } = normalizeFontFamily(rawFontName)

    const width = item.width || (str.length * fontSize * 0.5)
    const height = Math.round(fontSize * 1.05)

    // Convert PDF coordinates (origin bottom-left) to view coordinates (origin top-left)
    // pdfY is the baseline in PDF space. Ascent is approx 0.82 * fontSize.
    const viewX = pdfX
    const viewY = Math.max(0, pageHeight - pdfY - Math.round(fontSize * 0.82))

    items.push({
      id: `text-item-p${pageIndex}-${idx}`,
      pageIndex,
      text: str,
      pdfX,
      pdfY,
      width,
      height,
      viewX,
      viewY,
      fontSize,
      fontFamily: family,
      fontName: rawFontName,
      isBold,
      isItalic,
      color: '#000000',
      backgroundColor: '#ffffff',
      rotation,
      transform,
      hasOps: true,
    })
  })

  return items
}

/**
 * Samples the background color from a rendered canvas at/around a text bounding box.
 */
export function sampleBackgroundColorFromCanvas(
  canvas: HTMLCanvasElement | null,
  viewX: number,
  viewY: number,
  zoomScale: number = 1
): string {
  if (!canvas) return '#ffffff'
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx || !ctx.getImageData) return '#ffffff'

    const dpr = canvas.width / (canvas.style.width ? parseFloat(canvas.style.width) : canvas.width) || 1
    const scale = zoomScale * dpr

    // Sample pixel slightly inset inside the bounding box
    const sampleX = Math.max(0, Math.min(canvas.width - 1, Math.round((viewX + 1) * scale)))
    const sampleY = Math.max(0, Math.min(canvas.height - 1, Math.round((viewY + 1) * scale)))

    const pixel = ctx.getImageData(sampleX, sampleY, 1, 1).data
    // If transparent, fallback to white
    if (pixel[3] < 10) return '#ffffff'

    return '#' + [pixel[0], pixel[1], pixel[2]].map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return '#ffffff'
  }
}

/**
 * Detect if a page is a scanned image without selectable text
 */
export async function detectScannedPage(
  sessionId: string,
  pageIndex: number
): Promise<ScannedPageDetectionResult> {
  const pdfDoc = await getOrLoadPDFDocument(sessionId)
  const page = await pdfDoc.getPage(pageIndex + 1)
  const textContent = await page.getTextContent()

  const textCount = textContent.items.filter((raw: unknown) => {
    const it = raw as { str?: string }
    return Boolean(it.str && it.str.trim().length > 0)
  }).length

  // Check operator list for images (PaintImageXObject = 85 or similar)
  let hasImages = false
  try {
    const ops = await page.getOperatorList()
    // Ops 85 is paintImageXObject, 86 is paintInlineImageXObject
    hasImages = ops.fnArray.some((fn) => fn === 85 || fn === 86 || fn === 82)
  } catch {
    // Ignore operator list failure
  }

  const isScanned = textCount === 0 && hasImages

  return {
    isScanned,
    textItemCount: textCount,
    hasImages,
    confidence: isScanned ? 0.95 : textCount < 3 && hasImages ? 0.7 : 0.05,
    reason: isScanned
      ? 'This page appears to be a scanned image with no selectable text. OCR is required to edit text in scanned documents.'
      : undefined,
  }
}
