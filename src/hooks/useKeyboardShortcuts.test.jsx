import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useKeyboardShortcuts } from './useKeyboardShortcuts.js'

function Harness({ handler, enabled, children }) {
  useKeyboardShortcuts([{ key: 'Delete', handler }], { enabled })
  return children ?? null
}

describe('useKeyboardShortcuts', () => {
  it('dispara o atalho', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} />)
    fireEvent.keyDown(window, { key: 'Delete' })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('não dispara com um diálogo modal aberto', () => {
    const handler = vi.fn()
    render(
      <Harness handler={handler}>
        <div role="dialog" aria-modal="true" />
      </Harness>,
    )
    fireEvent.keyDown(window, { key: 'Delete' })
    expect(handler).not.toHaveBeenCalled()
  })

  it('não dispara enquanto se escreve num campo', () => {
    const handler = vi.fn()
    const { getByRole } = render(
      <Harness handler={handler}>
        <input aria-label="Nome" />
      </Harness>,
    )
    fireEvent.keyDown(getByRole('textbox'), { key: 'Delete' })
    expect(handler).not.toHaveBeenCalled()
  })

  it('desligado não dispara', () => {
    const handler = vi.fn()
    render(<Harness handler={handler} enabled={false} />)
    fireEvent.keyDown(window, { key: 'Delete' })
    expect(handler).not.toHaveBeenCalled()
  })
})
