import { create } from 'zustand'
import type { EditorTool, SaveStatus, PageState } from '@/types/editor.types'
import type { PDFDocumentMeta } from '@/types/pdf.types'
import type { Annotation } from '@/types/annotation.types'

// ─── Editor Store ─────────────────────────────────────────────────────────────
// Central store for all editor state except theme (see themeStore).
// Annotation mutations should also call historyStore.pushHistory().

import type { ExistingTextEdit } from '@/types/existingText.types'

interface EditorStore {
  // Document
  currentDocument: PDFDocumentMeta | null
  sessionId: string | null

  // Page state
  pages: PageState[]
  currentPageIndex: number

  // Annotations: keyed by stable pageIndex
  annotationsByPage: Record<number, Annotation[]>

  // Existing-text edits: keyed by stable pageIndex
  existingTextEditsByPage: Record<number, ExistingTextEdit[]>
  selectedExistingTextId: string | null

  // Tool state
  activeTool: EditorTool
  selectedAnnotationId: string | null

  // Zoom (percentage: 50–200)
  zoom: number

  // UI state
  sidebarOpen: boolean
  saveStatus: SaveStatus
  lastSaveError: string | null
  hasUnsavedChanges: boolean

  // Actions — document
  setDocument: (doc: PDFDocumentMeta, sessionId: string) => void
  clearDocument: () => void

  // Actions — pages
  setPages: (pages: PageState[]) => void
  setCurrentPage: (pageIndex: number) => void
  reorderPages: (newOrder: number[]) => void
  rotatePage: (pageIndex: number, rotation: 0 | 90 | 180 | 270) => void
  deletePage: (pageIndex: number) => void

  // Actions — annotations
  addAnnotation: (annotation: Annotation) => void
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void
  removeAnnotation: (id: string) => void
  setAnnotationsForPage: (pageIndex: number, annotations: Annotation[]) => void
  setAllAnnotations: (byPage: Record<number, Annotation[]>) => void

  // Actions — existing text edits
  upsertExistingTextEdit: (edit: ExistingTextEdit) => void
  removeExistingTextEdit: (id: string) => void
  setAllExistingTextEdits: (byPage: Record<number, ExistingTextEdit[]>) => void
  setSelectedExistingTextId: (id: string | null) => void

  // Actions — tool/selection
  setActiveTool: (tool: EditorTool) => void
  setSelectedAnnotation: (id: string | null) => void

  // Actions — zoom
  setZoom: (zoom: number) => void

  // Actions — UI
  setSidebarOpen: (open: boolean) => void
  setSaveStatus: (status: SaveStatus) => void
  setSaveError: (error: string | null) => void
  setHasUnsavedChanges: (value: boolean) => void
}

