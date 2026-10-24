import { useState } from 'react'
import { Modal } from '@/components/UI/Modal'
import { Button } from '@/components/UI/Button'
import { Spinner } from '@/components/UI/Spinner'
import { exportPDF, downloadBytes } from '@/services/pdf/pdfExporter'
import { useEditorStore } from '@/store/editorStore'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const currentDocument = useEditorStore((s) => s.currentDocument)
  const sessionId = useEditorStore((s) => s.sessionId)
  const pages = useEditorStore((s) => s.pages)
  const annotationsByPage = useEditorStore((s) => s.annotationsByPage)
  const existingTextEditsByPage = useEditorStore((s) => s.existingTextEditsByPage)

  const [filename, setFilename] = useState(() => {
    if (!currentDocument) return 'document-edited.pdf'
    return currentDocument.filename.replace(/\.pdf$/i, '') + '-edited.pdf'
  })

  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const [unredactedWarnings, setUnredactedWarnings] = useState<string[] | null>(null)
  const [pendingExportBytes, setPendingExportBytes] = useState<Uint8Array | null>(null)

  const handleExport = async (forceProceed = false) => {
    if (!sessionId || !currentDocument) return

    setIsExporting(true)
    setProgress(0)
    setError(null)
    setUnredactedWarnings(null)

    try {
      const { pdfBytes, editsResult } = await exportPDF({
        sessionId,
        filename,
        pages,
        annotationsByPage,
        existingTextEditsByPage,
        onProgress: (p) => setProgress(p),
      })

      // If there are unredacted edits and user has not explicitly forced download,
      // present clear security warning and recovery path
      if (!forceProceed && editsResult && editsResult.unredactedCount > 0) {
        setIsExporting(false)
        setPendingExportBytes(pdfBytes)
        setUnredactedWarnings(editsResult.unredactedDetails)
        return
      }

      downloadBytes(pdfBytes, filename)
      setIsExporting(false)
      onClose()
    } catch (err) {
      console.error('[ExportModal] Export failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to export PDF')
      setIsExporting(false)
    }
  }

  return (
    <Modal open={isOpen} onClose={onClose} title="Export PDF">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Output File Name
          </label>
          <input
            type="text"
            value={filename}
            disabled={isExporting}
            onChange={(e) => setFilename(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-transparent"
          />
        </div>

        {/* Disclaimer */}
        <div className="p-3 bg-[#E5EDE6] dark:bg-[#202722] border border-[#DEDCCF] dark:border-[#39443C] rounded-md text-xs text-[#202820] dark:text-[#F0F0E8] space-y-1.5">
          <p className="font-semibold flex items-center gap-1.5 text-[#23483B] dark:text-[#A7C4AD]">
            <svg className="w-3.5 h-3.5 text-[#23483B] dark:text-[#A7C4AD]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Document Stream Processing & Redaction</span>
          </p>
          <p className="text-[11px] leading-relaxed text-[#73776E] dark:text-[#ADB5AA]">
            Modifications made via <strong>Edit Text</strong> are embedded into the PDF content stream with original character sequences removed where encoding allows.
          </p>
          <p className="text-[10px] text-[#73776E] dark:text-[#ADB5AA] flex items-center gap-1">
            <span>Notice:</span>
            <span>Modifying a digitally signed PDF invalidates any existing digital signatures.</span>
          </p>
        </div>

        {isExporting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#73776E] dark:text-[#ADB5AA]">
              <span className="flex items-center gap-1.5">
                <Spinner size="sm" />
                <span>Exporting pages...</span>
              </span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#EAE6DC] dark:bg-[#202722] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#23483B] dark:bg-[#A7C4AD] transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {unredactedWarnings && unredactedWarnings.length > 0 && (
          <div className="p-3 bg-[#B77C30]/10 border border-[#B77C30]/30 rounded-md text-xs text-[#202820] dark:text-[#F0F0E8] space-y-2">
            <p className="font-semibold flex items-center gap-1.5 text-[#B77C30] dark:text-[#D69747]">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Potential Incomplete Redaction Detected</span>
            </p>
            <p className="text-[11px] leading-relaxed">
              The following edited text spans could not be completely erased from the underlying PDF stream (likely due to custom font subsetting or complex operator streams) and rely on visual vector masking:
            </p>
            <ul className="list-disc pl-4 text-[10px] space-y-0.5 font-mono">
              {unredactedWarnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
            <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
              If this document contains sensitive or confidential information, do not rely on visual masking alone.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  if (pendingExportBytes) {
                    downloadBytes(pendingExportBytes, filename)
                    setPendingExportBytes(null)
                    setUnredactedWarnings(null)
                    onClose()
                  }
                }}
              >
                Download Anyway (Visual Masking Only)
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPendingExportBytes(null)
                  setUnredactedWarnings(null)
                  onClose()
                }}
              >
                Cancel & Review Edits
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleExport(false)}
            disabled={isExporting || !filename.trim() || Boolean(unredactedWarnings)}
          >
            {isExporting ? 'Exporting...' : 'Download PDF'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
