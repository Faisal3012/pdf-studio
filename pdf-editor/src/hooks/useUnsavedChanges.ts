import { useEffect } from 'react'
import { useEditorStore } from '@/store/editorStore'

/**
 * Hook to prompt user before navigating away if there are unsaved changes.
 */
export function useUnsavedChanges() {
  const hasUnsavedChanges = useEditorStore((s) => s.hasUnsavedChanges)

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])
}
