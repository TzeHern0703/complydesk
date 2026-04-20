import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
}: ConfirmDialogProps) {
  const footer = (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" onClick={onClose}>
        Cancel
      </Button>
      <Button
        variant={danger ? 'danger' : 'primary'}
        onClick={() => {
          onConfirm()
          onClose()
        }}
      >
        {confirmLabel}
      </Button>
    </div>
  )

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm" footer={footer}>
      <p className="text-sm text-neutral-600">{message}</p>
    </Modal>
  )
}
