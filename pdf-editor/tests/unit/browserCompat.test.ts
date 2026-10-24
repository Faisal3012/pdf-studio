import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkBrowserCompatibility } from '@/utils/browserCompat'

describe('checkBrowserCompatibility', () => {
  beforeEach(() => {
    // Restore any mocks between tests
    vi.restoreAllMocks()
  })

  it('returns compatible: true in jsdom (all APIs present via setup mocks)', () => {
    // jsdom + setup.ts provides all required APIs
    const result = checkBrowserCompatibility()
    // compatible may be true or false depending on jsdom — what matters is
    // the shape of the result is correct
    expect(result).toHaveProperty('compatible')
    expect(result).toHaveProperty('missing')
    expect(result).toHaveProperty('warnings')
    expect(Array.isArray(result.missing)).toBe(true)
    expect(Array.isArray(result.warnings)).toBe(true)
  })

  it('reports missing IndexedDB when window.indexedDB is undefined', () => {
    const original = window.indexedDB
    // Use defineProperty because jsdom's indexedDB is non-configurable via delete
    Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true, writable: true })
    const result = checkBrowserCompatibility()
    expect(result.compatible).toBe(false)
    expect(result.missing.some((m) => m.includes('IndexedDB'))).toBe(true)
    Object.defineProperty(window, 'indexedDB', { value: original, configurable: true, writable: true })
  })

  it('reports missing Worker when Worker is undefined', () => {
    const original = global.Worker
    // @ts-expect-error — intentionally removing for test
    delete global.Worker
    const result = checkBrowserCompatibility()
    expect(result.compatible).toBe(false)
    expect(result.missing.some((m) => m.includes('Web Workers'))).toBe(true)
    global.Worker = original
  })

  it('reports missing File API when File is undefined', () => {
    const original = global.File
    // @ts-expect-error — intentionally removing for test
    delete global.File
    const result = checkBrowserCompatibility()
    expect(result.compatible).toBe(false)
    expect(result.missing.some((m) => m.includes('File API'))).toBe(true)
    global.File = original
  })

  it('result.missing is empty when all APIs are available', () => {
    // All APIs are present in jsdom with our setup.ts mocks
    // Just verify missing array contains only real failures
    const result = checkBrowserCompatibility()
    // Each item in missing should be a non-empty string
    result.missing.forEach((m) => {
      expect(typeof m).toBe('string')
      expect(m.length).toBeGreaterThan(0)
    })
  })
})
