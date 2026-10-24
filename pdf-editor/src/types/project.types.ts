// ─── .pdfeditor Project File Format ──────────────────────────────────────────
// Versioned format — version field enables forward-compatible migration.

import type { PDFPageDimension } from './pdf.types'
import type { Annotation } from './annotation.types'
import type { Theme, PageRotation } from './editor.types'

export const PDFEDITOR_FORMAT = 'pdfeditor' as const
export const PDFEDITOR_VERSION = 1 as const

export interface ProjectPageRecord {
  pageIndex: number
  order: number
  rotation: PageRotation
  deleted: boolean
}

export interface ProjectDocument {
  filename: string
  pageCount: number
  pageDimensions: PDFPageDimension[]
}

export interface ProjectSettings {
  zoom: number
  currentPage: number
  theme: Theme
}

import type { ExistingTextEdit } from './existingText.types'

/** The versioned .pdfeditor file structure */
export interface ProjectFile {
  format: typeof PDFEDITOR_FORMAT
  version: typeof PDFEDITOR_VERSION
  createdAt: string
  updatedAt: string
  document: ProjectDocument
  pages: ProjectPageRecord[]
  annotations: Annotation[]
  existingTextEdits?: ExistingTextEdit[]
  settings: ProjectSettings
  /** Base64-encoded PDF binary — only present in saved project files */
  pdfBase64?: string
}
