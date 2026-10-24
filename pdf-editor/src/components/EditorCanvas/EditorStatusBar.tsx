import { useEditorStore } from '@/store/editorStore'
import { ZOOM_LEVELS, clampZoom } from '@/utils/coordinateMapping'

export function EditorStatusBar() {
  const zoom = useEditorStore((s) => s.zoom)
  const setZoom = useEditorStore((s) => s.setZoom)
  const currentPageIndex = useEditorStore((s) => s.currentPageIndex)
  const setCurrentPage = useEditorStore((s) => s.setCurrentPage)
  const pages = useEditorStore((s) => s.pages)

  const activePages = pages.filter((p) => !p.deleted)
  const currentActiveIdx = activePages.findIndex((p) => p.pageIndex === currentPageIndex)

  const handleZoomIn = () => {
    const next = ZOOM_LEVELS.find((l) => l > zoom) ?? zoom + 25
    setZoom(clampZoom(next))
  }

  const handleZoomOut = () => {
    const reversed = [...ZOOM_LEVELS].reverse()
    const prev = reversed.find((l) => l < zoom) ?? zoom - 25
    setZoom(clampZoom(prev))
  }

  const handlePrevPage = () => {
    if (currentActiveIdx > 0) {
      setCurrentPage(activePages[currentActiveIdx - 1].pageIndex)
    }
  }

  const handleNextPage = () => {
    if (currentActiveIdx < activePages.length - 1) {
      setCurrentPage(activePages[currentActiveIdx + 1].pageIndex)
    }
  }

  return (
    <footer className="h-10 bg-[#FFFEFA] dark:bg-[#262E29] border-t border-[#DEDCCF] dark:border-[#39443C] flex items-center justify-between px-4 text-xs text-[#73776E] dark:text-[#ADB5AA] select-none z-10 shrink-0">
      {/* Page navigation */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={currentActiveIdx <= 0}
          onClick={handlePrevPage}
          className="p-1 rounded hover:bg-[#E5EDE6] dark:hover:bg-[#2D3831] disabled:opacity-35 disabled:hover:bg-transparent transition"
          title="Previous Page"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-medium text-[#202820] dark:text-[#F0F0E8]">
          Page {currentActiveIdx + 1} of {activePages.length || 1}
        </span>
        <button
          type="button"
          disabled={currentActiveIdx >= activePages.length - 1}
          onClick={handleNextPage}
          className="p-1 rounded hover:bg-[#E5EDE6] dark:hover:bg-[#2D3831] disabled:opacity-35 disabled:hover:bg-transparent transition"
          title="Next Page"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={zoom <= 25}
          onClick={handleZoomOut}
          className="px-2 py-0.5 rounded font-bold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
          title="Zoom Out (Ctrl -)"
        >
          −
        </button>

        <select
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="bg-transparent border border-slate-200 dark:border-slate-700 rounded px-2 py-0.5 text-xs focus:outline-hidden font-medium"
        >
          {ZOOM_LEVELS.map((lvl) => (
            <option key={lvl} value={lvl} className="dark:bg-slate-900 text-slate-900 dark:text-white">
              {lvl}%
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={zoom >= 200}
          onClick={handleZoomIn}
          className="px-2 py-0.5 rounded font-bold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
          title="Zoom In (Ctrl +)"
        >
          +
        </button>

        <button
          type="button"
          onClick={() => setZoom(100)}
          className="ml-2 px-2 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          title="Reset Zoom to 100% (Ctrl 0)"
        >
          Fit (100%)
        </button>
      </div>
    </footer>
  )
}
