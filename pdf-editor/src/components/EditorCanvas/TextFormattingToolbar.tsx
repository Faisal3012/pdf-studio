import React from 'react'
import type { ExistingTextEdit, PDFExtractedTextItem } from '@/types/existingText.types'

interface TextFormattingToolbarProps {
  item: PDFExtractedTextItem
  edit?: ExistingTextEdit
  position: { top: number; left: number }
  onUpdate: (updates: Partial<ExistingTextEdit>) => void
  onCommit: () => void
  onCancel: () => void
  onRevert?: () => void
}

const FONT_FAMILIES = [
  { value: 'Helvetica', label: 'Sans (Helvetica)' },
  { value: 'Times-Roman', label: 'Serif (Times)' },
  { value: 'Courier', label: 'Mono (Courier)' },
]

const QUICK_COLORS = [
  '#000000',
  '#23483B', // Forest green
  '#1E3A8A', // Deep navy
  '#B94B45', // Wine red
  '#B77C30', // Amber
  '#475569', // Slate
]

export const TextFormattingToolbar: React.FC<TextFormattingToolbarProps> = ({
  item,
  edit,
  position,
  onUpdate,
  onCommit,
  onCancel,
  onRevert,
}) => {
  const currentFontFamily = edit?.fontFamily || item.fontFamily || 'Helvetica'
  const currentFontSize = edit?.adjustedFontSize || edit?.fontSize || item.fontSize || 12
  const isBold = edit?.isBold ?? item.isBold
  const isItalic = edit?.isItalic ?? item.isItalic
  const currentColor = edit?.color || (item.color !== 'transparent' ? item.color : '#000000')
  const currentBgColor = edit?.backgroundColor || item.backgroundColor || '#ffffff'

  // Position slightly above the text, clamped so it doesn't go off screen
  const barTop = Math.max(8, position.top - 42)
  const barLeft = Math.max(8, position.left)

  return (
    <div
      data-testid="text-formatting-toolbar"
      style={{
        position: 'absolute',
        top: `${barTop}px`,
        left: `${barLeft}px`,
        zIndex: 60,
      }}
      className="flex items-center gap-1.5 px-2 py-1 bg-[#FFFEFA] dark:bg-[#262E29] border border-[#DEDCCF] dark:border-[#39443C] rounded-md shadow-xl text-xs select-none pointer-events-auto backdrop-blur-xs animate-in fade-in duration-100"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Font Family Select */}
      <select
        value={currentFontFamily}
        onChange={(e) => onUpdate({ fontFamily: e.target.value })}
        className="h-6 px-1.5 bg-[#F5F2EA] dark:bg-[#202722] border border-[#DEDCCF] dark:border-[#39443C] rounded text-[11px] font-medium text-[#202820] dark:text-[#F0F0E8] outline-hidden cursor-pointer"
        title="Font Family"
      >
        {FONT_FAMILIES.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      {/* Font Size decrease / number / increase */}
      <div className="flex items-center border border-[#DEDCCF] dark:border-[#39443C] rounded bg-[#F5F2EA] dark:bg-[#202722] overflow-hidden h-6">
        <button
          type="button"
          onClick={() => onUpdate({ fontSize: Math.max(6, currentFontSize - 1), adjustedFontSize: Math.max(6, currentFontSize - 1) })}
          className="px-1.5 hover:bg-[#EAE6DC] dark:hover:bg-[#2D3831] text-[#73776E] dark:text-[#ADB5AA] font-bold"
          title="Decrease font size"
        >
          -
        </button>
        <span className="px-1.5 text-[11px] font-mono min-w-5 text-center text-[#202820] dark:text-[#F0F0E8]">
          {currentFontSize}
        </span>
        <button
          type="button"
          onClick={() => onUpdate({ fontSize: Math.min(96, currentFontSize + 1), adjustedFontSize: Math.min(96, currentFontSize + 1) })}
          className="px-1.5 hover:bg-[#EAE6DC] dark:hover:bg-[#2D3831] text-[#73776E] dark:text-[#ADB5AA] font-bold"
          title="Increase font size"
        >
          +
        </button>
      </div>

      {/* Bold toggle */}
      <button
        type="button"
        onClick={() => onUpdate({ isBold: !isBold })}
        className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs transition ${
          isBold
            ? 'bg-[#23483B] text-white dark:bg-[#A7C4AD] dark:text-[#171C19]'
            : 'text-[#73776E] dark:text-[#ADB5AA] hover:bg-[#EAE6DC] dark:hover:bg-[#2D3831]'
        }`}
        title="Bold"
      >
        B
      </button>

      {/* Italic toggle */}
      <button
        type="button"
        onClick={() => onUpdate({ isItalic: !isItalic })}
        className={`w-6 h-6 rounded flex items-center justify-center italic font-serif text-xs transition ${
          isItalic
            ? 'bg-[#23483B] text-white dark:bg-[#A7C4AD] dark:text-[#171C19]'
            : 'text-[#73776E] dark:text-[#ADB5AA] hover:bg-[#EAE6DC] dark:hover:bg-[#2D3831]'
        }`}
        title="Italic"
      >
        I
      </button>

      <span className="w-px h-4 bg-[#DEDCCF] dark:bg-[#39443C] mx-0.5" />

      {/* Text color picker with quick swatches */}
      <div className="flex items-center gap-1">
        <label className="relative cursor-pointer flex items-center" title="Text color">
          <span
            className="w-5 h-5 rounded border border-[#DEDCCF] dark:border-[#39443C] shadow-2xs inline-block"
            style={{ backgroundColor: currentColor }}
          />
          <input
            type="color"
            value={currentColor}
            onChange={(e) => onUpdate({ color: e.target.value })}
            className="sr-only"
          />
        </label>
        <div className="hidden sm:flex items-center gap-0.5">
          {QUICK_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onUpdate({ color: c })}
              style={{ backgroundColor: c }}
              className={`w-3.5 h-3.5 rounded-full border transition ${
                currentColor.toLowerCase() === c.toLowerCase()
                  ? 'border-[#23483B] scale-110 ring-1 ring-[#23483B]'
                  : 'border-black/20 hover:scale-105'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Background color swatch */}
      <label className="relative cursor-pointer flex items-center" title={`Background cover: ${currentBgColor}`}>
        <span className="text-[10px] text-[#73776E] dark:text-[#ADB5AA] mr-0.5">BG:</span>
        <span
          className="w-4 h-4 rounded border border-[#DEDCCF] dark:border-[#39443C] shadow-2xs inline-block"
          style={{ backgroundColor: currentBgColor }}
        />
        <input
          type="color"
          value={currentBgColor}
          onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
          className="sr-only"
        />
      </label>

      <span className="w-px h-4 bg-[#DEDCCF] dark:bg-[#39443C] mx-0.5" />

      {/* Commit / Done */}
      <button
        type="button"
        onClick={onCommit}
        className="px-2 py-0.5 bg-[#23483B] hover:bg-[#19392F] dark:bg-[#A7C4AD] dark:hover:bg-[#C2D8C6] text-white dark:text-[#171C19] font-medium rounded text-[11px] shadow-2xs transition"
        title="Commit changes (Enter)"
      >
        Done
      </button>

      {/* Revert if edit exists */}
      {edit && onRevert && (
        <button
          type="button"
          onClick={onRevert}
          className="px-1.5 py-0.5 text-[#B94B45] hover:bg-[#B94B45]/10 rounded text-[11px] transition"
          title="Revert to original text"
        >
          Revert
        </button>
      )}

      {/* Close / Cancel */}
      <button
        type="button"
        onClick={onCancel}
        className="p-1 text-[#73776E] hover:text-[#202820] dark:text-[#ADB5AA] dark:hover:text-[#F0F0E8] rounded"
        title="Cancel (Esc)"
      >
        ✕
      </button>
    </div>
  )
}
