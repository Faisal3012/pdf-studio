import { useRef, useEffect } from 'react'
import { Rect as KonvaRect, Transformer } from 'react-konva'
import type Konva from 'konva'
import type { HighlightAnnotation } from '@/types/annotation.types'

interface HighlightRectProps {
  annotation: HighlightAnnotation
  isSelected: boolean
  zoomScale: number
  onSelect: () => void
  onChange: (updates: Partial<HighlightAnnotation>) => void
}

export function HighlightRect({
  annotation,
  isSelected,
  zoomScale,
  onSelect,
  onChange,
}: HighlightRectProps) {
  const shapeRef = useRef<Konva.Rect>(null)
  const trRef = useRef<Konva.Transformer>(null)

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected])

  return (
    <>
      <KonvaRect
        ref={shapeRef}
        x={annotation.x * zoomScale}
        y={annotation.y * zoomScale}
        width={annotation.width * zoomScale}
        height={annotation.height * zoomScale}
        fill={annotation.fill || '#FFD700'}
        opacity={annotation.opacity ?? 0.35}
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
            width: Math.max(5, (node.width() * scaleX) / zoomScale),
            height: Math.max(5, (node.height() * scaleY) / zoomScale),
            rotation: node.rotation(),
          })
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) return oldBox
            return newBox
          }}
        />
      )}
    </>
  )
}
