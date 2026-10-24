import { useRef, useEffect, useState } from 'react'
import { Image as KonvaImage, Transformer } from 'react-konva'
import type Konva from 'konva'
import type { ImageAnnotation } from '@/types/annotation.types'

interface ImageObjectProps {
  annotation: ImageAnnotation
  isSelected: boolean
  zoomScale: number
  onSelect: () => void
  onChange: (updates: Partial<ImageAnnotation>) => void
}

export function ImageObject({
  annotation,
  isSelected,
  zoomScale,
  onSelect,
  onChange,
}: ImageObjectProps) {
  const shapeRef = useRef<Konva.Image>(null)
  const trRef = useRef<Konva.Transformer>(null)
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    // imageDbKey holds data URL in memory or IndexedDB lookup
    if (annotation.imageDbKey) {
      const img = new window.Image()
      img.src = annotation.imageDbKey
      img.onload = () => setImgElement(img)
    }
  }, [annotation.imageDbKey])

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected, imgElement])

  if (!imgElement) return null

  return (
    <>
      <KonvaImage
        ref={shapeRef}
        image={imgElement}
        x={annotation.x * zoomScale}
        y={annotation.y * zoomScale}
        width={annotation.width * zoomScale}
        height={annotation.height * zoomScale}
        opacity={annotation.opacity ?? 1}
        rotation={annotation.rotation || 0}
        draggable={isSelected && !annotation.locked}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onChange({
            x: e.target.x() / zoomScale,
            y: e.target.y() / zoomScale,
          })
        }}
        onTransformEnd={() => {
          const node = shapeRef.current
          if (!node) return
          const scaleX = node.scaleX()
          const scaleY = node.scaleY()
          node.scaleX(1)
          node.scaleY(1)
          onChange({
            x: node.x() / zoomScale,
            y: node.y() / zoomScale,
            width: Math.max(10, (node.width() * scaleX) / zoomScale),
            height: Math.max(10, (node.height() * scaleY) / zoomScale),
            rotation: node.rotation(),
          })
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 10 || newBox.height < 10) return oldBox
            return newBox
          }}
        />
      )}
    </>
  )
}
