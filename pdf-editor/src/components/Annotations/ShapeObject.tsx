import { useRef, useEffect } from 'react'
import {
  Rect as KonvaRect,
  Circle as KonvaCircle,
  Line as KonvaLine,
  Arrow as KonvaArrow,
  Transformer,
} from 'react-konva'
import type Konva from 'konva'
import type { ShapeAnnotation } from '@/types/annotation.types'

interface ShapeObjectProps {
  annotation: ShapeAnnotation
  isSelected: boolean
  zoomScale: number
  onSelect: () => void
  onChange: (updates: Partial<ShapeAnnotation>) => void
}

export function ShapeObject({
  annotation,
  isSelected,
  zoomScale,
  onSelect,
  onChange,
}: ShapeObjectProps) {
  const shapeRef = useRef<any>(null)
  const trRef = useRef<Konva.Transformer>(null)

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected])

  const commonProps = {
    ref: shapeRef,
    x: annotation.x * zoomScale,
    y: annotation.y * zoomScale,
    stroke: annotation.stroke || '#2563eb',
    strokeWidth: (annotation.strokeWidth || 2) * zoomScale,
    fill: annotation.fill || 'transparent',
    opacity: annotation.opacity ?? 1,
    rotation: annotation.rotation || 0,
    draggable: isSelected && !annotation.locked,
    onClick: onSelect,
    onTap: onSelect,
    onDragEnd: (e: any) => {
      onChange({
        x: e.target.x() / zoomScale,
        y: e.target.y() / zoomScale,
      })
    },
    onTransformEnd: () => {
      const node = shapeRef.current
      if (!node) return
      const scaleX = node.scaleX()
      const scaleY = node.scaleY()
      node.scaleX(1)
      node.scaleY(1)
      onChange({
        x: node.x() / zoomScale,
        y: node.y() / zoomScale,
        width: Math.max(5, (annotation.width * scaleX)),
        height: Math.max(5, (annotation.height * scaleY)),
        rotation: node.rotation(),
      })
    },
  }

  return (
    <>
      {annotation.type === 'rect' && (
        <KonvaRect
          {...commonProps}
          width={annotation.width * zoomScale}
          height={annotation.height * zoomScale}
          cornerRadius={2}
        />
      )}

      {annotation.type === 'circle' && (
        <KonvaCircle
          {...commonProps}
          radius={(annotation.width / 2) * zoomScale}
          // Center circle relative to (x, y)
          offsetX={(-annotation.width / 2) * zoomScale}
          offsetY={(-annotation.height / 2) * zoomScale}
        />
      )}

      {annotation.type === 'line' && (
        <KonvaLine
          {...commonProps}
          points={
            annotation.points
              ? annotation.points.map((p) => p * zoomScale)
              : [0, 0, annotation.width * zoomScale, annotation.height * zoomScale]
          }
          lineCap="round"
        />
      )}

      {annotation.type === 'arrow' && (
        <KonvaArrow
          {...commonProps}
          points={
            annotation.points
              ? annotation.points.map((p) => p * zoomScale)
              : [0, 0, annotation.width * zoomScale, annotation.height * zoomScale]
          }
          pointerLength={10 * zoomScale}
          pointerWidth={8 * zoomScale}
          fill={annotation.stroke || '#2563eb'}
        />
      )}

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
