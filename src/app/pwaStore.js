import { create } from 'zustand'

/*
 * Estado da app instalável: o pedido de instalação guardado pelo browser
 * (Chrome, Edge, Android) para o botão «Instalar», e se a app já está
 * instalada (aberta em janela própria).
 */
export const usePwaStore = create(() => ({
  installPrompt: null,
  installed: false,
}))

/** Mostra o diálogo de instalação do browser. Devolve true se a pessoa aceitou. */
export async function promptInstall() {
  const event = usePwaStore.getState().installPrompt
  if (!event) return false
  usePwaStore.setState({ installPrompt: null })
  await event.prompt()
  const { outcome } = await event.userChoice
  return outcome === 'accepted'
}

/** Liga os eventos do browser ao estado. Chamado uma vez no arranque. */
export function watchInstallState(win = window) {
  const standalone = win.matchMedia?.('(display-mode: standalone)').matches || win.navigator?.standalone === true
  usePwaStore.setState({ installed: Boolean(standalone) })
  win.addEventListener('beforeinstallprompt', (event) => {
    // Guardar o pedido para o botão «Instalar» em vez da faixa do browser.
    event.preventDefault()
    usePwaStore.setState({ installPrompt: event })
  })
  win.addEventListener('appinstalled', () => usePwaStore.setState({ installPrompt: null, installed: true }))
}
