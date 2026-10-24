import { useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/UI/Button'
import { Modal } from '@/components/UI/Modal'
import { Spinner } from '@/components/UI/Spinner'
import { validateFileSync, validatePDFFull, MAX_FILE_SIZE_BYTES } from '@/utils/fileValidation'
import { storePDF, storeSession, setActiveSessionId, generateSessionId } from '@/services/storage/indexedDB'
import { useEditorStore } from '@/store/editorStore'
import type { PDFDocumentMeta } from '@/types/pdf.types'
import { pdfjsLib } from '@/services/pdf/pdfWorker'

// ─── PDF Upload Component ──────────────────────────────────────────────────────
// Handles: file picker, drag-and-drop, all validation, password prompt, storage.
// On success: stores PDF in IndexedDB, sets session, updates editorStore, navigates to /editor.

type UploadState =
  | { phase: 'idle' }
  | { phase: 'validating' }
  | { phase: 'password-required'; arrayBuffer: ArrayBuffer; filename: string }
  | { phase: 'storing' }
  | { phase: 'error'; message: string }

interface Props {
  /** Called after successful upload — parent can do extra setup */
  onSuccess?: (sessionId: string) => void
}

export function PDFUpload({ onSuccess }: Props) {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadState, setUploadState] = useState<UploadState>({ phase: 'idle' })
  const [isDragging, setIsDragging] = useState(false)
  const [passwordValue, setPasswordValue] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const setDocument = useEditorStore((s) => s.setDocument)
  const maxMB = Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)

  // ─── Core upload handler ─────────────────────────────────────────────────
  const processFile = useCallback(async (file: File, password?: string) => {
    setUploadState({ phase: 'validating' })

    const result = await validatePDFFull(file, password)

    if (!result.valid) {
      if (result.error === 'password-protected' && result.message.includes('enter the password')) {
        // First attempt — show password modal
        const buf = await file.arrayBuffer()
        setUploadState({ phase: 'password-required', arrayBuffer: buf, filename: file.name })
        return
      }
      if (result.error === 'password-protected' && result.message.includes('Incorrect')) {
        // Wrong password — stay in modal, show error
        setPasswordError('Incorrect password. Please try again.')
        const buf = await file.arrayBuffer()
        setUploadState({ phase: 'password-required', arrayBuffer: buf, filename: file.name })
        return
      }
      setUploadState({ phase: 'error', message: result.message })
      return
    }

    // ── Valid PDF — store in IndexedDB ──────────────────────────────────────
    setUploadState({ phase: 'storing' })

    try {
      const sessionId = generateSessionId()

      // Store the raw PDF binary
      await storePDF(sessionId, result.arrayBuffer, file.name)

      // Extract page metadata using PDF.js (pass a slice so getDocument doesn't detach the buffer)
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(result.arrayBuffer.slice(0)),
        ...(password ? { password } : {}),
      })
      const pdfDoc = await loadingTask.promise
      const pageCount = pdfDoc.numPages

      const pageDimensions = await Promise.all(
        Array.from({ length: pageCount }, async (_, i) => {
          const page = await pdfDoc.getPage(i + 1)
          const viewport = page.getViewport({ scale: 1 })
          return { pageIndex: i, width: viewport.width, height: viewport.height }
        })
      )

      const document: PDFDocumentMeta = {
        filename: file.name,
        pageCount,
        pageDimensions,
        fileSize: file.size,
      }

      const pageOrder = Array.from({ length: pageCount }, (_, i) => i)
      const pageRotations: Record<number, 0 | 90 | 180 | 270> = {}

      // Store session metadata
      await storeSession(sessionId, document, pageOrder, pageRotations)

      // Set localStorage pointer
      setActiveSessionId(sessionId)

      // Update editor store
      setDocument(document, sessionId)

      onSuccess?.(sessionId)

      // Navigate to the editor
      navigate('/editor')
    } catch (err) {
      console.error('[PDFUpload] Storage error:', err)
      const details = err instanceof Error ? `: ${err.message}` : ''
      setUploadState({
        phase: 'error',
        message: `We couldn't open this PDF${details}. Please try again.`,
      })
    }
  }, [navigate, setDocument, onSuccess])

  // ─── File picker / drag handlers ──────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    // Reset input so same file can be re-selected after an error
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return

    // Quick sync check before async pipeline
    const syncCheck = validateFileSync(file)
    if (!syncCheck.valid) {
      setUploadState({ phase: 'error', message: syncCheck.message! })
      return
    }
    processFile(file)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  // ─── Password submit ───────────────────────────────────────────────────────
  const handlePasswordSubmit = async () => {
    if (uploadState.phase !== 'password-required') return
    if (!passwordValue.trim()) {
      setPasswordError('Please enter the password.')
      return
    }
    setPasswordError('')
    const { arrayBuffer, filename } = uploadState

    // Reconstruct a File-like object for revalidation with password
    const blob = new Blob([arrayBuffer], { type: 'application/pdf' })
    const file = new File([blob], filename, { type: 'application/pdf' })
    await processFile(file, passwordValue)
  }

  const handlePasswordClose = () => {
    setUploadState({ phase: 'idle' })
    setPasswordValue('')
    setPasswordError('')
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  const isLoading = uploadState.phase === 'validating' || uploadState.phase === 'storing'
  const isError = uploadState.phase === 'error'

  return (
    <>
      {/* Drop Zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload PDF — click or drag and drop a PDF file here"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={[
          'relative flex flex-col items-center justify-center gap-4',
          'w-full rounded-xl border-2 border-dashed p-12 text-center cursor-pointer',
          'transition-all duration-200 outline-none',
          'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          isDragging
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/40 scale-[1.01]'
            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20',
          isLoading ? 'pointer-events-none opacity-70' : '',
        ].join(' ')}
      >
        {isLoading ? (
          <>
            <Spinner size="lg" label="Processing PDF..." />
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              {uploadState.phase === 'validating' ? 'Validating PDF...' : 'Storing PDF locally...'}
            </p>
          </>
        ) : (
          <>
            <div
              aria-hidden="true"
              className={`text-5xl transition-transform duration-200 ${isDragging ? 'scale-110' : ''}`}
            >
              📄
            </div>

            <div>
              <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
                {isDragging ? 'Drop your PDF here' : 'Drag & Drop PDF Here'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">or</p>
            </div>

            <Button variant="primary" size="md" tabIndex={-1} aria-hidden="true">
              Choose PDF File
            </Button>

            <p className="text-xs text-slate-400 dark:text-slate-600">
              Maximum file size: {maxMB} MB · PDF files only · Processed locally in your browser
            </p>
          </>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="sr-only"
          onChange={handleFileChange}
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      {/* Error message */}
      {isError && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800"
        >
          <span aria-hidden="true" className="text-red-500 text-lg shrink-0">⚠</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              {uploadState.message}
            </p>
          </div>
          <button
            onClick={() => setUploadState({ phase: 'idle' })}
            aria-label="Dismiss error"
            className="text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      )}

      {/* Password Modal */}
      <Modal
        open={uploadState.phase === 'password-required'}
        onClose={handlePasswordClose}
        title="Password Protected PDF"
        size="sm"
        persistent
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            This PDF is password protected. Enter the password to open it.
          </p>

          <div>
            <label
              htmlFor="pdf-password"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Password
            </label>
            <input
              id="pdf-password"
              type="password"
              value={passwordValue}
              onChange={(e) => { setPasswordValue(e.target.value); setPasswordError('') }}
              onKeyDown={(e) => { if (e.key === 'Enter') handlePasswordSubmit() }}
              placeholder="Enter PDF password"
              autoFocus
              className={[
                'w-full px-3 py-2 rounded-lg border text-sm',
                'bg-white dark:bg-slate-800 text-slate-900 dark:text-white',
                'focus:outline-none focus:ring-2 focus:ring-blue-500',
                passwordError
                  ? 'border-red-400 dark:border-red-600'
                  : 'border-slate-300 dark:border-slate-600',
              ].join(' ')}
            />
            {passwordError && (
              <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
                {passwordError}
              </p>
            )}
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-600">
            The password is used only to open this PDF locally. It is never sent anywhere.
          </p>

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" size="sm" onClick={handlePasswordClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handlePasswordSubmit}
              loading={isLoading}
            >
              Open PDF
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
