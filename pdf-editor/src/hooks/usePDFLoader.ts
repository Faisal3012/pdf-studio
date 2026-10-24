import { useState, useEffect } from 'react'
import { renderPDFPageToCanvas } from '@/services/pdf/pdfLoader'
import { useEditorStore } from '@/store/editorStore'

interface UsePDFPageRenderResult {
  canvas: HTMLCanvasElement | null
  loading: boolean
  error: Error | null
}

/**
 * Hook to render a single PDF page at a given zoom and rotation.
 */
export function usePDFPageRender(
  pageIndex: number,
  zoomPercent: number,
  rotation: 0 | 90 | 180 | 270 = 0
): UsePDFPageRenderResult {
  const sessionId = useEditorStore((s) => s.sessionId)
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!sessionId) {
      setCanvas(null)
      setLoading(false)
      return
    }

    let isMounted = true
    setLoading(true)
    setError(null)

    const scale = zoomPercent / 100

    renderPDFPageToCanvas(sessionId, pageIndex, scale, rotation)
      .then((renderedCanvas) => {
        if (isMounted) {
          setCanvas(renderedCanvas)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error(`[usePDFPageRender] Error rendering page ${pageIndex}:`, err)
          setError(err instanceof Error ? err : new Error(String(err)))
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [sessionId, pageIndex, zoomPercent, rotation])

  return { canvas, loading, error }
}
