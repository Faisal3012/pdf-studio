import { useRef } from 'react'
import { Line as KonvaLine } from 'react-konva'
import type { DrawAnnotation } from '@/types/annotation.types'

interface DrawPathProps {
  annotation: DrawAnnotation
  isSelected: boolean
  zoomScale: number
  onSelect: () => void
  onChange?: (updates: Partial<DrawAnnotation>) => void
}

export function DrawPath({
  annotation,
  isSelected,
  zoomScale,
  onSelect,
  onChange,
}: DrawPathProps) {
  const shapeRef = useRef<any>(null)

  // Scale raw points from PDF space to Canvas space
  const scaledPoints = annotation.points.map((pt) => pt * zoomScale)

  return (
    <KonvaLine
      ref={shapeRef}
      x={annotation.x * zoomScale}
      y={annotation.y * zoomScale}
      points={scaledPoints}
      stroke={annotation.stroke || '#1e293b'}
      strokeWidth={(annotation.strokeWidth || 3) * zoomScale}
      tension={annotation.tension ?? 0.5}
      lineCap={annotation.lineCap ?? 'round'}
      lineJoin="round"
      globalCompositeOperation={
        (annotation.globalCompositeOperation as GlobalCompositeOperation) || 'source-over'
      }
      opacity={annotation.opacity ?? 1}
      draggable={isSelected && !annotation.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onChange?.({
          x: e.target.x() / zoomScale,
          y: e.target.y() / zoomScale,
        })
      }}
    />
  )
}
