import { useEditorStore } from '@/store/editorStore'
import { PageThumbnail } from './PageThumbnail'

export function PageSidebar() {
  const sessionId = useEditorStore((s) => s.sessionId)
  const pages = useEditorStore((s) => s.pages)
  const currentPageIndex = useEditorStore((s) => s.currentPageIndex)
  const setCurrentPage = useEditorStore((s) => s.setCurrentPage)
  const rotatePage = useEditorStore((s) => s.rotatePage)
  const deletePage = useEditorStore((s) => s.deletePage)
  const sidebarOpen = useEditorStore((s) => s.sidebarOpen)
  const setSidebarOpen = useEditorStore((s) => s.setSidebarOpen)

  if (!sidebarOpen) {
    return (
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed left-2 top-20 z-20 p-2 bg-[#FFFEFA] dark:bg-[#262E29] border border-[#DEDCCF] dark:border-[#39443C] rounded-md shadow-sm text-[#73776E] dark:text-[#ADB5AA] hover:text-[#202820] dark:hover:text-[#F0F0E8] transition"
        title="Open Thumbnails Sidebar"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </button>
    )
  }

  const activePages = pages.filter((p) => !p.deleted)

  return (
    <aside className="w-52 bg-[#FFFEFA] dark:bg-[#262E29] border-r border-[#DEDCCF] dark:border-[#39443C] flex flex-col h-full shrink-0 select-none">
      {/* Header */}
      <div className="h-10 px-4 border-b border-[#DEDCCF] dark:border-[#39443C] flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[#73776E] dark:text-[#ADB5AA] uppercase tracking-wider">
          Pages ({activePages.length})
        </span>
        <button
          onClick={() => setSidebarOpen(false)}
          className="text-[#73776E] hover:text-[#202820] dark:text-[#ADB5AA] dark:hover:text-[#F0F0E8] p-1 rounded transition"
          title="Collapse Sidebar"
        >
          ◀
        </button>
      </div>

      {/* Pages list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {sessionId &&
          activePages.map((page) => (
            <PageThumbnail
              key={page.pageIndex}
              sessionId={sessionId}
              pageIndex={page.pageIndex}
              rotation={page.rotation}
              isSelected={currentPageIndex === page.pageIndex}
              onClick={() => setCurrentPage(page.pageIndex)}
              onRotate={() => {
                const nextRot = ((page.rotation + 90) % 360) as 0 | 90 | 180 | 270
                rotatePage(page.pageIndex, nextRot)
              }}
              onDelete={
                activePages.length > 1
                  ? () => deletePage(page.pageIndex)
                  : undefined
              }
            />
          ))}
      </div>
    </aside>
  )
}
