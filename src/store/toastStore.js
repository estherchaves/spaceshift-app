import { create } from 'zustand'

/*
 * Notificações breves ("Projeto exportado", "Anulado: Mover Sofá").
 * Ficam visíveis alguns segundos; erros ficam mais tempo.
 */
let nextId = 1
const timers = new Map()

export const useToastStore = create((set, get) => ({
  toasts: [],
  dismiss: (id) => {
    clearTimeout(timers.get(id))
    timers.delete(id)
    set({ toasts: get().toasts.filter((toast) => toast.id !== id) })
  },
}))

/**
 * @param {string} message
 * @param {{tone?: 'info'|'success'|'error', duration?: number, action?: {label: string, onClick: () => void}}} [options]
 */
export function notify(message, { tone = 'info', duration, action } = {}) {
  const id = nextId++
  const toast = { id, message, tone, action }
  // No máximo três ao mesmo tempo: a mais antiga sai.
  useToastStore.setState((state) => ({ toasts: [...state.toasts.slice(-2), toast] }))
  const ms = duration ?? (tone === 'error' ? 7000 : 3200)
  timers.set(id, setTimeout(() => useToastStore.getState().dismiss(id), ms))
  return id
}
