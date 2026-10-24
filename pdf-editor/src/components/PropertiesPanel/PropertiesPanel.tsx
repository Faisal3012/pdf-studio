import { useEditorStore } from '@/store/editorStore'
import { HIGHLIGHT_COLORS } from '@/utils/colorUtils'
import type { TextAnnotation, ShapeAnnotation, DrawAnnotation, HighlightAnnotation, Annotation } from '@/types/annotation.types'
import type { ExistingTextEdit } from '@/types/existingText.types'

const EMPTY_ANNOTATIONS: Annotation[] = []
const EMPTY_EDITS: ExistingTextEdit[] = []

export function PropertiesPanel() {
  const selectedId = useEditorStore((s) => s.selectedAnnotationId)
  const selectedExistingTextId = useEditorStore((s) => s.selectedExistingTextId)
  const setSelectedExistingTextId = useEditorStore((s) => s.setSelectedExistingTextId)
  const upsertExistingTextEdit = useEditorStore((s) => s.upsertExistingTextEdit)
  const removeExistingTextEdit = useEditorStore((s) => s.removeExistingTextEdit)

  const currentAnnotations = useEditorStore((s) => s.annotationsByPage[s.currentPageIndex]) ?? EMPTY_ANNOTATIONS
  const currentExistingEdits = useEditorStore((s) => s.existingTextEditsByPage[s.currentPageIndex]) ?? EMPTY_EDITS

  const updateAnnotation = useEditorStore((s) => s.updateAnnotation)
  const removeAnnotation = useEditorStore((s) => s.removeAnnotation)
  const setSelectedAnnotation = useEditorStore((s) => s.setSelectedAnnotation)

  const selected = currentAnnotations.find((a) => a.id === selectedId)
  const selectedExistingEdit = currentExistingEdits.find((e) => e.id === selectedExistingTextId)

  if (!selected && selectedExistingEdit) {
    return (
      <aside className="w-64 bg-[#FFFEFA] dark:bg-[#262E29] border-l border-[#DEDCCF] dark:border-[#39443C] flex flex-col h-full select-none shrink-0 overflow-y-auto">
        <div className="h-10 px-4 border-b border-[#DEDCCF] dark:border-[#39443C] flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#23483B] dark:text-[#A7C4AD] uppercase tracking-wider">
            EXISTING TEXT PROPERTIES
          </span>
          <button
            onClick={() => setSelectedExistingTextId(null)}
            className="text-[#73776E] hover:text-[#202820] dark:text-[#ADB5AA] dark:hover:text-[#F0F0E8] text-xs p-1"
            title="Deselect"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4 text-xs">
          <div>
            <label className="block text-[#73776E] dark:text-[#ADB5AA] mb-1 font-medium">Original Document Text</label>
            <div className="p-2 bg-[#F5F2EA] dark:bg-[#202722] border border-[#DEDCCF] dark:border-[#39443C] rounded text-[#202820] dark:text-[#F0F0E8] font-mono text-[11px] break-all">
              {selectedExistingEdit.originalText}
            </div>
          </div>

          <div>
            <label className="block text-slate-500 mb-1 font-medium">Replacement Text</label>
            <textarea
              value={selectedExistingEdit.replacementText}
              onChange={(e) =>
                upsertExistingTextEdit({
                  ...selectedExistingEdit,
                  replacementText: e.target.value,
                })
              }
              rows={2}
              className="w-full px-2 py-1 border border-slate-200 dark:border-slate-700 rounded bg-transparent focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-500 mb-1 font-medium">Font Size</label>
              <input
                type="number"
                min={6}
                max={96}
                value={selectedExistingEdit.fontSize}
                onChange={(e) =>
                  upsertExistingTextEdit({
                    ...selectedExistingEdit,
                    fontSize: Number(e.target.value),
                    adjustedFontSize: Number(e.target.value),
                  })
                }
                className="w-full px-2 py-1 border border-slate-200 dark:border-slate-700 rounded bg-transparent"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1 font-medium">Text Color</label>
              <input
                type="color"
                value={selectedExistingEdit.color || '#000000'}
                onChange={(e) =>
                  upsertExistingTextEdit({
                    ...selectedExistingEdit,
                    color: e.target.value,
                  })
                }
                className="w-full h-7 rounded border border-slate-200 dark:border-slate-700 bg-transparent cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-500 mb-1 font-medium">Font Family & Style</label>
            <div className="flex gap-2 mb-2">
              <select
                value={selectedExistingEdit.fontFamily || 'Helvetica'}
                onChange={(e) =>
                  upsertExistingTextEdit({
                    ...selectedExistingEdit,
                    fontFamily: e.target.value,
                  })
                }
                className="flex-1 px-2 py-1 border border-slate-200 dark:border-slate-700 rounded bg-transparent text-xs"
              >
                <option value="Helvetica">Helvetica (Sans-Serif)</option>
                <option value="Times-Roman">Times-Roman (Serif)</option>
                <option value="Courier">Courier (Monospace)</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  upsertExistingTextEdit({
                    ...selectedExistingEdit,
                    isBold: !selectedExistingEdit.isBold,
                  })
                }
                className={`flex-1 py-1 rounded border text-xs font-bold transition ${
                  selectedExistingEdit.isBold
                    ? 'bg-[#23483B] text-white border-[#23483B]'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                Bold
              </button>
              <button
                type="button"
                onClick={() =>
                  upsertExistingTextEdit({
                    ...selectedExistingEdit,
                    isItalic: !selectedExistingEdit.isItalic,
                  })
                }
                className={`flex-1 py-1 rounded border text-xs italic font-serif transition ${
                  selectedExistingEdit.isItalic
                    ? 'bg-[#23483B] text-white border-[#23483B]'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                Italic
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-500 mb-1 font-medium">Background Mask Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={selectedExistingEdit.backgroundColor || '#ffffff'}
                onChange={(e) =>
                  upsertExistingTextEdit({
                    ...selectedExistingEdit,
                    backgroundColor: e.target.value,
                  })
                }
                className="w-10 h-7 rounded border border-slate-200 dark:border-slate-700 bg-transparent cursor-pointer"
              />
              <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                {selectedExistingEdit.backgroundColor || '#ffffff'}
              </span>
            </div>
            <p className="mt-1 text-[10px] text-slate-400">
              Matches background underneath to prevent ghost text without overlapping borders.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => removeExistingTextEdit(selectedExistingEdit.id)}
              className="w-full py-1.5 px-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded text-xs font-medium transition"
            >
              Revert to Original Text
            </button>
          </div>
        </div>
      </aside>
    )
  }

  if (!selected) {
    return (
      <aside className="w-56 bg-[#FFFEFA] dark:bg-[#262E29] border-l border-[#DEDCCF] dark:border-[#39443C] p-4 text-[#73776E] dark:text-[#ADB5AA] text-xs hidden md:flex flex-col select-none shrink-0">
        <h3 className="font-semibold text-[#202820] dark:text-[#F0F0E8] uppercase tracking-wider text-[11px] mb-2">
          Properties
        </h3>
        <p className="mt-2 text-[#73776E] dark:text-[#ADB5AA] leading-relaxed text-[11px]">
          Select any annotation or click "Edit Text" to customize text or shapes.
        </p>
      </aside>
    )
  }

  const isText = selected.type === 'text'
  const isShape = ['rect', 'circle', 'line', 'arrow'].includes(selected.type)
  const isDraw = selected.type === 'draw'
  const isHighlight = selected.type === 'highlight'

  const textAnno = selected as TextAnnotation
  const shapeAnno = selected as ShapeAnnotation
  const drawAnno = selected as DrawAnnotation
  const highlightAnno = selected as HighlightAnnotation

  return (
    <aside className="w-64 bg-[#FFFEFA] dark:bg-[#262E29] border-l border-[#DEDCCF] dark:border-[#39443C] flex flex-col h-full select-none shrink-0 overflow-y-auto">
      <div className="h-10 px-4 border-b border-[#DEDCCF] dark:border-[#39443C] flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[#202820] dark:text-[#F0F0E8] uppercase tracking-wider">
          {selected.type.toUpperCase()} PROPERTIES
        </span>
        <button
          onClick={() => setSelectedAnnotation(null)}
          className="text-[#73776E] hover:text-[#202820] dark:text-[#ADB5AA] dark:hover:text-[#F0F0E8] text-xs p-1"
          title="Deselect"
        >
          ✕
        </button>
      </div>

      <div className="p-4 space-y-4 text-xs">
        {/* Text properties */}
        {isText && (
          <>
            <div>
              <label className="block text-slate-500 mb-1 font-medium">Text Content</label>
              <textarea
                value={textAnno.text}
                onChange={(e) => updateAnnotation(selected.id, { text: e.target.value })}
                rows={2}
                className="w-full px-2 py-1 border border-slate-200 dark:border-slate-700 rounded bg-transparent focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-500 mb-1 font-medium">Font Size</label>
                <input
                  type="number"
                  min={8}
                  max={72}
                  value={textAnno.fontSize}
                  onChange={(e) => updateAnnotation(selected.id, { fontSize: Number(e.target.value) })}
                  className="w-full px-2 py-1 border border-slate-200 dark:border-slate-700 rounded bg-transparent"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1 font-medium">Text Color</label>
                <input
                  type="color"
                  value={textAnno.fill || '#1e293b'}
                  onChange={(e) => updateAnnotation(selected.id, { fill: e.target.value })}
                  className="w-full h-7 rounded border border-slate-200 dark:border-slate-700 bg-transparent cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-500 mb-1 font-medium">Alignment</label>
              <div className="flex border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                    key={align}
                    onClick={() => updateAnnotation(selected.id, { align })}
                    className={`flex-1 py-1 text-center capitalize ${
                      textAnno.align === align ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {align}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Shape / Line properties */}
        {isShape && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-500 mb-1 font-medium">Stroke Color</label>
                <input
                  type="color"
                  value={shapeAnno.stroke || '#2563eb'}
                  onChange={(e) => updateAnnotation(selected.id, { stroke: e.target.value })}
                  className="w-full h-7 rounded border border-slate-200 dark:border-slate-700 bg-transparent cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1 font-medium">Stroke Width</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={shapeAnno.strokeWidth || 2}
                  onChange={(e) => updateAnnotation(selected.id, { strokeWidth: Number(e.target.value) })}
                  className="w-full px-2 py-1 border border-slate-200 dark:border-slate-700 rounded bg-transparent"
                />
              </div>
            </div>

            {(shapeAnno.type === 'rect' || shapeAnno.type === 'circle') && (
              <div>
                <label className="block text-slate-500 mb-1 font-medium">Fill Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={shapeAnno.fill === 'transparent' ? '#ffffff' : shapeAnno.fill}
                    onChange={(e) => updateAnnotation(selected.id, { fill: e.target.value })}
                    className="w-full h-7 rounded border border-slate-200 dark:border-slate-700 bg-transparent cursor-pointer"
                  />
                  <button
                    onClick={() => updateAnnotation(selected.id, { fill: 'transparent' })}
                    className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Freehand Drawing properties */}
        {isDraw && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-500 mb-1 font-medium">Stroke Color</label>
              <input
                type="color"
                value={drawAnno.stroke || '#1e293b'}
                onChange={(e) => updateAnnotation(selected.id, { stroke: e.target.value })}
                className="w-full h-7 rounded border border-slate-200 dark:border-slate-700 bg-transparent cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1 font-medium">Stroke Width</label>
              <input
                type="number"
                min={1}
                max={20}
                value={drawAnno.strokeWidth || 3}
                onChange={(e) => updateAnnotation(selected.id, { strokeWidth: Number(e.target.value) })}
                className="w-full px-2 py-1 border border-slate-200 dark:border-slate-700 rounded bg-transparent"
              />
            </div>
          </div>
        )}

        {/* Highlight properties */}
        {isHighlight && (
          <div>
            <label className="block text-slate-500 mb-1 font-medium">Highlight Color</label>
            <div className="flex gap-2">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => updateAnnotation(selected.id, { fill: c.value })}
                  style={{ backgroundColor: c.value }}
                  className={`w-6 h-6 rounded-full border-2 transition ${
                    highlightAnno.fill === c.value ? 'border-blue-600 scale-110' : 'border-transparent'
                  }`}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        )}

        {/* Common: Opacity slider */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-slate-500 font-medium">Opacity</label>
            <span className="text-slate-400">{Math.round((selected.opacity ?? 1) * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={selected.opacity ?? 1}
            onChange={(e) => updateAnnotation(selected.id, { opacity: Number(e.target.value) })}
            className="w-full"
          />
        </div>

        {/* Actions: Lock & Delete */}
        <div className="pt-4 border-t border-[#DEDCCF] dark:border-[#39443C] space-y-2">
          <button
            onClick={() => updateAnnotation(selected.id, { locked: !selected.locked })}
            className="w-full py-1.5 px-3 rounded border border-[#DEDCCF] dark:border-[#39443C] text-[#202820] dark:text-[#F0F0E8] hover:bg-[#F5F2EA] dark:hover:bg-[#202722] flex items-center justify-center gap-1.5 font-medium transition"
          >
            {selected.locked ? (
              <svg className="w-3.5 h-3.5 text-[#73776E] dark:text-[#ADB5AA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-[#73776E] dark:text-[#ADB5AA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
            )}
            <span>{selected.locked ? 'Unlock Element' : 'Lock Element'}</span>
          </button>

          <button
            onClick={() => {
              removeAnnotation(selected.id)
              setSelectedAnnotation(null)
            }}
            className="w-full py-1.5 px-3 rounded bg-[#B94B45]/10 hover:bg-[#B94B45]/20 text-[#B94B45] dark:text-red-300 border border-[#B94B45]/20 flex items-center justify-center gap-1.5 font-medium transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Delete Element</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
