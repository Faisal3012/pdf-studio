// ─── PDF Document Types ───────────────────────────────────────────────────────

export interface PDFPageDimension {
  pageIndex: number
  width: number
  height: number
}

export interface PDFDocumentMeta {
  filename: string
  pageCount: number
  pageDimensions: PDFPageDimension[]
  /** Size in bytes */
  fileSize: number
}

export interface PDFSession {
  sessionId: string
  document: PDFDocumentMeta
  createdAt: string
  updatedAt: string
}
