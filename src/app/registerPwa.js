import { registerSW } from 'virtual:pwa-register'
import { notify } from '@/store/toastStore.js'

/*
 * Service worker (só no build de produção). Na primeira visita guarda a
 * app em cache e avisa que já funciona sem internet. Quando há uma versão
 * nova, pergunta antes de recarregar, para não interromper um projeto.
 */
export function registerPwa() {
  const update = registerSW({
    onOfflineReady() {
      notify('Pronto: o SpaceShift já funciona sem internet.', { tone: 'success', duration: 5000 })
    },
    onNeedRefresh() {
      notify('Há uma versão nova do SpaceShift.', {
        duration: Infinity,
        action: { label: 'Atualizar', onClick: () => update(true) },
      })
    },
  })
}
