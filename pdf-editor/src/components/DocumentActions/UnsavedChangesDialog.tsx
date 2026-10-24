import { Modal } from '@/components/UI/Modal'
import { Button } from '@/components/UI/Button'

interface UnsavedChangesDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirmLeave: () => void
  onSaveAndLeave?: () => void
}

export function UnsavedChangesDialog({
  isOpen,
  onClose,
  onConfirmLeave,
  onSaveAndLeave,
}: UnsavedChangesDialogProps) {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Unsaved Changes"
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          You have unsaved changes in your document. What would you like to do?
        </p>
        <p className="text-xs text-slate-400">
          If you leave now without saving, any newly added annotations, page rotations, or page order
          modifications made since your last save will be lost.
        </p>
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirmLeave}>
            Discard & Leave
          </Button>
          {onSaveAndLeave && (
            <Button variant="primary" onClick={onSaveAndLeave}>
              Save & Leave
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
