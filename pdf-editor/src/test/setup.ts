import '@testing-library/jest-dom'

// Mock matchMedia (not available in jsdom)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// Mock ResizeObserver — semicolon before IIFE to prevent ASI issue
;(globalThis as Record<string, unknown>).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock IndexedDB (basic stub — configurable so tests can override it)
const idbStub = {
  open: () => ({ result: {}, onsuccess: null, onerror: null }),
}
Object.defineProperty(window, 'indexedDB', {
  writable: true,
  configurable: true,
  value: idbStub,
})
