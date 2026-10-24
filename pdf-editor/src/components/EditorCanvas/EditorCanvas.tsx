import { useState, useCallback } from 'react'
import { Stage, Layer, Line as KonvaLine, Rect as KonvaRect } from 'react-konva'
import { useEditorStore } from '@/store/editorStore'
import { usePDFPageRender } from '@/hooks/usePDFLoader'
import { useUndoRedo } from '@/hooks/useUndoRedo'
import { PDFPageImage } from '@/components/PDFViewer/PDFPageImage'
import { TextBox } from '@/components/Annotations/TextBox'
import { DrawPath } from '@/components/Annotations/DrawPath'
import { HighlightRect } from '@/components/Annotations/HighlightRect'
import { ShapeObject } from '@/components/Annotations/ShapeObject'
import { ImageObject } from '@/components/Annotations/ImageObject'
import { PDFTextLayerOverlay } from '@/components/EditorCanvas/PDFTextLayerOverlay'
import { Spinner } from '@/components/UI/Spinner'
import type { DrawAnnotation, HighlightAnnotation, ShapeAnnotation, TextAnnotation, Annotation } from '@/types/annotation.types'
import type { ExistingTextEdit } from '@/types/existingText.types'

const EMPTY_ANNOTATIONS: Annotation[] = []

