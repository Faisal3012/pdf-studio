// ─── Existing Text Types ───────────────────────────────────────────────────────

export interface PDFExtractedTextItem {
  id: string
  pageIndex: number
  text: string
  // PDF User Unit Coordinates (x from left, y from bottom in standard PDF coordinates)
  pdfX: number
  pdfY: number
  width: number
  height: number
  // Top-left origin coordinates (x from left, y from top in points, matching Konva / web viewer)
  viewX: number
  viewY: number
  // Formatting
  fontSize: number
  fontFamily: string
  fontName: string // e.g. "g_d0_f1" or "Helvetica"
  isBold: boolean
  isItalic: boolean
  color: string // hex code, e.g. '#000000'
  rotation: number // degrees (0, 90, 180, 270)
  transform: number[] // 6-element affine transform matrix [a, b, c, d, e, f]
  hasOps: boolean // whether it came from a direct text operation
  backgroundColor?: string // sampled background color behind text (e.g. '#ffffff', '#f5f2ea')
  isOcr?: boolean // whether this item was extracted via OCR
  ocrConfidence?: number
}

export interface ExistingTextEdit {
  id: string
  pageIndex: number
  originalText: string
  replacementText: string
  // Position and formatting
  pdfX: number
  pdfY: number
  viewX: number
  viewY: number
  width: number
  height: number
  fontSize: number
  fontFamily: string
  fontName: string
  isBold: boolean
  isItalic: boolean
  color: string
  backgroundColor?: string // sampled or user-selected background color
  rotation: number
  transform: number[]
  // Font fit adjustment
  adjustedFontSize?: number
  charSpacing?: number
  // Status flags
  isScannedFallback?: boolean
  warning?: string
  fitMode?: 'scale-down' | 'expand' | 'exact'
}

export interface ScannedPageDetectionResult {
  isScanned: boolean
  textItemCount: number
  hasImages: boolean
  confidence: number // 0 to 1
  reason?: string
}
