import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})

/**
 * O jsdom não implementa layout nem ResizeObserver. Simulamos um elemento
 * com 800 × 600 px para que componentes que dependem do tamanho
 * (ex.: a planta) possam ser testados.
 */
export const TEST_ELEMENT_SIZE = { width: 800, height: 600 }

globalThis.ResizeObserver = class {
  constructor(callback) {
    this.callback = callback
  }
  observe(target) {
    this.callback([{ target, contentRect: { ...TEST_ELEMENT_SIZE } }])
  }
  unobserve() {}
  disconnect() {}
}