export function EditorCanvas() {
  const currentDocument = useEditorStore((s) => s.currentDocument)
  const currentPageIndex = useEditorStore((s) => s.currentPageIndex)
  const pages = useEditorStore((s) => s.pages)
  const zoom = useEditorStore((s) => s.zoom)
  const activeTool = useEditorStore((s) => s.activeTool)
  const setActiveTool = useEditorStore((s) => s.setActiveTool)
  const selectedId = useEditorStore((s) => s.selectedAnnotationId)
  const setSelectedAnnotation = useEditorStore((s) => s.setSelectedAnnotation)
  const setSelectedExistingTextId = useEditorStore((s) => s.setSelectedExistingTextId)
  const addAnnotation = useEditorStore((s) => s.addAnnotation)
  const updateAnnotation = useEditorStore((s) => s.updateAnnotation)
  const upsertExistingTextEdit = useEditorStore((s) => s.upsertExistingTextEdit)

  const { recordCurrentState } = useUndoRedo()

  // In-progress creation state
  const [isDrawing, setIsDrawing] = useState(false)
  const [inProgressPoints, setInProgressPoints] = useState<number[]>([])
  const [inProgressRect, setInProgressRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null)

  // Dimensions
  const pageState = pages.find((p) => p.pageIndex === currentPageIndex)
  const pageMeta = currentDocument?.pageDimensions[currentPageIndex]
  const rotation = pageState?.rotation ?? 0
  const isRotated90or270 = rotation === 90 || rotation === 270

  const baseWidth = pageMeta ? (isRotated90or270 ? pageMeta.height : pageMeta.width) : 612
  const baseHeight = pageMeta ? (isRotated90or270 ? pageMeta.width : pageMeta.height) : 792

  const zoomScale = zoom / 100
  const stageWidth = baseWidth * zoomScale
  const stageHeight = baseHeight * zoomScale

  const { canvas, loading, error } = usePDFPageRender(currentPageIndex, zoom, rotation)

  const currentAnnotations = useEditorStore((s) => s.annotationsByPage[currentPageIndex]) ?? EMPTY_ANNOTATIONS

  const handleEditChange = useCallback(
    (edit: ExistingTextEdit) => {
      recordCurrentState()
      upsertExistingTextEdit(edit)
    },
    [recordCurrentState, upsertExistingTextEdit]
  )

  // Stage pointer event handlers for interactive tools
  const handleStageMouseDown = (e: any) => {
    // If clicking on empty stage background, deselect
    const clickedOnEmpty = e.target === e.target.getStage() || e.target.attrs.id === 'pdf-base-image'
    if (clickedOnEmpty) {
      if (activeTool === 'select' || activeTool === 'edit-text') {
        setSelectedAnnotation(null)
        setSelectedExistingTextId(null)
      }
      return
    }

    const stage = e.target.getStage()
    const pos = stage.getPointerPosition()
    if (!pos) return

    const pdfX = pos.x / zoomScale
    const pdfY = pos.y / zoomScale

    if (activeTool === 'text') {
      recordCurrentState()
      const newText: TextAnnotation = {
        id: `text-${Date.now()}`,
        pageIndex: currentPageIndex,
        type: 'text',
        x: pdfX,
        y: pdfY,
        width: 120,
        height: 30,
        rotation: 0,
        opacity: 1,
        locked: false,
        text: 'New Text',
        fontFamily: 'Arial',
        fontSize: 16,
        fontStyle: 'normal',
        textDecoration: '',
        fill: '#1e293b',
        align: 'left',
      }
      addAnnotation(newText)
      setSelectedAnnotation(newText.id)
      setActiveTool('select')
      return
    }

    if (activeTool === 'draw') {
      recordCurrentState()
      setIsDrawing(true)
      setInProgressPoints([pdfX, pdfY])
      return
    }

    if (activeTool === 'highlight' || activeTool === 'rect' || activeTool === 'circle' || activeTool === 'line' || activeTool === 'arrow') {
      recordCurrentState()
      setIsDrawing(true)
      setInProgressRect({ x: pdfX, y: pdfY, width: 0, height: 0 })
      return
    }
  }

  const handleStageMouseMove = (e: any) => {
    if (!isDrawing) return
    const stage = e.target.getStage()
    const pos = stage.getPointerPosition()
    if (!pos) return

    const pdfX = pos.x / zoomScale
    const pdfY = pos.y / zoomScale

    if (activeTool === 'draw') {
      setInProgressPoints((prev) => [...prev, pdfX, pdfY])
      return
    }

    if (inProgressRect) {
      setInProgressRect((prev) => ({
        ...prev!,
        width: pdfX - prev!.x,
        height: pdfY - prev!.y,
      }))
    }
  }

  const handleStageMouseUp = () => {
    if (!isDrawing) return
    setIsDrawing(false)

    if (activeTool === 'draw' && inProgressPoints.length > 2) {
      const newDraw: DrawAnnotation = {
        id: `draw-${Date.now()}`,
        pageIndex: currentPageIndex,
        type: 'draw',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        rotation: 0,
        opacity: 1,
        locked: false,
        points: inProgressPoints,
        stroke: '#1e293b',
        strokeWidth: 3,
        tension: 0.5,
        lineCap: 'round',
        globalCompositeOperation: 'source-over',
      }
      addAnnotation(newDraw)
      setInProgressPoints([])
      setActiveTool('select')
      return
    }

    if (inProgressRect && (Math.abs(inProgressRect.width) > 5 || Math.abs(inProgressRect.height) > 5)) {
      const normX = inProgressRect.width < 0 ? inProgressRect.x + inProgressRect.width : inProgressRect.x
      const normY = inProgressRect.height < 0 ? inProgressRect.y + inProgressRect.height : inProgressRect.y
      const normW = Math.abs(inProgressRect.width)
      const normH = Math.abs(inProgressRect.height)

      if (activeTool === 'highlight') {
        const newHighlight: HighlightAnnotation = {
          id: `hl-${Date.now()}`,
          pageIndex: currentPageIndex,
          type: 'highlight',
          x: normX,
          y: normY,
          width: normW,
          height: normH,
          rotation: 0,
          opacity: 0.35,
          locked: false,
          fill: '#FFD700',
        }
        addAnnotation(newHighlight)
      } else if (activeTool === 'rect' || activeTool === 'circle' || activeTool === 'line' || activeTool === 'arrow') {
        const newShape: ShapeAnnotation = {
          id: `shape-${Date.now()}`,
          pageIndex: currentPageIndex,
          type: activeTool,
          x: normX,
          y: normY,
          width: normW,
          height: normH,
          rotation: 0,
          opacity: 1,
          locked: false,
          stroke: '#2563eb',
          strokeWidth: 2,
          fill: 'transparent',
          points: [0, 0, normW, normH],
        }
        addAnnotation(newShape)
      }

      setInProgressRect(null)
      setActiveTool('select')
    }
  }

  return (
    <div className="flex-1 overflow-auto bg-[#EAE6DC] dark:bg-[#202722] flex items-center justify-center p-6 select-none relative">
      {loading && !canvas && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#EAE6DC]/60 dark:bg-[#202722]/60 backdrop-blur-xs">
          <Spinner size="lg" />
          <p className="mt-2 text-xs text-[#73776E] dark:text-[#ADB5AA] font-medium">Rendering page...</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
          <div className="bg-[#B94B45]/10 border border-[#B94B45] p-4 rounded-lg text-[#B94B45] dark:text-red-300 text-sm max-w-md text-center">
            Failed to render page: {error.message}
          </div>
        </div>
      )}

      <div
        className="shadow-xl rounded-xs transition-all duration-150 bg-white relative ring-1 ring-[#DEDCCF]/60 dark:ring-[#39443C]/40"
        style={{
          width: stageWidth,
          height: stageHeight,
        }}
      >
        <Stage
          width={stageWidth}
          height={stageHeight}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          onTouchStart={handleStageMouseDown}
          onTouchMove={handleStageMouseMove}
          onTouchEnd={handleStageMouseUp}
        >
          {/* Layer 1: Base PDF document background */}
          <Layer id="pdf-base-layer">
            {canvas && (
              <PDFPageImage
                canvas={canvas}
                width={stageWidth}
                height={stageHeight}
              />
            )}
          </Layer>

          {/* Layer 2: Annotations (Text, Drawings, Shapes, Images) */}
          <Layer id="pdf-annotations-layer">
            {currentAnnotations.map((anno) => {
              const isSelected = selectedId === anno.id

              if (anno.type === 'text') {
                return (
                  <TextBox
                    key={anno.id}
                    annotation={anno as TextAnnotation}
                    isSelected={isSelected}
                    zoomScale={zoomScale}
                    onSelect={() => setSelectedAnnotation(anno.id)}
                    onChange={(updates) => {
                      recordCurrentState()
                      updateAnnotation(anno.id, updates)
                    }}
                    onDoubleClick={() => {
                      setSelectedAnnotation(anno.id)
                    }}
                  />
                )
              }

              if (anno.type === 'draw') {
                return (
                  <DrawPath
                    key={anno.id}
                    annotation={anno as DrawAnnotation}
                    isSelected={isSelected}
                    zoomScale={zoomScale}
                    onSelect={() => setSelectedAnnotation(anno.id)}
                    onChange={(updates) => {
                      recordCurrentState()
                      updateAnnotation(anno.id, updates)
                    }}
                  />
                )
              }

              if (anno.type === 'highlight') {
                return (
                  <HighlightRect
                    key={anno.id}
                    annotation={anno as HighlightAnnotation}
                    isSelected={isSelected}
                    zoomScale={zoomScale}
                    onSelect={() => setSelectedAnnotation(anno.id)}
                    onChange={(updates) => {
                      recordCurrentState()
                      updateAnnotation(anno.id, updates)
                    }}
                  />
                )
              }

              if (['rect', 'circle', 'line', 'arrow'].includes(anno.type)) {
                return (
                  <ShapeObject
                    key={anno.id}
                    annotation={anno as ShapeAnnotation}
                    isSelected={isSelected}
                    zoomScale={zoomScale}
                    onSelect={() => setSelectedAnnotation(anno.id)}
                    onChange={(updates) => {
                      recordCurrentState()
                      updateAnnotation(anno.id, updates)
                    }}
                  />
                )
              }

              if (anno.type === 'image' || anno.type === 'signature') {
                return (
                  <ImageObject
                    key={anno.id}
                    annotation={anno as any}
                    isSelected={isSelected}
                    zoomScale={zoomScale}
                    onSelect={() => setSelectedAnnotation(anno.id)}
                    onChange={(updates) => {
                      recordCurrentState()
                      updateAnnotation(anno.id, updates)
                    }}
                  />
                )
              }

              return null
            })}
          </Layer>

          {/* Layer 3: In-progress Drawing / Shape preview */}
          <Layer id="pdf-interactive-layer">
            {isDrawing && activeTool === 'draw' && inProgressPoints.length > 2 && (
              <KonvaLine
                points={inProgressPoints.map((p) => p * zoomScale)}
                stroke="#1e293b"
                strokeWidth={3 * zoomScale}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
              />
            )}

            {isDrawing && inProgressRect && (
              <KonvaRect
                x={inProgressRect.x * zoomScale}
                y={inProgressRect.y * zoomScale}
                width={inProgressRect.width * zoomScale}
                height={inProgressRect.height * zoomScale}
                stroke="#2563eb"
                strokeWidth={1.5}
                dash={[4, 4]}
                fill={activeTool === 'highlight' ? 'rgba(255, 215, 0, 0.3)' : 'transparent'}
              />
            )}
          </Layer>
        </Stage>

        {/* Layer 4: Interactive PDF Text Overlay (Selection & in-place editing of original text) */}
        <PDFTextLayerOverlay
          pageIndex={currentPageIndex}
          zoomScale={zoomScale}
          pageWidth={baseWidth}
          pageHeight={baseHeight}
          canvas={canvas}
          onEditChange={handleEditChange}
        />
      </div>
    </div>
  )
}
