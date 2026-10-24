import { beforeEach, describe, expect, it, vi } from 'vitest'
import { promptInstall, usePwaStore, watchInstallState } from './pwaStore.js'

function fakeWindow({ standalone = false } = {}) {
  const target = new EventTarget()
  target.matchMedia = () => ({ matches: standalone })
  target.navigator = {}
  return target
}

beforeEach(() => usePwaStore.setState({ installPrompt: null, installed: false }))

describe('instalar a app', () => {
  it('guarda o pedido do browser e mostra-o quando se pede', async () => {
    const win = fakeWindow()
    watchInstallState(win)
    const event = new Event('beforeinstallprompt', { cancelable: true })
    event.prompt = vi.fn(async () => {})
    event.userChoice = Promise.resolve({ outcome: 'accepted' })
    win.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(usePwaStore.getState().installPrompt).toBe(event)

    await expect(promptInstall()).resolves.toBe(true)
    expect(event.prompt).toHaveBeenCalledOnce()
    expect(usePwaStore.getState().installPrompt).toBeNull()
  })

  it('aberta em janela própria conta como instalada', () => {
    watchInstallState(fakeWindow({ standalone: true }))
    expect(usePwaStore.getState().installed).toBe(true)
  })

  it('sem pedido do browser não faz nada', async () => {
    await expect(promptInstall()).resolves.toBe(false)
  })
})
