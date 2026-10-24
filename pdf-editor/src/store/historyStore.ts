import { create } from 'zustand'
import type { AnnotationState } from '@/types/annotation.types'

// ─── History Store — Undo/Redo ────────────────────────────────────────────────
// - Maximum 50 history entries (FIFO eviction of oldest)
// - Separate past and future stacks
// - Stores only lightweight JSON annotation state — NO binary data
// - pushHistory clears the redo (future) stack

const MAX_HISTORY = 50

interface HistoryStore {
  past: AnnotationState[]
  future: AnnotationState[]

  pushHistory: (state: AnnotationState) => void
  undo: () => AnnotationState | null
  redo: () => AnnotationState | null
  clearHistory: () => void
  canUndo: () => boolean
  canRedo: () => boolean
}

export const useHistoryStore = create<HistoryStore>()((set, get) => ({
  past: [],
  future: [],

  pushHistory: (state) => {
    let past = [...get().past, state]
    // Evict oldest entry when limit exceeded
    if (past.length > MAX_HISTORY) {
      past = past.slice(past.length - MAX_HISTORY)
    }
    set({ past, future: [] })
  },

  undo: () => {
    const { past, future } = get()
    if (past.length === 0) return null

    const previous = past[past.length - 1]
    set({
      past: past.slice(0, past.length - 1),
      future: [previous, ...future],
    })
    return previous
  },

  redo: () => {
    const { past, future } = get()
    if (future.length === 0) return null

    const next = future[0]
    set({
      past: [...past, next],
      future: future.slice(1),
    })
    return next
  },

  clearHistory: () => set({ past: [], future: [] }),

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
}))
