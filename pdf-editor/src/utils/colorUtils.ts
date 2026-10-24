// ─── Color Utilities ──────────────────────────────────────────────────────────

/** Convert hex color + opacity (0-1) to rgba string */
export function hexToRgba(hex: string, opacity: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return `rgba(0,0,0,${opacity})`
  const r = parseInt(result[1], 16)
  const g = parseInt(result[2], 16)
  const b = parseInt(result[3], 16)
  return `rgba(${r},${g},${b},${opacity})`
}

/** Preset highlight colors */
export const HIGHLIGHT_COLORS = [
  { label: 'Yellow', value: '#FFD700' },
  { label: 'Green',  value: '#90EE90' },
  { label: 'Blue',   value: '#87CEEB' },
  { label: 'Red',    value: '#FFB6C1' },
  { label: 'Orange', value: '#FFD580' },
] as const

/** Default annotation colors */
export const DEFAULT_STROKE_COLOR = '#2563eb'
export const DEFAULT_FILL_COLOR   = 'transparent'
export const DEFAULT_TEXT_COLOR   = '#1e293b'
export const DEFAULT_DRAW_COLOR   = '#1e293b'
export const DEFAULT_HIGHLIGHT_COLOR = '#FFD700'
