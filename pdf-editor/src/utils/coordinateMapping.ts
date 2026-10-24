// ─── Coordinate Mapping ───────────────────────────────────────────────────────
// Converts between PDF page space and canvas/screen space at any zoom level.
// PDF coords: origin at top-left, in PDF user units (points)
// Canvas coords: origin at top-left, in pixels at current zoom

export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Convert PDF-space coordinates to canvas-space pixels.
 * @param point - point in PDF user units
 * @param zoom  - current zoom as a fraction (e.g. 1.0 = 100%, 1.5 = 150%)
 */
export function pdfToCanvas(point: Point, zoom: number): Point {
  return {
    x: point.x * zoom,
    y: point.y * zoom,
  }
}

/**
 * Convert canvas-space pixels back to PDF-space coordinates.
 * @param point - point in canvas pixels
 * @param zoom  - current zoom as a fraction
 */
export function canvasToPdf(point: Point, zoom: number): Point {
  return {
    x: point.x / zoom,
    y: point.y / zoom,
  }
}

/** Scale a rect from PDF space to canvas space */
export function pdfRectToCanvas(rect: Rect, zoom: number): Rect {
  return {
    x:      rect.x * zoom,
    y:      rect.y * zoom,
    width:  rect.width * zoom,
    height: rect.height * zoom,
  }
}

/** Scale a rect from canvas space back to PDF space */
export function canvasRectToPdf(rect: Rect, zoom: number): Rect {
  return {
    x:      rect.x / zoom,
    y:      rect.y / zoom,
    width:  rect.width / zoom,
    height: rect.height / zoom,
  }
}

/** Clamp zoom percentage to supported range */
export function clampZoom(zoom: number): number {
  return Math.min(200, Math.max(25, zoom))
}

/** Standard zoom levels available in the UI */
export const ZOOM_LEVELS = [50, 75, 100, 125, 150, 200] as const