export const useEditorStore = create<EditorStore>()((set, get) => ({
  // Initial state
  currentDocument: null,
  sessionId: null,
  pages: [],
  currentPageIndex: 0,
  annotationsByPage: {},
  existingTextEditsByPage: {},
  selectedExistingTextId: null,
  activeTool: 'select',
  selectedAnnotationId: null,
  zoom: 100,
  sidebarOpen: true,
  saveStatus: 'idle',
  lastSaveError: null,
  hasUnsavedChanges: false,

  // Document actions
  setDocument: (doc, sessionId) =>
    set({
      currentDocument: doc,
      sessionId,
      pages: Array.from({ length: doc.pageCount }, (_, i) => ({
        pageIndex: i,
        order: i,
        rotation: 0,
        deleted: false,
      })),
      currentPageIndex: 0,
      annotationsByPage: {},
      existingTextEditsByPage: {},
      selectedExistingTextId: null,
      hasUnsavedChanges: false,
    }),

  clearDocument: () =>
    set({
      currentDocument: null,
      sessionId: null,
      pages: [],
      currentPageIndex: 0,
      annotationsByPage: {},
      existingTextEditsByPage: {},
      selectedExistingTextId: null,
      activeTool: 'select',
      selectedAnnotationId: null,
      zoom: 100,
      hasUnsavedChanges: false,
      saveStatus: 'idle',
    }),

  // Page actions
  setPages: (pages) => set({ pages }),

  setCurrentPage: (pageIndex) => set({ currentPageIndex: pageIndex }),

  reorderPages: (newOrder) => {
    const pages = get().pages.map((p) => ({
      ...p,
      order: newOrder.indexOf(p.pageIndex),
    }))
    set({ pages, hasUnsavedChanges: true })
  },

  rotatePage: (pageIndex, rotation) => {
    const pages = get().pages.map((p) =>
      p.pageIndex === pageIndex ? { ...p, rotation } : p
    )
    set({ pages, hasUnsavedChanges: true })
  },

  deletePage: (pageIndex) => {
    const pages = get().pages.map((p) =>
      p.pageIndex === pageIndex ? { ...p, deleted: true } : p
    )
    set({ pages, hasUnsavedChanges: true })
  },

  // Annotation actions
  addAnnotation: (annotation) => {
    const byPage = { ...get().annotationsByPage }
    const existing = byPage[annotation.pageIndex] ?? []
    byPage[annotation.pageIndex] = [...existing, annotation]
    set({ annotationsByPage: byPage, hasUnsavedChanges: true })
  },

  updateAnnotation: (id, updates) => {
    const byPage = { ...get().annotationsByPage }
    for (const [pageIdx, annotations] of Object.entries(byPage)) {
      const idx = annotations.findIndex((a) => a.id === id)
      if (idx !== -1) {
        const updated = [...annotations]
        updated[idx] = { ...updated[idx], ...updates } as Annotation
        byPage[Number(pageIdx)] = updated
        set({ annotationsByPage: byPage, hasUnsavedChanges: true })
        return
      }
    }
  },

  removeAnnotation: (id) => {
    const byPage = { ...get().annotationsByPage }
    for (const [pageIdx, annotations] of Object.entries(byPage)) {
      const filtered = annotations.filter((a) => a.id !== id)
      if (filtered.length !== annotations.length) {
        byPage[Number(pageIdx)] = filtered
        set({ annotationsByPage: byPage, hasUnsavedChanges: true })
        return
      }
    }
  },

  setAnnotationsForPage: (pageIndex, annotations) => {
    const byPage = { ...get().annotationsByPage, [pageIndex]: annotations }
    set({ annotationsByPage: byPage, hasUnsavedChanges: true })
  },

  setAllAnnotations: (byPage) =>
    set({ annotationsByPage: byPage }),

  // Existing text edit actions
  upsertExistingTextEdit: (edit) => {
    const editsByPage = { ...get().existingTextEditsByPage }
    const pageEdits = editsByPage[edit.pageIndex] ? [...editsByPage[edit.pageIndex]] : []
    const existingIdx = pageEdits.findIndex((e) => e.id === edit.id)
    if (existingIdx !== -1) {
      pageEdits[existingIdx] = edit
    } else {
      pageEdits.push(edit)
    }
    editsByPage[edit.pageIndex] = pageEdits
    set({ existingTextEditsByPage: editsByPage, hasUnsavedChanges: true })
  },

  removeExistingTextEdit: (id) => {
    const editsByPage = { ...get().existingTextEditsByPage }
    for (const [pageIdx, edits] of Object.entries(editsByPage)) {
      const filtered = edits.filter((e) => e.id !== id)
      if (filtered.length !== edits.length) {
        editsByPage[Number(pageIdx)] = filtered
        set({
          existingTextEditsByPage: editsByPage,
          selectedExistingTextId: get().selectedExistingTextId === id ? null : get().selectedExistingTextId,
          hasUnsavedChanges: true,
        })
        return
      }
    }
  },

  setAllExistingTextEdits: (byPage) =>
    set({ existingTextEditsByPage: byPage }),

  setSelectedExistingTextId: (id) =>
    set({ selectedExistingTextId: id }),

  // Tool/selection actions
  setActiveTool: (tool) => set({ activeTool: tool }),
  setSelectedAnnotation: (id) => set({ selectedAnnotationId: id }),

  // Zoom
  setZoom: (zoom) => set({ zoom }),

  // UI
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setSaveError: (lastSaveError) => set({ lastSaveError }),
  setHasUnsavedChanges: (hasUnsavedChanges) => set({ hasUnsavedChanges }),
}))
