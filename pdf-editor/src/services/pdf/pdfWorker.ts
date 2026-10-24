/**
 * PDF.js worker initialisation — must be imported once before any getDocument() call.
 *
 * Vite resolves `new URL('...', import.meta.url)` relative to THIS file,
 * so the worker asset path is computed correctly during both dev and build.
 *
 * We use pdfjs-dist/build/pdf.worker.min.mjs (the ESM worker bundle).
 */
import * as pdfjsLib from 'pdfjs-dist'

import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Only configure the worker once — guard against double-import
let configured = false

export function configurePDFWorker(): void {
  if (configured) return
  configured = true

  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker
}

// Auto-configure on first import
configurePDFWorker()

export { pdfjsLib }
