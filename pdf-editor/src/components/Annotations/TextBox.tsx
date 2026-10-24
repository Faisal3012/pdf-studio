import { useRef, useEffect } from 'react'
import { Text as KonvaText, Transformer } from 'react-konva'
import type Konva from 'konva'
import type { TextAnnotation } from '@/types/annotation.types'

interface TextBoxProps {
  annotation: TextAnnotation
  isSelected: boolean
  zoomScale: number
  onSelect: () => void
  onChange: (updates: Partial<TextAnnotation>) => void
  onDoubleClick: () => void
}

export function TextBox({
  annotation,
  isSelected,
  zoomScale,
  onSelect,
  onChange,
  onDoubleClick,
}: TextBoxProps) {
  const shapeRef = useRef<Konva.Text>(null)
  const trRef = useRef<Konva.Transformer>(null)

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected])

  return (
    <>
      <KonvaText
        ref={shapeRef}
        x={annotation.x * zoomScale}
        y={annotation.y * zoomScale}
        text={annotation.text || 'Double-click to edit'}
        fontSize={annotation.fontSize * zoomScale}
        fontFamily={annotation.fontFamily || 'Arial'}
        fontStyle={annotation.fontStyle || 'normal'}
        textDecoration={annotation.textDecoration || ''}
        fill={annotation.fill || '#1e293b'}
        align={annotation.align || 'left'}
        opacity={annotation.opacity ?? 1}
        rotation={annotation.rotation || 0}
        draggable={isSelected && !annotation.locked}
        onClick={onSelect}
        onTap={onSelect}
        onDblClick={onDoubleClick}
        onDblTap={onDoubleClick}
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
          node.scaleX(1)
          node.scaleY(1)
          onChange({
            x: node.x() / zoomScale,
            y: node.y() / zoomScale,
            rotation: node.rotation(),
            fontSize: Math.max(8, Math.round(annotation.fontSize * scaleX)),
          })
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 20 || newBox.height < 10) return oldBox
            return newBox
          }}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
        />
      )}
    </>
  )
}
