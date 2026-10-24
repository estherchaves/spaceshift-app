import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { worldToScreen } from '@/core/coordinates/viewport.js'
import { findItem } from '@/core/model'
import { fitRoom } from '@/features/editor2d/planGeometry.js'
import { EditorPage } from '@/pages/EditorPage/EditorPage.jsx'
import { addCatalogItem } from '@/store/commands.js'
import { resetEditorStore, useEditorStore } from '@/store/editorStore.js'
import { resetProjectStore, useProjectStore } from '@/store/projectStore.js'
import { TEST_ELEMENT_SIZE } from '@/test/setup.js'

const doc = () => useProjectStore.getState().project
const props = () => within(screen.getByRole('complementary', { name: 'Propriedades' }))

let sofa
beforeEach(() => {
  resetProjectStore()
  resetEditorStore()
  sofa = addCatalogItem('sofa-3', { x: 2, z: 1 })
})

describe('inspetor: acabamento e cor', () => {
  it('escolher um acabamento aplica a sua cor', async () => {
    const user = userEvent.setup()
    render(<EditorPage />)
    const velvet = props().getByRole('radio', { name: 'Veludo' })
    await user.click(velvet)
    expect(findItem(doc(), sofa)).toMatchObject({ finish: 'velvet', color: '#55655a' })
    expect(velvet).toHaveAttribute('aria-checked', 'true')
  })

  it('aceita uma cor personalizada', () => {
    render(<EditorPage />)
    fireEvent.change(props().getByLabelText('Cor personalizada'), { target: { value: '#123456' } })
    expect(findItem(doc(), sofa).color).toBe('#123456')
  })

  it('mostra a pré-visualização de cada móvel no catálogo', () => {
    render(<EditorPage />)
    const card = screen.getByRole('article', { name: 'Cama de casal' })
    expect(card.querySelector('.catalog-preview .plan-symbol')).toHaveAttribute('data-kind', 'bed')
  })

  it('a planta usa o símbolo do tipo de móvel', () => {
    render(<EditorPage />)
    expect(document.querySelector(`[data-item-id="${sofa}"] .plan-symbol`)).toHaveAttribute('data-kind', 'sofa')
  })
})

describe('inspetor: bloquear', () => {
  it('bloquear impede mover, rodar, redimensionar e eliminar', async () => {
    const user = userEvent.setup()
    render(<EditorPage />)
    const start = findItem(doc(), sofa).position
    await user.click(props().getByRole('button', { name: 'Bloquear' }))
    expect(findItem(doc(), sofa).locked).toBe(true)
    expect(screen.getByTestId('lock-badge')).toBeInTheDocument()
    expect(props().getByRole('status')).toHaveTextContent('Bloqueado')
    expect(props().getByLabelText('X')).toBeDisabled()
    expect(props().getByRole('button', { name: /Eliminar/ })).toHaveAttribute('aria-disabled', 'true')
    expect(document.querySelectorAll('[data-handle]')).toHaveLength(0)

    // Arrastar na planta não move um móvel bloqueado.
    const vp = fitRoom(doc().room, TEST_ELEMENT_SIZE)
    const from = worldToScreen(vp, start)
    const el = screen.getByRole('button', { name: /^Sofá de 3 lugares, .*bloqueado/ })
    fireEvent.pointerDown(el, { clientX: from.x, clientY: from.y, button: 0, pointerId: 1 })
    fireEvent.pointerMove(document.querySelector('.plan-svg'), { clientX: from.x + 80, clientY: from.y + 80, pointerId: 1 })
    fireEvent.pointerUp(document.querySelector('.plan-svg'), { clientX: from.x + 80, clientY: from.y + 80, pointerId: 1 })
    expect(findItem(doc(), sofa).position).toEqual(start)

    // Atalhos também respeitam o bloqueio.
    await user.keyboard('{Delete}r{ArrowRight}')
    expect(findItem(doc(), sofa)).toMatchObject({ rotation: 0, position: start })

    // Escolher acabamento também está bloqueado.
    await user.click(props().getByRole('radio', { name: 'Linho' }))
    expect(findItem(doc(), sofa).finish).toBe('wool')
  })

  it('a tecla L alterna o bloqueio', async () => {
    const user = userEvent.setup()
    render(<EditorPage />)
    await user.keyboard('l')
    expect(findItem(doc(), sofa).locked).toBe(true)
    await user.keyboard('l')
    expect(findItem(doc(), sofa).locked).toBe(false)
    expect(screen.queryByTestId('lock-badge')).toBeNull()
  })
})

describe('inspetor: altura ao chão', () => {
  it('aparece só em objetos suspensos e é limitada', async () => {
    const user = userEvent.setup()
    render(<EditorPage />)
    expect(props().queryByLabelText('Altura ao chão')).toBeNull()
    const pendant = addCatalogItem('pendant-lamp')
    act(() => useEditorStore.getState().selectItem(pendant))
    const field = await props().findByLabelText('Altura ao chão')
    expect(field).toHaveValue('195')
    await user.clear(field)
    await user.type(field, '900{Enter}')
    expect(findItem(doc(), pendant).elevation).toBe(5)
  })
})
