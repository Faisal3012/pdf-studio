// ─── Editor Tool Types ────────────────────────────────────────────────────────

export type EditorTool =
  | 'select'
  | 'edit-text'
  | 'text'
  | 'image'
  | 'draw'
  | 'highlight'
  | 'rect'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'signature'

export type ZoomLevel = 50 | 75 | 100 | 125 | 150 | 200

export type Theme = 'light' | 'dark' | 'system'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed'

// ─── Page State ───────────────────────────────────────────────────────────────

export type PageRotation = 0 | 90 | 180 | 270

export interface PageState {
  /** Stable identity — never changes, even after reorder */
  pageIndex: number
  /** Current display order position */
  order: number
  rotation: PageRotation
  deleted: boolean
}

// ─── Editor State (non-annotation) ───────────────────────────────────────────

export interface EditorSettings {
  zoom: number
  currentPage: number
  theme: Theme
}
