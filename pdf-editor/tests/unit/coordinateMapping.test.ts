import { describe, it, expect } from 'vitest'
import {
  pdfToCanvas,
  canvasToPdf,
  pdfRectToCanvas,
  canvasRectToPdf,
  clampZoom,
  ZOOM_LEVELS,
} from '@/utils/coordinateMapping'

describe('coordinateMapping', () => {
  describe('pdfToCanvas', () => {
    it('scales a point by zoom factor', () => {
      expect(pdfToCanvas({ x: 100, y: 200 }, 1.5)).toEqual({ x: 150, y: 300 })
    })

    it('returns same coords at zoom 1.0', () => {
      expect(pdfToCanvas({ x: 50, y: 75 }, 1.0)).toEqual({ x: 50, y: 75 })
    })

    it('handles zoom 0.5 correctly', () => {
      expect(pdfToCanvas({ x: 200, y: 400 }, 0.5)).toEqual({ x: 100, y: 200 })
    })
  })

  describe('canvasToPdf', () => {
    it('divides by zoom factor', () => {
      expect(canvasToPdf({ x: 150, y: 300 }, 1.5)).toEqual({ x: 100, y: 200 })
    })

    it('is the inverse of pdfToCanvas (round-trip)', () => {
      const original = { x: 123, y: 456 }
      const zoom = 1.25
      const roundTripped = canvasToPdf(pdfToCanvas(original, zoom), zoom)
      expect(roundTripped.x).toBeCloseTo(original.x, 10)
      expect(roundTripped.y).toBeCloseTo(original.y, 10)
    })
  })

  describe('pdfRectToCanvas', () => {
    it('scales all rect dimensions by zoom', () => {
      const result = pdfRectToCanvas({ x: 10, y: 20, width: 100, height: 50 }, 2)
      expect(result).toEqual({ x: 20, y: 40, width: 200, height: 100 })
    })
  })

  describe('canvasRectToPdf', () => {
    it('is the inverse of pdfRectToCanvas', () => {
      const original = { x: 10, y: 20, width: 100, height: 50 }
      const zoom = 1.5
      const result = canvasRectToPdf(pdfRectToCanvas(original, zoom), zoom)
      expect(result.x).toBeCloseTo(original.x, 10)
      expect(result.y).toBeCloseTo(original.y, 10)
      expect(result.width).toBeCloseTo(original.width, 10)
      expect(result.height).toBeCloseTo(original.height, 10)
    })
  })

  describe('clampZoom', () => {
    it('clamps below minimum to 25', () => {
      expect(clampZoom(10)).toBe(25)
      expect(clampZoom(0)).toBe(25)
    })

    it('clamps above maximum to 200', () => {
      expect(clampZoom(300)).toBe(200)
      expect(clampZoom(201)).toBe(200)
    })

    it('passes through values within range', () => {
      expect(clampZoom(100)).toBe(100)
      expect(clampZoom(50)).toBe(50)
      expect(clampZoom(200)).toBe(200)
      expect(clampZoom(25)).toBe(25)
    })
  })

  describe('ZOOM_LEVELS', () => {
    it('contains expected zoom levels', () => {
      expect(ZOOM_LEVELS).toContain(50)
      expect(ZOOM_LEVELS).toContain(100)
      expect(ZOOM_LEVELS).toContain(200)
    })

    it('is sorted ascending', () => {
      const sorted = [...ZOOM_LEVELS].sort((a, b) => a - b)
      expect([...ZOOM_LEVELS]).toEqual(sorted)
    })
  })
})
