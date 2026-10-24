import { Button } from './Button.jsx'
import { Dialog } from './Dialog.jsx'

/** Confirmação de uma ação, com o botão de confirmar a vermelho quando é destrutiva. */
export function ConfirmDialog({ open, title, description, confirmLabel, cancelLabel = 'Cancelar', danger = false, busy = false, onConfirm, onCancel }) {
  return (
    <Dialog
      open={open}
      title={title}
      description={description}
      onClose={onCancel}
      size="sm"
      tone={danger ? 'danger' : undefined}
      footer={
        <>
          <Button onClick={onCancel} data-autofocus>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger-solid' : 'primary'} onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  )
}
