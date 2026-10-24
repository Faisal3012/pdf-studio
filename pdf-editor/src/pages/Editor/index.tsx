import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ThemeToggle } from '@/components/UI/ThemeToggle'
import { PDFUpload } from '@/components/PDFViewer/PDFUpload'
import { PageSidebar } from '@/components/PageSidebar/PageSidebar'
import { EditorCanvas } from '@/components/EditorCanvas/EditorCanvas'
import { EditorStatusBar } from '@/components/EditorCanvas/EditorStatusBar'
import { Toolbar } from '@/components/Toolbar/Toolbar'
import { PropertiesPanel } from '@/components/PropertiesPanel/PropertiesPanel'
import { UnsavedChangesDialog } from '@/components/DocumentActions/UnsavedChangesDialog'
import { useEditorStore } from '@/store/editorStore'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useUndoRedo } from '@/hooks/useUndoRedo'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'

import { useAutosave } from '@/hooks/useAutosave'
import { ExportModal } from '@/components/DocumentActions/ExportModal'
import { buildProjectFile, downloadProjectFile, loadProjectFile, decodePDFFromProject } from '@/services/storage/projectFile'
import { storePDF, storeSession, setActiveSessionId, storeAnnotations, storeExistingTextEdits, clearFullSession } from '@/services/storage/indexedDB'
import type { Annotation } from '@/types/annotation.types'
import type { ExistingTextEdit } from '@/types/existingText.types'
import { useThemeStore } from '@/store/themeStore'

