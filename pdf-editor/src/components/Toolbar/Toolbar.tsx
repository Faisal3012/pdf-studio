import { useState, useRef } from 'react'
import { useEditorStore } from '@/store/editorStore'
import { useUndoRedo } from '@/hooks/useUndoRedo'
import { SaveStatus } from '@/components/SaveStatus/SaveStatus'
import { SignatureModal } from '@/components/Signature/SignatureModal'
import type { EditorTool } from '@/types/editor.types'

const TOOLS: { id: EditorTool; label: string; icon: React.ReactNode }[] = [
  {
    id: 'select',
    label: 'Select',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
      </svg>
    ),
  },
  {
    id: 'edit-text',
    label: 'Edit Text',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    id: 'text',
    label: 'Add Text',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M12 6v14" />
      </svg>
    ),
  },
  {
    id: 'draw',
    label: 'Draw',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ),
  },
  {
    id: 'highlight',
    label: 'Highlight',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 21h10M9 3l8 8-4 4-8-8 4-4z" />
      </svg>
    ),
  },
  {
    id: 'rect',
    label: 'Rectangle',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="4" y="4" width="16" height="16" rx="1" strokeWidth={1.75} />
      </svg>
    ),
  },
  {
    id: 'circle',
    label: 'Circle',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8" strokeWidth={1.75} />
      </svg>
    ),
  },
  {
    id: 'line',
    label: 'Line',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeWidth={2} d="M5 19L19 5" />
      </svg>
    ),
  },
  {
    id: 'arrow',
    label: 'Arrow',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 12h14m-5-5l5 5-5 5" />
      </svg>
    ),
  },
  {
    id: 'image',
    label: 'Image',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'signature',
    label: 'Signature',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
      </svg>
    ),
  },
]

export function Toolbar() {
  const activeTool = useEditorStore((s) => s.activeTool)
  const setActiveTool = useEditorStore((s) => s.setActiveTool)
  const { canUndo, canRedo, undo, redo } = useUndoRedo()

  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const currentPageIndex = useEditorStore((s) => s.currentPageIndex)
  const addAnnotation = useEditorStore((s) => s.addAnnotation)
  const setSelectedAnnotation = useEditorStore((s) => s.setSelectedAnnotation)
  const setSelectedExistingTextId = useEditorStore((s) => s.setSelectedExistingTextId)
  const { recordCurrentState } = useUndoRedo()

  const handleToolClick = (toolId: EditorTool) => {
    if (toolId === 'image') {
      fileInputRef.current?.click()
      return
    }
    if (toolId === 'signature') {
      setShowSignatureModal(true)
      return
    }
    setSelectedAnnotation(null)
    setSelectedExistingTextId(null)
    setActiveTool(toolId)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      if (!dataUrl) return

      recordCurrentState()
      const newImg = {
        id: `img-${Date.now()}`,
        pageIndex: currentPageIndex,
        type: 'image' as const,
        x: 100,
        y: 100,
        width: 150,
        height: 150,
        rotation: 0,
        opacity: 1,
        locked: false,
        imageDbKey: dataUrl,
      }
      addAnnotation(newImg)
      setSelectedAnnotation(newImg.id)
      setActiveTool('select')
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleSaveSignature = (dataUrl: string) => {
    recordCurrentState()
    const newSig = {
      id: `sig-${Date.now()}`,
      pageIndex: currentPageIndex,
      type: 'signature' as const,
      x: 120,
      y: 120,
      width: 180,
      height: 80,
      rotation: 0,
      opacity: 1,
      locked: false,
      imageDbKey: dataUrl,
    }
    addAnnotation(newSig)
    setSelectedAnnotation(newSig.id)
    setActiveTool('select')
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleImageUpload}
      />

      <SignatureModal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onSaveSignature={handleSaveSignature}
      />

      <div className="h-12 bg-[#FFFEFA] dark:bg-[#262E29] border-b border-[#DEDCCF] dark:border-[#39443C] flex items-center justify-between px-4 select-none overflow-x-auto shrink-0 gap-3">
        {/* Left: Tools */}
        <div className="flex items-center gap-1">
          {TOOLS.map((tool) => {
            const isActive = activeTool === tool.id
            return (
              <button
                key={tool.id}
                onClick={() => handleToolClick(tool.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#23483B] text-[#FFFEFA] dark:bg-[#A7C4AD] dark:text-[#171C19] shadow-xs'
                    : 'text-[#73776E] dark:text-[#ADB5AA] hover:bg-[#E5EDE6] dark:hover:bg-[#2D3831] hover:text-[#202820] dark:hover:text-[#F0F0E8]'
                }`}
                title={tool.label}
              >
                <span className="shrink-0 flex items-center justify-center">{tool.icon}</span>
                <span>{tool.label}</span>
              </button>
            )
          })}
        </div>

        {/* Right: Undo/Redo & Save Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 border-r border-[#DEDCCF] dark:border-[#39443C] pr-3">
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#73776E] dark:text-[#ADB5AA] hover:bg-[#E5EDE6] dark:hover:bg-[#2D3831] disabled:opacity-35 disabled:hover:bg-transparent"
              title="Undo (Ctrl+Z)"
            >
              <span>↩</span>
              <span className="hidden sm:inline">Undo</span>
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#73776E] dark:text-[#ADB5AA] hover:bg-[#E5EDE6] dark:hover:bg-[#2D3831] disabled:opacity-35 disabled:hover:bg-transparent"
              title="Redo (Ctrl+Y)"
            >
              <span>↪</span>
              <span className="hidden sm:inline">Redo</span>
            </button>
          </div>

          <SaveStatus />
        </div>
      </div>
    </>
  )
}
