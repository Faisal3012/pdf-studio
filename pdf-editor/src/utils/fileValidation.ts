// ─── File Validation ──────────────────────────────────────────────────────────
// Import the central PDF.js setup — configures the worker before use.
import { pdfjsLib } from '@/services/pdf/pdfWorker'

export const MAX_FILE_SIZE_BYTES = parseInt(
  import.meta.env.VITE_MAX_FILE_SIZE ?? '52428800', // default 50 MB
  10
)

export type FileValidationError =
  | 'invalid-extension'
  | 'invalid-mime'
  | 'file-too-large'
  | 'invalid-pdf-header'
  | 'password-protected'
  | 'corrupted'
  | 'unknown'

export interface FileValidationResult {
  valid: boolean
  error?: FileValidationError
  message?: string
}

/** Synchronous checks: extension, MIME type, file size */
export function validateFileSync(file: File): FileValidationResult {
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return {
      valid: false,
      error: 'invalid-extension',
      message: 'This file is not a PDF. Please upload a file with a .pdf extension.',
    }
  }

  if (file.type && file.type !== 'application/pdf') {
    return {
      valid: false,
      error: 'invalid-mime',
      message: 'This file does not appear to be a valid PDF.',
    }
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const maxMB = Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)
    return {
      valid: false,
      error: 'file-too-large',
      message: `This PDF is too large (max ${maxMB} MB). Try a smaller file.`,
    }
  }

  return { valid: true }
}

/** Read first 5 bytes to verify %PDF- magic bytes */
export async function validatePDFHeader(file: File): Promise<FileValidationResult> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const arr = new Uint8Array(e.target?.result as ArrayBuffer)
      const isPDF =
        arr[0] === 0x25 && arr[1] === 0x50 &&
        arr[2] === 0x44 && arr[3] === 0x46 && arr[4] === 0x2D
      resolve(
        isPDF
          ? { valid: true }
          : { valid: false, error: 'invalid-pdf-header', message: 'Unable to open this file. It may be corrupted or is not a valid PDF.' }
      )
    }
    reader.onerror = () =>
      resolve({ valid: false, error: 'corrupted', message: 'Unable to read this file. It may be corrupted.' })
    reader.readAsArrayBuffer(file.slice(0, 5))
  })
}

export type PDFLoadStatus =
  | { status: 'ok'; arrayBuffer: ArrayBuffer }
  | { status: 'password-required' }
  | { status: 'wrong-password' }
  | { status: 'corrupted'; message: string }

/**
 * Attempt to open the PDF with PDF.js to detect password protection or corruption.
 * Does NOT bypass passwords — only opens with the correct user-supplied password.
 */
export async function validateWithPDFjs(
  arrayBuffer: ArrayBuffer,
  password?: string
): Promise<PDFLoadStatus> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      ...(password ? { password } : {}),
    })

    await loadingTask.promise
    return { status: 'ok', arrayBuffer }
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err) {
      const name = (err as { name: string }).name
      if (name === 'PasswordException') {
        const code = (err as { code?: number }).code
        // code 1 = password required, code 2 = wrong password
        if (code === 2) return { status: 'wrong-password' }
        return { status: 'password-required' }
      }
    }
    const message = err instanceof Error ? err.message : String(err)
    console.error('[PDF validation] PDF.js error:', err)
    return { status: 'corrupted', message: `Unable to open this PDF: ${message}` }
  }
}

/**
 * Full validation pipeline:
 * 1. Sync checks (extension, MIME, size)
 * 2. Magic byte header check
 * 3. PDF.js open attempt (detects password/corruption)
 */
export async function validatePDFFull(
  file: File,
  password?: string
): Promise<
  | { valid: false; error: FileValidationError; message: string }
  | { valid: true; arrayBuffer: ArrayBuffer }
> {
  // Step 1 — sync checks
  const syncResult = validateFileSync(file)
  if (!syncResult.valid) {
    return { valid: false, error: syncResult.error!, message: syncResult.message! }
  }

  // Step 2 — read file into ArrayBuffer
  const arrayBuffer = await file.arrayBuffer()

  // Step 3 — magic bytes
  const headerBytes = new Uint8Array(arrayBuffer.slice(0, 5))
  const isPDF =
    headerBytes[0] === 0x25 && headerBytes[1] === 0x50 &&
    headerBytes[2] === 0x44 && headerBytes[3] === 0x46 && headerBytes[4] === 0x2D
  if (!isPDF) {
    return {
      valid: false,
      error: 'invalid-pdf-header',
      message: 'Unable to open this file. It may be corrupted or is not a valid PDF.',
    }
  }

  // Step 4 — PDF.js validation (pass a slice so PDF.js worker transfer doesn't detach arrayBuffer)
  const pdfResult = await validateWithPDFjs(arrayBuffer.slice(0), password)

  if (pdfResult.status === 'ok') {
    return { valid: true, arrayBuffer }
  }
  if (pdfResult.status === 'password-required') {
    return {
      valid: false,
      error: 'password-protected',
      message: 'This PDF is password protected. Please enter the password to open it.',
    }
  }
  if (pdfResult.status === 'wrong-password') {
    return {
      valid: false,
      error: 'password-protected',
      message: 'Incorrect password. Please try again.',
    }
  }
  return { valid: false, error: 'corrupted', message: pdfResult.message }
}
