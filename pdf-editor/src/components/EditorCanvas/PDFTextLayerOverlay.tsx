import React, { useState, useEffect, useRef } from 'react'
import { useEditorStore } from '@/store/editorStore'
import { extractPageTextItems, detectScannedPage, sampleBackgroundColorFromCanvas } from '@/services/pdf/pdfTextExtractor'
import { recognizeScannedPage, getCachedOcrItems } from '@/services/ocr/ocrService'
import { TextFormattingToolbar } from './TextFormattingToolbar'
import type { PDFExtractedTextItem, ExistingTextEdit } from '@/types/existingText.types'

interface PDFTextLayerOverlayProps {
  pageIndex: number
  zoomScale: number
  pageWidth: number
  pageHeight: number
  canvas?: HTMLCanvasElement | null
  onEditChange: (edit: ExistingTextEdit) => void
}

const EMPTY_EDITS: ExistingTextEdit[] = []

export const PDFTextLayerOverlay: React.FC<PDFTextLayerOverlayProps> = ({
  pageIndex,
  zoomScale,
  pageWidth,
  pageHeight,
  canvas,
  onEditChange,
}) => {
  const sessionId = useEditorStore((s) => s.sessionId)
  const activeTool = useEditorStore((s) => s.activeTool)
  const existingEdits = useEditorStore((s) => s.existingTextEditsByPage[pageIndex]) ?? EMPTY_EDITS
  const selectedTextId = useEditorStore((s) => s.selectedExistingTextId)
  const setSelectedTextId = useEditorStore((s) => s.setSelectedExistingTextId)
  const removeExistingTextEdit = useEditorStore((s) => s.removeExistingTextEdit)

  const [textItems, setTextItems] = useState<PDFExtractedTextItem[]>([])
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [isScanned, setIsScanned] = useState(false)
  const [scannedMessage, setScannedMessage] = useState<string | null>(null)

  // OCR state
  const [isOcrRunning, setIsOcrRunning] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrStatusMessage, setOcrStatusMessage] = useState('')
  const [ocrDoneCount, setOcrDoneCount] = useState<number | null>(null)
  const ocrAbortControllerRef = useRef<AbortController | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  // Load extracted text items or cached OCR items for this page
  useEffect(() => {
    if (!sessionId) return
    let mounted = true

    // Check if we already have OCR cached for this page
    const cachedOcr = getCachedOcrItems(sessionId, pageIndex)
    if (cachedOcr && cachedOcr.length > 0) {
      setTextItems(cachedOcr)
      setIsScanned(false)
      setOcrDoneCount(cachedOcr.length)
      return
    }

    // Check scanned status and extract native text
    Promise.all([
      detectScannedPage(sessionId, pageIndex),
      extractPageTextItems(sessionId, pageIndex, pageHeight),
    ])
      .then(([scannedRes, items]) => {
        if (!mounted) return
        if (scannedRes.isScanned) {
          setIsScanned(true)
          setScannedMessage(
            scannedRes.reason ||
              'Scanned document detected. OCR text recognition is available to make this page editable.'
          )
        } else {
          setIsScanned(false)
          setScannedMessage(null)
        }
        setTextItems(items)
      })
      .catch((err) => {
        if (!mounted) return
        console.error('Failed to extract PDF text items:', err)
      })

    return () => {
      mounted = false
    }
  }, [sessionId, pageIndex, pageHeight])

  // Sample background colors from rendered canvas
  useEffect(() => {
    if (!canvas || textItems.length === 0) return
    let updated = false
    const newItems = textItems.map((item) => {
      if (!item.backgroundColor || item.backgroundColor === '#ffffff') {
        const sampled = sampleBackgroundColorFromCanvas(canvas, item.viewX, item.viewY, zoomScale)
        if (sampled !== item.backgroundColor) {
          updated = true
          return { ...item, backgroundColor: sampled }
        }
      }
      return item
    })
    if (updated) {
      setTextItems(newItems)
    }
  }, [canvas, zoomScale, textItems])

  // Focus input when editing starts
  useEffect(() => {
    if (editingItemId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingItemId])

  // Map of existing edits by target item ID
  const editsMap = new Map<string, ExistingTextEdit>()
  existingEdits.forEach((e) => editsMap.set(e.id, e))

  const activeItem = textItems.find((it) => it.id === (editingItemId || selectedTextId))
  const activeEdit = activeItem ? editsMap.get(activeItem.id) : undefined

  const handleStartEditing = (item: PDFExtractedTextItem) => {
    const edit = editsMap.get(item.id)
    setEditingItemId(item.id)
    setEditValue(edit ? edit.replacementText : item.text)
    setSelectedTextId(item.id)
  }

  const handleFinishEditing = (item: PDFExtractedTextItem) => {
    if (editingItemId !== item.id) return
    const trimmed = editValue

    const existing = editsMap.get(item.id)
    const newEdit: ExistingTextEdit = {
      id: item.id,
      pageIndex: item.pageIndex,
      originalText: item.text,
      replacementText: trimmed,
      pdfX: item.pdfX,
      pdfY: item.pdfY,
      viewX: item.viewX,
      viewY: item.viewY,
      width: item.width,
      height: item.height,
      fontSize: existing?.fontSize || item.fontSize,
      fontFamily: existing?.fontFamily || item.fontFamily,
      fontName: existing?.fontName || item.fontName,
      isBold: existing?.isBold ?? item.isBold,
      isItalic: existing?.isItalic ?? item.isItalic,
      color: existing?.color || item.color,
      backgroundColor: existing?.backgroundColor || item.backgroundColor,
      rotation: item.rotation,
      transform: item.transform,
      isScannedFallback: item.isOcr || existing?.isScannedFallback,
      adjustedFontSize: existing?.adjustedFontSize,
    }

    onEditChange(newEdit)
    setEditingItemId(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent, item: PDFExtractedTextItem) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleFinishEditing(item)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setEditingItemId(null)
      setSelectedTextId(null)
    }
  }

  const handleToolbarUpdate = (updates: Partial<ExistingTextEdit>) => {
    if (!activeItem) return
    const existing = editsMap.get(activeItem.id)
    const updatedEdit: ExistingTextEdit = {
      id: activeItem.id,
      pageIndex: activeItem.pageIndex,
      originalText: activeItem.text,
      replacementText: editingItemId === activeItem.id ? editValue : (existing ? existing.replacementText : activeItem.text),
      pdfX: activeItem.pdfX,
      pdfY: activeItem.pdfY,
      viewX: activeItem.viewX,
      viewY: activeItem.viewY,
      width: activeItem.width,
      height: activeItem.height,
      fontSize: activeItem.fontSize,
      fontFamily: activeItem.fontFamily,
      fontName: activeItem.fontName,
      isBold: activeItem.isBold,
      isItalic: activeItem.isItalic,
      color: activeItem.color,
      backgroundColor: activeItem.backgroundColor,
      rotation: activeItem.rotation,
      transform: activeItem.transform,
      isScannedFallback: activeItem.isOcr,
      ...existing,
      ...updates,
    }
    onEditChange(updatedEdit)
  }

  // OCR Recognition Handler
  const handleRunOcr = async () => {
    if (!sessionId) return
    if (!canvas) {
      alert('Page canvas is still rendering. Please wait a moment and try again.')
      return
    }

    setIsOcrRunning(true)
    setOcrProgress(5)
    setOcrStatusMessage('Initializing OCR...')
    const controller = new AbortController()
    ocrAbortControllerRef.current = controller

    try {
      const ocrItems = await recognizeScannedPage(
        sessionId,
        pageIndex,
        canvas,
        pageWidth,
        pageHeight,
        (pct, msg) => {
          setOcrProgress(pct)
          setOcrStatusMessage(msg)
        },
        controller.signal
      )

      setTextItems(ocrItems)
      setIsScanned(false)
      setOcrDoneCount(ocrItems.length)
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setOcrStatusMessage('OCR cancelled')
      } else {
        console.error('OCR failed:', err)
        setOcrStatusMessage('OCR recognition failed. Please try again.')
      }
    } finally {
      setIsOcrRunning(false)
      ocrAbortControllerRef.current = null
    }
  }

  const handleCancelOcr = () => {
    if (ocrAbortControllerRef.current) {
      ocrAbortControllerRef.current.abort()
    }
  }

  const isInteractive = activeTool === 'edit-text' || activeTool === 'select'

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none"
      style={{
        width: pageWidth * zoomScale,
        height: pageHeight * zoomScale,
      }}
    >
      {/* Scanned page notification & OCR action banner */}
      {isScanned && (
        <div className="absolute top-2 left-2 right-2 pointer-events-auto bg-[#FFFEFA] dark:bg-[#262E29] border border-[#B77C30]/50 rounded-lg shadow-lg p-3 z-50 flex items-center justify-between gap-3 backdrop-blur-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-base">📄</span>
            <div>
              <p className="text-xs font-semibold text-[#202820] dark:text-[#F0F0E8]">
                Scanned Page Detected
              </p>
              <p className="text-[11px] text-[#73776E] dark:text-[#ADB5AA]">
                {scannedMessage || 'This page has no selectable native text. Run OCR to make it editable.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isOcrRunning ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#73776E] dark:text-[#ADB5AA]">{ocrStatusMessage || `${ocrProgress}%`}</span>
                <div className="w-20 h-2 bg-[#EAE6DC] dark:bg-[#202722] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#23483B] dark:bg-[#A7C4AD] transition-all duration-200"
                    style={{ width: `${ocrProgress}%` }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCancelOcr}
                  className="text-xs text-[#B94B45] hover:underline ml-1"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleRunOcr}
                className="px-3 py-1.5 bg-[#23483B] hover:bg-[#19392F] dark:bg-[#A7C4AD] dark:hover:bg-[#C2D8C6] text-[#FFFEFA] dark:text-[#171C19] text-xs font-semibold rounded-md shadow-xs transition flex items-center gap-1.5"
              >
                <span>🔍</span>
                <span>Recognize Text (OCR)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* OCR success status */}
      {ocrDoneCount !== null && (
        <div className="absolute top-2 right-2 pointer-events-auto bg-[#E5EDE6] dark:bg-[#202722] border border-[#23483B]/30 text-[#23483B] dark:text-[#A7C4AD] text-xs px-2.5 py-1 rounded shadow-md z-40 flex items-center gap-1.5">
          <span>✓</span>
          <span>OCR Active: {ocrDoneCount} editable items</span>
          <button
            type="button"
            onClick={() => setOcrDoneCount(null)}
            className="text-[10px] ml-1 opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Floating Contextual Formatting Toolbar */}
      {activeItem && isInteractive && (
        <TextFormattingToolbar
          item={activeItem}
          edit={activeEdit}
          position={{
            top: activeItem.viewY * zoomScale,
            left: activeItem.viewX * zoomScale,
          }}
          onUpdate={handleToolbarUpdate}
          onCommit={() => handleFinishEditing(activeItem)}
          onCancel={() => {
            setEditingItemId(null)
            setSelectedTextId(null)
          }}
          onRevert={() => {
            removeExistingTextEdit(activeItem.id)
            setEditingItemId(null)
            setSelectedTextId(null)
          }}
        />
      )}

      {/* Render text bounds and in-place editors */}
      {textItems.map((item) => {
        const edit = editsMap.get(item.id)
        const displayText = edit ? edit.replacementText : item.text
        const isSelected = selectedTextId === item.id
        const isEditing = editingItemId === item.id

        // Scale coordinates to viewport pixels
        const left = item.viewX * zoomScale
        const top = item.viewY * zoomScale
        const itemWidth = Math.max(item.width * zoomScale, 18)
        const itemHeight = Math.max(item.height * zoomScale, 12)
        const fontSizePx = Math.round((edit?.adjustedFontSize || edit?.fontSize || item.fontSize) * zoomScale)

        const fontFamilyCSS =
          (edit?.fontFamily || item.fontFamily) === 'Courier'
            ? 'monospace'
            : (edit?.fontFamily || item.fontFamily) === 'Times-Roman'
            ? 'serif'
            : 'sans-serif'
        const fontWeightCSS = (edit?.isBold ?? item.isBold) ? 'bold' : 'normal'
        const fontStyleCSS = (edit?.isItalic ?? item.isItalic) ? 'italic' : 'normal'
        const textColorCSS = edit?.color || (item.color !== 'transparent' ? item.color : '#202820')
        const bgColorCSS = edit?.backgroundColor || item.backgroundColor || '#ffffff'

        return (
          <div
            key={item.id}
            data-testid={`existing-text-${item.id}`}
            style={{
              position: 'absolute',
              left: `${left}px`,
              top: `${top}px`,
              minWidth: `${itemWidth}px`,
              height: `${itemHeight}px`,
              transform: item.rotation ? `rotate(${item.rotation}deg)` : undefined,
              transformOrigin: 'top left',
            }}
            className={`transition-colors duration-100 ${
              isInteractive ? 'pointer-events-auto cursor-text' : 'pointer-events-none'
            }`}
          >
            {isEditing ? (
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  data-testid={`existing-text-input-${item.id}`}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => handleFinishEditing(item)}
                  onKeyDown={(e) => handleKeyDown(e, item)}
                  style={{
                    fontSize: `${fontSizePx}px`,
                    fontFamily: fontFamilyCSS,
                    fontWeight: fontWeightCSS,
                    fontStyle: fontStyleCSS,
                    color: textColorCSS,
                    backgroundColor: bgColorCSS,
                    width: `${Math.max(itemWidth + 12, editValue.length * fontSizePx * 0.62)}px`,
                    height: `${itemHeight}px`,
                    lineHeight: '1',
                    padding: '0 2px',
                    margin: '0',
                    boxSizing: 'border-box',
                    outline: 'none',
                    border: '1px solid #23483B',
                    boxShadow: '0 0 0 1px #23483B',
                    verticalAlign: 'baseline',
                  }}
                  className="rounded-xs z-50 text-left"
                />
                {editValue.length * fontSizePx * 0.55 > itemWidth * 1.15 && (
                  <div
                    data-testid="overflow-warning"
                    className="absolute -bottom-5 left-0 bg-[#B77C30] text-white text-[9px] px-1.5 py-0.5 rounded shadow whitespace-nowrap z-50 pointer-events-none flex items-center gap-1"
                  >
                    <span>Auto-fit to width: text size will scale on export</span>
                  </div>
                )}
              </div>
            ) : (
              <div
                onClick={() => {
                  if (activeTool === 'edit-text') {
                    handleStartEditing(item)
                  } else if (activeTool === 'select') {
                    setSelectedTextId(item.id)
                  }
                }}
                onDoubleClick={() => handleStartEditing(item)}
                style={{
                  fontSize: `${fontSizePx}px`,
                  fontFamily: fontFamilyCSS,
                  fontWeight: fontWeightCSS,
                  fontStyle: fontStyleCSS,
                  color: edit ? textColorCSS : 'transparent',
                  backgroundColor: edit ? bgColorCSS : isSelected && activeTool === 'select' ? 'rgba(35, 72, 59, 0.15)' : 'transparent',
                  border: isSelected && activeTool === 'select' ? '1px dashed #23483B' : undefined,
                  whiteSpace: 'pre',
                  lineHeight: '1',
                  padding: '0 1px',
                  boxSizing: 'border-box',
                }}
                title={activeTool === 'edit-text' ? `Click to edit: "${displayText}"` : displayText}
                className={`w-full h-full select-none flex items-center rounded-xs ${
                  activeTool === 'edit-text' && !edit
                    ? 'hover:bg-[#23483B]/10 hover:outline hover:outline-1 hover:outline-[#23483B]/30'
                    : ''
                }`}
              >
                {edit ? displayText : ''}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
