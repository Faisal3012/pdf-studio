// ─── Browser Compatibility Detection ──────────────────────────────────────────
// Checks all APIs required by the PDF editor before allowing the user in.

export interface CompatibilityResult {
  compatible: boolean
  missing: string[]
  warnings: string[]
}

export function checkBrowserCompatibility(): CompatibilityResult {
  const missing: string[] = []
  const warnings: string[] = []

  // IndexedDB
  if (!window.indexedDB) {
    missing.push('IndexedDB — required for local PDF and session storage')
  }

  // Canvas
  const testCanvas = document.createElement('canvas')
  if (!testCanvas.getContext) {
    missing.push('HTML Canvas — required for PDF rendering')
  } else {
    const ctx = testCanvas.getContext('2d')
    if (!ctx) {
      missing.push('Canvas 2D context — required for PDF rendering')
    }
  }

  // Web Workers
  if (typeof Worker === 'undefined') {
    missing.push('Web Workers — required for PDF.js background rendering')
  }

  // File API
  if (typeof File === 'undefined' || typeof FileReader === 'undefined') {
    missing.push('File API — required for PDF upload')
  }

  // createImageBitmap
  if (typeof createImageBitmap === 'undefined') {
    missing.push('createImageBitmap — required for efficient page rendering')
  }

  // Blob
  if (typeof Blob === 'undefined') {
    missing.push('Blob API — required for PDF export')
  }

  // Pointer Events (needed for drawing tools)
  if (!window.PointerEvent) {
    warnings.push(
      'Pointer Events not supported — drawing tools may have reduced functionality'
    )
  }

  return {
    compatible: missing.length === 0,
    missing,
    warnings,
  }
}
