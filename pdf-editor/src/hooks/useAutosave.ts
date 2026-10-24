import { useEffect, useRef } from 'react'
import { useEditorStore } from '@/store/editorStore'
import { storeAnnotations, storeExistingTextEdits, storeSession } from '@/services/storage/indexedDB'

const AUTOSAVE_DEBOUNCE_MS = 3000 // 3 seconds after last change

let inFlightSave: Promise<boolean> | null = null
let queuedSaveRequested = false

async function doPersist(): Promise<boolean> {
  const state = useEditorStore.getState()
  const {
    sessionId,
    currentDocument,
    pages,
    annotationsByPage,
    existingTextEditsByPage,
    setSaveStatus,
    setSaveError,
    setHasUnsavedChanges,
  } = state

  if (!sessionId || !currentDocument) return false

  try {
    setSaveStatus('saving')
    setSaveError(null)

    // 1. Save annotations
    await storeAnnotations(sessionId, annotationsByPage)

    // 2. Save existing-text edits
    await storeExistingTextEdits(sessionId, existingTextEditsByPage)

    // 3. Save session metadata
    const pageOrder = pages.map((p) => p.pageIndex)
    const pageRotations: Record<number, 0 | 90 | 180 | 270> = {}
    pages.forEach((p) => {
      pageRotations[p.pageIndex] = p.rotation
    })

    await storeSession(sessionId, currentDocument, pageOrder, pageRotations)

    setSaveStatus('saved')
    setSaveError(null)
    setHasUnsavedChanges(false)
    return true
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    console.error('[Persistence] Failed to save to IndexedDB:', err)
    setSaveStatus('failed')
    setSaveError(errorMsg)
    return false
  }
}

/**
 * Save helper to persist current document state to IndexedDB.
 * Serializes concurrent calls and captures structured failure diagnostics.
 */
export async function persistCurrentDocument(): Promise<boolean> {
  if (inFlightSave) {
    queuedSaveRequested = true
    return inFlightSave
  }

  const promise = doPersist()
  inFlightSave = promise

  try {
    return await promise
  } finally {
    if (inFlightSave === promise) {
      inFlightSave = null
    }
    if (queuedSaveRequested) {
      queuedSaveRequested = false
      void persistCurrentDocument()
    }
  }
}

/**
 * Hook to automatically persist annotations and session state to IndexedDB after editing.
 */
export function useAutosave() {
  const sessionId = useEditorStore((s) => s.sessionId)
  const currentDocument = useEditorStore((s) => s.currentDocument)
  const hasUnsavedChanges = useEditorStore((s) => s.hasUnsavedChanges)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!sessionId || !currentDocument || !hasUnsavedChanges) {
      return
    }

    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
    }

    timerRef.current = window.setTimeout(async () => {
      await persistCurrentDocument()
    }, AUTOSAVE_DEBOUNCE_MS)

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [sessionId, currentDocument, hasUnsavedChanges])
}
