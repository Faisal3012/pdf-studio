import { useCallback } from 'react'
import { useEditorStore } from '@/store/editorStore'
import { useHistoryStore } from '@/store/historyStore'
import type { AnnotationState } from '@/types/annotation.types'

/**
 * Hook to manage undo and redo operations between historyStore and editorStore.
 */
export function useUndoRedo() {
  const annotationsByPage = useEditorStore((s) => s.annotationsByPage)
  const existingTextEditsByPage = useEditorStore((s) => s.existingTextEditsByPage)
  const pages = useEditorStore((s) => s.pages)
  const setAllAnnotations = useEditorStore((s) => s.setAllAnnotations)
  const setAllExistingTextEdits = useEditorStore((s) => s.setAllExistingTextEdits)
  const setPages = useEditorStore((s) => s.setPages)
  const setHasUnsavedChanges = useEditorStore((s) => s.setHasUnsavedChanges)

  const pushHistory = useHistoryStore((s) => s.pushHistory)
  const undoAction = useHistoryStore((s) => s.undo)
  const redoAction = useHistoryStore((s) => s.redo)
  const past = useHistoryStore((s) => s.past)
  const future = useHistoryStore((s) => s.future)

  const canUndo = past.length > 0
  const canRedo = future.length > 0

  /**
   * Helper to capture current state before mutating
   */
  const recordCurrentState = useCallback(() => {
    const pageRotations: Record<number, 0 | 90 | 180 | 270> = {}
    pages.forEach((p) => {
      pageRotations[p.pageIndex] = p.rotation
    })

    const currentState: AnnotationState = {
      byPage: JSON.parse(JSON.stringify(annotationsByPage)),
      existingTextEditsByPage: JSON.parse(JSON.stringify(existingTextEditsByPage)),
      pageOrder: pages.map((p) => p.pageIndex),
      pageRotations,
    }

    pushHistory(currentState)
  }, [annotationsByPage, existingTextEditsByPage, pages, pushHistory])

  /**
   * Apply an AnnotationState snapshot to editorStore
   */
  const applyState = useCallback(
    (targetState: AnnotationState) => {
      setAllAnnotations(targetState.byPage)
      setAllExistingTextEdits(targetState.existingTextEditsByPage || {})

      // Reconstruct pages according to snapshot
      const newPages = targetState.pageOrder.map((pageIdx, order) => {
        const existing = pages.find((p) => p.pageIndex === pageIdx)
        return {
          pageIndex: pageIdx,
          order,
          rotation: targetState.pageRotations[pageIdx] ?? 0,
          deleted: existing ? existing.deleted : false,
        }
      })
      setPages(newPages)
      setHasUnsavedChanges(true)
    },
    [pages, setAllAnnotations, setAllExistingTextEdits, setPages, setHasUnsavedChanges]
  )

  const handleUndo = useCallback(() => {
    if (!canUndo) return
    const target = undoAction()
    if (target) {
      applyState(target)
    }
  }, [canUndo, undoAction, applyState])

  const handleRedo = useCallback(() => {
    if (!canRedo) return
    const target = redoAction()
    if (target) {
      applyState(target)
    }
  }, [canRedo, redoAction, applyState])

  return {
    canUndo,
    canRedo,
    undo: handleUndo,
    redo: handleRedo,
    recordCurrentState,
  }
}
