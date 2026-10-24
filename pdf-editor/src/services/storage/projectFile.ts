import type { ProjectFile } from '@/types/project.types'
import { PDFEDITOR_FORMAT, PDFEDITOR_VERSION } from '@/types/project.types'
import type { Annotation } from '@/types/annotation.types'
import type { PDFDocumentMeta } from '@/types/pdf.types'
import type { PageRotation, Theme } from '@/types/editor.types'
import { migrateProject } from '@/utils/projectMigration'
import { getPDF } from './indexedDB'

// ─── Project File — Save and Load ─────────────────────────────────────────────
// .pdfeditor files are downloaded to the user's disk for local backup/portability.
// They contain the versioned JSON structure plus a base64-encoded PDF.
// No data is sent to any server.

import type { ExistingTextEdit } from '@/types/existingText.types'

export interface SaveProjectOptions {
  sessionId: string
  document: PDFDocumentMeta
  pages: Array<{ pageIndex: number; order: number; rotation: PageRotation; deleted: boolean }>
  annotationsByPage: Record<number, Annotation[]>
  existingTextEditsByPage?: Record<number, ExistingTextEdit[]>
  zoom: number
  currentPage: number
  theme: Theme
}

/**
 * Build the ProjectFile object from current editor state.
 * Fetches the PDF binary from IndexedDB and encodes it as base64.
 */
export async function buildProjectFile(options: SaveProjectOptions): Promise<ProjectFile> {
  const {
    sessionId, document, pages, annotationsByPage, existingTextEditsByPage, zoom, currentPage, theme,
  } = options

  // Flatten annotations array
  const annotations: Annotation[] = Object.values(annotationsByPage).flat()

  // Flatten existingTextEdits array
  const existingTextEdits: ExistingTextEdit[] = existingTextEditsByPage
    ? Object.values(existingTextEditsByPage).flat()
    : []

  // Fetch PDF binary and encode as base64
  let pdfBase64: string | undefined
  const pdfBuffer = await getPDF(sessionId)
  if (pdfBuffer) {
    const bytes = new Uint8Array(pdfBuffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    pdfBase64 = btoa(binary)
  }

  const now = new Date().toISOString()

  const projectFile: ProjectFile = {
    format: PDFEDITOR_FORMAT,
    version: PDFEDITOR_VERSION,
    createdAt: now,
    updatedAt: now,
    document: {
      filename: document.filename,
      pageCount: document.pageCount,
      pageDimensions: document.pageDimensions,
    },
    pages,
    annotations,
    existingTextEdits: existingTextEdits.length > 0 ? existingTextEdits : undefined,
    settings: { zoom, currentPage, theme },
    pdfBase64,
  }

  return projectFile
}

/**
 * Trigger a browser download of the .pdfeditor file.
 */
export function downloadProjectFile(project: ProjectFile): void {
  const json = JSON.stringify(project, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const baseName = project.document.filename.replace(/\.pdf$/i, '')
  const filename = `${sanitizeFilename(baseName)}.pdfeditor`

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()

  // Clean up the object URL after a short delay
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

/**
 * Parse and validate a .pdfeditor file from an uploaded File object.
 * Returns the validated ProjectFile (migrated to current version if needed).
 * Throws if the file is invalid.
 */
export async function loadProjectFile(file: File): Promise<ProjectFile> {
  if (!file.name.endsWith('.pdfeditor')) {
    throw new Error('Invalid file type. Please select a .pdfeditor file.')
  }

  const text = await file.text()
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('Could not read the project file. The file may be corrupted.')
  }

  // Validate and migrate to current version
  const project = migrateProject(raw)
  return project
}

/**
 * Decode the base64 PDF from a project file back to an ArrayBuffer.
 * Returns null if no PDF data is embedded.
 */
export function decodePDFFromProject(project: ProjectFile): ArrayBuffer | null {
  if (!project.pdfBase64) return null

  try {
    const binary = atob(project.pdfBase64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  } catch {
    throw new Error('Could not decode the PDF from the project file. The file may be corrupted.')
  }
}

/** Sanitize a string for use as a filename */
function sanitizeFilename(name: string): string {
  const cleaned = Array.from(name)
    .filter((ch) => ch.charCodeAt(0) >= 32)
    .join('')
  return cleaned
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 100)
    || 'project'
}
