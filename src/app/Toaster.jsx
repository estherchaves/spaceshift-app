import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { useToastStore } from '@/store/toastStore.js'
import './Toaster.css'

const ICONS = { info: Info, success: CircleCheck, error: CircleAlert }

/** Pilha de notificações breves, anunciada aos leitores de ecrã. */
export function Toaster() {
  const toasts = useToastStore((state) => state.toasts)
  const dismiss = useToastStore((state) => state.dismiss)
  return (
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.tone] ?? Info
        return (
          <div key={toast.id} className="toast" data-tone={toast.tone}>
            <Icon size={15} strokeWidth={2} aria-hidden="true" className="toast__icon" />
            <span className="toast__message">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                className="toast__action"
                onClick={() => {
                  toast.action.onClick()
                  dismiss(toast.id)
                }}
              >
                {toast.action.label}
              </button>
            )}
            <button type="button" className="toast__close" aria-label="Fechar notificação" onClick={() => dismiss(toast.id)}>
              <X size={13} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
