import { useEditorStore } from '@/store/editorStore'
import { Spinner } from '@/components/UI/Spinner'
import { persistCurrentDocument } from '@/hooks/useAutosave'

export function SaveStatus() {
  const saveStatus = useEditorStore((s) => s.saveStatus)
  const lastSaveError = useEditorStore((s) => s.lastSaveError)
  const hasUnsavedChanges = useEditorStore((s) => s.hasUnsavedChanges)

  if (saveStatus === 'saving') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-[#23483B] dark:text-[#A7C4AD]">
        <Spinner size="sm" />
        <span>Saving changes...</span>
      </div>
    )
  }

  if (saveStatus === 'saved') {
    return (
      <div className="flex items-center gap-1 text-xs text-[#347454] dark:text-[#438E6A]">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        <span>All changes saved</span>
      </div>
    )
  }

  if (saveStatus === 'failed') {
    return (
      <div
        className="flex items-center gap-1.5 text-xs text-[#B94B45] dark:text-[#D9625C] font-medium"
        title={lastSaveError ? `Reason: ${lastSaveError}` : 'Save to local database failed'}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>Save failed</span>
        <button
          type="button"
          onClick={() => void persistCurrentDocument()}
          className="underline hover:text-[#9B3C37] dark:hover:text-[#F0F0E8] ml-0.5 cursor-pointer font-semibold"
          title="Retry saving to browser storage"
        >
          Retry
        </button>
      </div>
    )
  }

  if (hasUnsavedChanges) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-[#B77C30] dark:text-[#D69747] font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-[#B77C30] dark:bg-[#D69747]" />
        <span>Unsaved changes</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 text-xs text-[#73776E] dark:text-[#ADB5AA]">
      <span>Saved</span>
    </div>
  )
}
