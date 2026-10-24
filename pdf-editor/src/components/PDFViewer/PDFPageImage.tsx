import { useEffect, useRef } from 'react'
import { Image as KonvaImage } from 'react-konva'

interface PDFPageImageProps {
  canvas: HTMLCanvasElement | null
  width: number
  height: number
}

/**
 * Renders the rendered PDF canvas into a Konva Image component.
 */
export function PDFPageImage({ canvas, width, height }: PDFPageImageProps) {
  const imageRef = useRef<any>(null)

  useEffect(() => {
    if (imageRef.current && canvas) {
      imageRef.current.getLayer()?.batchDraw()
    }
  }, [canvas])

  if (!canvas) return null

  return (
    <KonvaImage
      ref={imageRef}
      image={canvas}
      x={0}
      y={0}
      width={width}
      height={height}
      listening={false}
    />
  )
}
