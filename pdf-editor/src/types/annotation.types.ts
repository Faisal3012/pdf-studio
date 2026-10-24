// ─── Annotation Types ─────────────────────────────────────────────────────────
// Every annotation carries a stable pageIndex (not display order).
// Page reordering never changes an annotation's pageIndex.

export type AnnotationType =
  | 'text'
  | 'image'
  | 'draw'
  | 'highlight'
  | 'rect'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'signature'

export interface BaseAnnotation {
  id: string
  /** Stable page identity — does NOT change when pages are reordered */
  pageIndex: number
  type: AnnotationType
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  locked: boolean
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text'
  text: string
  fontFamily: string
  fontSize: number
  fontStyle: string   // 'normal' | 'bold' | 'italic' | 'bold italic'
  textDecoration: string // '' | 'underline'
  fill: string
  align: 'left' | 'center' | 'right'
}

export interface ImageAnnotation extends BaseAnnotation {
  type: 'image' | 'signature'
  /** Key referencing the binary in IndexedDB — NOT stored in undo history */
  imageDbKey: string
}

export interface DrawAnnotation extends BaseAnnotation {
  type: 'draw'
  points: number[]
  stroke: string
  strokeWidth: number
  tension: number
  lineCap: 'round' | 'butt' | 'square'
  globalCompositeOperation: string
}

export interface HighlightAnnotation extends BaseAnnotation {
  type: 'highlight'
  fill: string
}

export interface ShapeAnnotation extends BaseAnnotation {
  type: 'rect' | 'circle' | 'line' | 'arrow'
  stroke: string
  strokeWidth: number
  fill: string
  /** For line/arrow: flat point array [x1,y1,x2,y2] */
  points?: number[]
}

export type Annotation =
  | TextAnnotation
  | ImageAnnotation
  | DrawAnnotation
  | HighlightAnnotation
  | ShapeAnnotation

import type { ExistingTextEdit } from './existingText.types'

/** Lightweight state stored in undo/redo history — no binary data */
export interface AnnotationState {
  /** pageIndex → annotations on that page */
  byPage: Record<number, Annotation[]>
  /** pageIndex → existing-text edits on that page */
  existingTextEditsByPage?: Record<number, ExistingTextEdit[]>
  /** Display order of page indices */
  pageOrder: number[]
  /** Per-page rotation metadata */
  pageRotations: Record<number, 0 | 90 | 180 | 270>
}
