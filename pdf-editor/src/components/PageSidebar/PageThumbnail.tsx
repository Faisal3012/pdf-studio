import { useEffect, useRef, useState } from 'react'
import { renderPDFPageToCanvas } from '@/services/pdf/pdfLoader'

interface PageThumbnailProps {
  sessionId: string
  pageIndex: number
  rotation: 0 | 90 | 180 | 270
  isSelected: boolean
  onClick: () => void
  onRotate?: () => void
  onDelete?: () => void
}

export function PageThumbnail({
  sessionId,
  pageIndex,
  rotation,
  isSelected,
  onClick,
  onRotate,
  onDelete,
}: PageThumbnailProps) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    // Render at small thumbnail scale (e.g. 0.2)
    renderPDFPageToCanvas(sessionId, pageIndex, 0.25, rotation)
      .then((c) => {
        if (isMountedRef.current) {
          setThumbUrl(c.toDataURL())
        }
      })
      .catch((err) => {
        console.error(`Failed to generate thumbnail for page ${pageIndex}`, err)
      })

    return () => {
      isMountedRef.current = false
    }
  }, [sessionId, pageIndex, rotation])

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col items-center p-2 rounded-md cursor-pointer transition-all border-2 ${
        isSelected
          ? 'border-[#23483B] dark:border-[#A7C4AD] bg-[#E5EDE6] dark:bg-[#2D3831] shadow-xs'
          : 'border-transparent hover:border-[#DEDCCF] dark:hover:border-[#39443C] bg-[#FFFEFA] dark:bg-[#262E29]'
      }`}
    >
      <div className="w-28 h-36 bg-white rounded overflow-hidden flex items-center justify-center border border-[#DEDCCF] dark:border-[#39443C] shadow-xs">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={`Page ${pageIndex + 1}`}
            className="w-full h-full object-contain pointer-events-none"
          />
        ) : (
          <span className="text-xs text-slate-400">Loading...</span>
        )}
      </div>

      <div className="mt-1 flex items-center justify-between w-full px-1">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Page {pageIndex + 1}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onRotate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRotate()
              }}
              title="Rotate 90°"
              className="p-1 hover:bg-[#DEDCCF] dark:hover:bg-[#39443C] rounded text-[#73776E] dark:text-[#ADB5AA] text-xs transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              title="Delete Page"
              className="p-1 hover:bg-[#B94B45]/15 rounded text-[#B94B45] text-xs transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
