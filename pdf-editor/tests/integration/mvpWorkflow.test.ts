import { describe, it, expect, beforeEach } from 'vitest'
import { useEditorStore } from '@/store/editorStore'
import { useHistoryStore } from '@/store/historyStore'
import type { TextAnnotation, DrawAnnotation, ShapeAnnotation, HighlightAnnotation } from '@/types/annotation.types'

describe('Core MVP Integration Workflow', () => {
  beforeEach(() => {
    useEditorStore.getState().clearDocument()
    useHistoryStore.getState().clearHistory()
  })

  it('handles full lifecycle: load document, navigate pages, add annotations, undo and redo', () => {
    const editor = useEditorStore.getState()

    // 1. Load document
    editor.setDocument(
      {
        filename: 'contract.pdf',
        pageCount: 3,
        pageDimensions: [
          { pageIndex: 0, width: 612, height: 792 },
          { pageIndex: 1, width: 612, height: 792 },
          { pageIndex: 2, width: 612, height: 792 },
        ],
        fileSize: 1048576,
      },
      'session-test-123'
    )

    const stateAfterLoad = useEditorStore.getState()
    expect(stateAfterLoad.currentDocument?.filename).toBe('contract.pdf')
    expect(stateAfterLoad.pages).toHaveLength(3)
    expect(stateAfterLoad.currentPageIndex).toBe(0)
    expect(stateAfterLoad.zoom).toBe(100)

    // 2. Navigate and rotate page
    useEditorStore.getState().setCurrentPage(1)
    expect(useEditorStore.getState().currentPageIndex).toBe(1)

    useEditorStore.getState().rotatePage(1, 90)
    expect(useEditorStore.getState().pages[1].rotation).toBe(90)
    expect(useEditorStore.getState().hasUnsavedChanges).toBe(true)

    // 3. Add Text Annotation on Page 1
    const textAnno: TextAnnotation = {
      id: 'txt-1',
      pageIndex: 1,
      type: 'text',
      x: 100,
      y: 150,
      width: 120,
      height: 30,
      rotation: 0,
      opacity: 1,
      locked: false,
      text: 'Approved by Fais',
      fontFamily: 'Arial',
      fontSize: 16,
      fontStyle: 'bold',
      textDecoration: '',
      fill: '#1e293b',
      align: 'left',
    }
    useEditorStore.getState().addAnnotation(textAnno)

    expect(useEditorStore.getState().annotationsByPage[1]).toHaveLength(1)
    expect(useEditorStore.getState().annotationsByPage[1][0].id).toBe('txt-1')

    // 4. Add Drawing annotation on Page 1
    const drawAnno: DrawAnnotation = {
      id: 'draw-1',
      pageIndex: 1,
      type: 'draw',
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      rotation: 0,
      opacity: 1,
      locked: false,
      points: [100, 200, 105, 205, 110, 210],
      stroke: '#2563eb',
      strokeWidth: 3,
      tension: 0.5,
      lineCap: 'round',
      globalCompositeOperation: 'source-over',
    }
    useEditorStore.getState().addAnnotation(drawAnno)
    expect(useEditorStore.getState().annotationsByPage[1]).toHaveLength(2)

    // 5. Add Shape (Rectangle) and Highlight
    const rectAnno: ShapeAnnotation = {
      id: 'rect-1',
      pageIndex: 1,
      type: 'rect',
      x: 50,
      y: 50,
      width: 200,
      height: 100,
      rotation: 0,
      opacity: 1,
      locked: false,
      stroke: '#dc2626',
      strokeWidth: 2,
      fill: 'transparent',
    }
    const highlightAnno: HighlightAnnotation = {
      id: 'hl-1',
      pageIndex: 1,
      type: 'highlight',
      x: 60,
      y: 60,
      width: 180,
      height: 20,
      rotation: 0,
      opacity: 0.4,
      locked: false,
      fill: '#FFD700',
    }
    useEditorStore.getState().addAnnotation(rectAnno)
    useEditorStore.getState().addAnnotation(highlightAnno)
    expect(useEditorStore.getState().annotationsByPage[1]).toHaveLength(4)

    // 6. Update text annotation
    useEditorStore.getState().updateAnnotation('txt-1', {
      text: 'Final Approval',
      fontSize: 18,
    })
    const updated = useEditorStore.getState().annotationsByPage[1].find((a) => a.id === 'txt-1') as TextAnnotation
    expect(updated.text).toBe('Final Approval')
    expect(updated.fontSize).toBe(18)

    // 7. Delete an annotation
    useEditorStore.getState().removeAnnotation('hl-1')
    expect(useEditorStore.getState().annotationsByPage[1]).toHaveLength(3)
    expect(useEditorStore.getState().annotationsByPage[1].some((a) => a.id === 'hl-1')).toBe(false)

    // 8. Zoom control
    useEditorStore.getState().setZoom(125)
    expect(useEditorStore.getState().zoom).toBe(125)

    // 9. Page reorder & deletion
    useEditorStore.getState().reorderPages([1, 0, 2])
    expect(useEditorStore.getState().pages[1].order).toBe(0)
    expect(useEditorStore.getState().pages[0].order).toBe(1)

    useEditorStore.getState().deletePage(2)
    expect(useEditorStore.getState().pages[2].deleted).toBe(true)
  })
})