export function EditorPage() {
  const currentDocument = useEditorStore((s) => s.currentDocument)
  const sessionId = useEditorStore((s) => s.sessionId)
  const pages = useEditorStore((s) => s.pages)
  const setPages = useEditorStore((s) => s.setPages)
  const annotationsByPage = useEditorStore((s) => s.annotationsByPage)
  const setAllAnnotations = useEditorStore((s) => s.setAllAnnotations)
  const setDocument = useEditorStore((s) => s.setDocument)
  const clearDocument = useEditorStore((s) => s.clearDocument)
  const hasUnsavedChanges = useEditorStore((s) => s.hasUnsavedChanges)
  const zoom = useEditorStore((s) => s.zoom)
  const setZoom = useEditorStore((s) => s.setZoom)
  const theme = useThemeStore((s) => s.theme)

  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const projectFileInputRef = useRef<HTMLInputElement>(null)

  const selectedId = useEditorStore((s) => s.selectedAnnotationId)
  const setSelectedAnnotation = useEditorStore((s) => s.setSelectedAnnotation)
  const removeAnnotation = useEditorStore((s) => s.removeAnnotation)

  const { undo, redo, recordCurrentState } = useUndoRedo()

  // Autosave to IndexedDB
  useAutosave()

  // Protect against accidental tab close
  useUnsavedChanges()

  // Register editor keyboard shortcuts (including Ctrl+Z / Ctrl+Y / Del / Esc)
  useKeyboardShortcuts({
    zoom,
    setZoom,
    onUndo: undo,
    onRedo: redo,
    onDelete: () => {
      if (selectedId) {
        recordCurrentState()
        removeAnnotation(selectedId)
        setSelectedAnnotation(null)
      }
    },
    onEscape: () => {
      setSelectedAnnotation(null)
    },
  })

  const handleOpenAnother = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true)
    } else {
      if (sessionId) {
        clearFullSession(sessionId).catch(() => {})
      }
      clearDocument()
    }
  }

  const handleConfirmLeave = () => {
    setShowUnsavedDialog(false)
    if (sessionId) {
      clearFullSession(sessionId).catch(() => {})
    }
    clearDocument()
  }

  const existingTextEditsByPage = useEditorStore((s) => s.existingTextEditsByPage)
  const setAllExistingTextEdits = useEditorStore((s) => s.setAllExistingTextEdits)

  const handleSaveProject = async () => {
    if (!sessionId || !currentDocument) return
    try {
      const project = await buildProjectFile({
        sessionId,
        document: currentDocument,
        pages,
        annotationsByPage,
        existingTextEditsByPage,
        zoom,
        currentPage: 0,
        theme,
      })
      downloadProjectFile(project)
    } catch (err) {
      console.error('Failed to save project:', err)
    }
  }

  const handleLoadProjectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const project = await loadProjectFile(file)
      const pdfBuffer = decodePDFFromProject(project)

      if (pdfBuffer) {
        const newSessionId = `session-${Date.now()}`
        await storePDF(newSessionId, pdfBuffer, project.document.filename)

        const pageOrder = project.pages.map((p) => p.pageIndex)
        const pageRotations: Record<number, 0 | 90 | 180 | 270> = {}
        project.pages.forEach((p) => {
          pageRotations[p.pageIndex] = p.rotation
        })

        const meta = {
          filename: project.document.filename,
          pageCount: project.document.pageCount,
          pageDimensions: project.document.pageDimensions,
          fileSize: pdfBuffer.byteLength,
        }

        await storeSession(newSessionId, meta, pageOrder, pageRotations)
        setActiveSessionId(newSessionId)
        setDocument(meta, newSessionId)

        // Restore annotations
        const byPage: Record<number, Annotation[]> = {}
        project.annotations.forEach((a) => {
          if (!byPage[a.pageIndex]) byPage[a.pageIndex] = []
          byPage[a.pageIndex].push(a)
        })
        setAllAnnotations(byPage)
        await storeAnnotations(newSessionId, byPage)

        // Restore existing text edits if present
        const editsByPage: Record<number, ExistingTextEdit[]> = {}
        if (project.existingTextEdits && project.existingTextEdits.length > 0) {
          project.existingTextEdits.forEach((edit) => {
            if (!editsByPage[edit.pageIndex]) editsByPage[edit.pageIndex] = []
            editsByPage[edit.pageIndex].push(edit)
          })
          setAllExistingTextEdits(editsByPage)
        } else {
          setAllExistingTextEdits({})
        }
        await storeExistingTextEdits(newSessionId, editsByPage)

        setPages(project.pages)
        useEditorStore.getState().setSaveStatus('saved')
        useEditorStore.getState().setHasUnsavedChanges(false)
      }
    } catch (err) {
      console.error('Failed to load project:', err)
      alert(err instanceof Error ? err.message : 'Could not load project file.')
    }

    e.target.value = ''
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#F5F2EA] dark:bg-[#171C19] text-[#202820] dark:text-[#F0F0E8] overflow-hidden">
      {/* Header */}
      <header className="h-14 bg-[#FFFEFA] dark:bg-[#262E29] border-b border-[#DEDCCF] dark:border-[#39443C] flex items-center justify-between px-5 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 font-bold tracking-tight text-[#23483B] dark:text-[#A7C4AD] text-sm"
            aria-label="Go to homepage"
          >
            <svg className="w-4 h-4 text-[#C3A46B] dark:text-[#D2B77E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="uppercase text-xs tracking-wider font-semibold">PDF STUDIO</span>
          </Link>
          <span className="text-[#DEDCCF] dark:text-[#39443C]" aria-hidden="true">|</span>
          <span className="text-xs font-medium text-[#73776E] dark:text-[#ADB5AA] truncate max-w-xs md:max-w-md">
            {currentDocument ? currentDocument.filename : 'No document open'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={projectFileInputRef}
            type="file"
            accept=".pdfeditor"
            className="hidden"
            onChange={handleLoadProjectFile}
          />

          <button
            onClick={() => projectFileInputRef.current?.click()}
            className="text-xs px-2.5 py-1.5 rounded-md border border-[#DEDCCF] dark:border-[#39443C] text-[#73776E] dark:text-[#ADB5AA] hover:bg-[#EAE6DC] dark:hover:bg-[#202722] hover:text-[#202820] dark:hover:text-[#F0F0E8] transition flex items-center gap-1.5"
            title="Open an existing .pdfeditor project file"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
            </svg>
            <span>Open Project</span>
          </button>

          {currentDocument && (
            <>
              <button
                onClick={() => setShowExportModal(true)}
                className="text-xs px-3.5 py-1.5 rounded-md bg-[#23483B] hover:bg-[#19392F] dark:bg-[#A7C4AD] dark:hover:bg-[#C2D8C6] text-[#FFFEFA] dark:text-[#171C19] font-semibold transition shadow-xs flex items-center gap-1.5"
                title="Download your edited document as a standard .pdf file"
              >
                <span>Export PDF</span>
              </button>

              <button
                onClick={handleSaveProject}
                className="text-xs px-2.5 py-1.5 rounded-md border border-[#DEDCCF] dark:border-[#39443C] text-[#202820] dark:text-[#F0F0E8] hover:bg-[#EAE6DC] dark:hover:bg-[#202722] transition flex items-center gap-1.5"
                title="Save editable project file (.pdfeditor) to resume editing later"
              >
                <span>Save Project</span>
              </button>

              <button
                onClick={handleOpenAnother}
                className="text-xs px-2.5 py-1.5 rounded-md border border-[#DEDCCF] dark:border-[#39443C] text-[#73776E] dark:text-[#ADB5AA] hover:bg-[#EAE6DC] dark:hover:bg-[#202722] transition"
                title="Close current PDF and open another"
              >
                Open Another PDF
              </button>
            </>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* Export PDF Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />

      {/* Unsaved changes confirmation dialog */}
      <UnsavedChangesDialog
        isOpen={showUnsavedDialog}
        onClose={() => setShowUnsavedDialog(false)}
        onConfirmLeave={handleConfirmLeave}
      />

      {/* Main area */}
      {currentDocument ? (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Tool selection bar */}
          <Toolbar />

          {/* Workspace: Sidebar + Canvas + Properties Panel */}
          <div className="flex-1 flex min-h-0 overflow-hidden relative">
            <PageSidebar />
            <EditorCanvas />
            <PropertiesPanel />
          </div>

          {/* Status and Zoom Bar */}
          <EditorStatusBar />
        </div>
      ) : (
        <main className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
          <div className="max-w-md w-full space-y-4">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Open a PDF to get started
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                All processing happens locally in your browser. Nothing is uploaded.
              </p>
            </div>

            <PDFUpload />

            <p className="text-center text-xs text-slate-400">
              <Link to="/" className="hover:underline text-blue-600 dark:text-blue-400">
                ← Back to homepage
              </Link>
            </p>
          </div>
        </main>
      )}
    </div>
  )
}
