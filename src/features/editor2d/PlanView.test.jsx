import { act, createEvent, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { worldToScreen } from '@/core/coordinates/viewport.js'
import { findItem } from '@/core/model'
import { EditorPage } from '@/pages/EditorPage/EditorPage.jsx'
import { addCatalogItem } from '@/store/commands.js'
import { resetEditorStore, useEditorStore } from '@/store/editorStore.js'
import { resetProjectStore, useProjectStore } from '@/store/projectStore.js'
import { TEST_ELEMENT_SIZE } from '@/test/setup.js'
import { fitRoom } from './planGeometry.js'

/*
 * No jsdom o <svg> está em (0, 0) e a área mede 800 × 600 px (ver
 * test/setup.js), por isso clientX/Y = coordenadas no SVG.
 */
const doc = () => useProjectStore.getState().project
const viewport = () => fitRoom(doc().room, TEST_ELEMENT_SIZE)
const toPx = (x, z) => worldToScreen(viewport(), { x, z })
const svg = () => document.querySelector('.plan-svg')
const statusBar = () => within(screen.getByRole('contentinfo', { name: 'Estado do projeto' }))

function drag(element, from, to, init = {}) {
  fireEvent.pointerDown(element, { clientX: from.x, clientY: from.y, button: 0, pointerId: 1, ...init })
  fireEvent.pointerMove(svg(), { clientX: (from.x + to.x) / 2, clientY: (from.y + to.y) / 2, pointerId: 1, ...init })
  fireEvent.pointerMove(svg(), { clientX: to.x, clientY: to.y, pointerId: 1, ...init })
}

function release(at) {
  fireEvent.pointerUp(svg(), { clientX: at.x, clientY: at.y, pointerId: 1 })
}

let sofaId
beforeEach(() => {
  resetProjectStore()
  resetEditorStore()
  sofaId = addCatalogItem('sofa-3', { x: 1.5, z: 1 }) // 220 × 92 cm
  useEditorStore.getState().selectItem(null)
})

describe('planta: seleção e movimento', () => {
  it('clicar seleciona; clicar no fundo limpa a seleção', () => {
    render(<EditorPage />)
    const sofa = screen.getByRole('button', { name: /^Sofá de 3 lugares, 220 cm × 92 cm/ })
    const c = toPx(1.5, 1)
    fireEvent.pointerDown(sofa, { clientX: c.x, clientY: c.y, button: 0, pointerId: 1 })
    release(c)
    expect(useEditorStore.getState().selectedItemId).toBe(sofaId)
    expect(sofa).toHaveAttribute('aria-pressed', 'true')
    expect(sofa).toHaveFocus()
    expect(screen.getByTestId('selection-width')).toHaveTextContent('220 cm')

    const empty = toPx(4.5, 3.5)
    fireEvent.pointerDown(svg(), { clientX: empty.x, clientY: empty.y, button: 0, pointerId: 1 })
    release(empty)
    expect(useEditorStore.getState().selectedItemId).toBeNull()
    expect(sofa).not.toHaveFocus()
  })

  it('arrastar move o móvel e só altera o documento ao largar', () => {
    render(<EditorPage />)
    const sofa = screen.getByRole('button', { name: /^Sofá de 3 lugares,/ })
    const before = doc()
    const from = toPx(1.5, 1)
    const to = toPx(2.5, 2.2)
    drag(sofa, from, to)
    // durante o gesto: pré-visualização, documento intacto
    expect(doc()).toBe(before)
    expect(useEditorStore.getState().interaction.type).toBe('move')
    expect(statusBar().getByText('A mover')).toBeInTheDocument()
    release(to)
    const item = findItem(doc(), sofaId)
    expect(item.position.x).toBeCloseTo(2.5, 1)
    expect(item.position.z).toBeCloseTo(2.2, 1)
    expect(useEditorStore.getState().interaction).toBeNull()
  })

  it('cancelar o gesto não altera o documento', () => {
    render(<EditorPage />)
    const before = doc()
    drag(screen.getByRole('button', { name: /^Sofá de 3 lugares,/ }), toPx(1.5, 1), toPx(3, 3))
    fireEvent.pointerCancel(svg(), { pointerId: 1 })
    expect(doc()).toBe(before)
  })

  it('assinala móveis em conflito e atualiza a contagem em tempo real', () => {
    render(<EditorPage />)
    drag(screen.getByRole('button', { name: /^Sofá de 3 lugares,/ }), toPx(1.5, 1), toPx(-0.2, 1))
    expect(statusBar().getByText('1 erro')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Sofá.*em conflito/ })).toBeInTheDocument()
    release(toPx(-0.2, 1))
  })
})

describe('planta: pegas', () => {
  it('rodar pela pega ajusta ao passo de rotação', () => {
    render(<EditorPage />)
    act(() => useEditorStore.getState().selectItem(sofaId))
    const handle = document.querySelector('[data-handle="rotate"]')
    const target = toPx(3, 1.1) // à direita do centro → 90°
    drag(handle, toPx(1.5, 0.3), target)
    release(target)
    expect(findItem(doc(), sofaId).rotation).toBe(90)
  })

  it('redimensionar pela pega direita respeita os limites do modelo', () => {
    render(<EditorPage />)
    act(() => useEditorStore.getState().selectItem(sofaId))
    const handle = document.querySelector('[data-handle="resize:e"]')
    const target = toPx(4.9, 1)
    drag(handle, toPx(2.6, 1), target)
    release(target)
    const item = findItem(doc(), sofaId)
    expect(item.dimensions.width).toBe(2.8) // máximo do sofá de 3 lugares
    expect(item.position.x - item.dimensions.width / 2).toBeCloseTo(0.4) // aresta esquerda fixa
  })

  it('modelos de medidas fixas não mostram pegas de redimensionamento', () => {
    const bed = addCatalogItem('bed-double', { x: 3.5, z: 2.5 })
    render(<EditorPage />)
    act(() => useEditorStore.getState().selectItem(bed))
    expect(document.querySelectorAll('[data-handle^="resize"]')).toHaveLength(0)
    expect(document.querySelector('[data-handle="rotate"]')).not.toBeNull()
  })
})

describe('planta: vista', () => {
  it('a roda do rato faz zoom e "Enquadrar" repõe', async () => {
    const user = userEvent.setup()
    render(<EditorPage />)
    expect(screen.getByRole('button', { name: /Zoom 100%/ })).toBeInTheDocument()
    fireEvent.wheel(svg(), { deltaY: -200, clientX: 400, clientY: 300 })
    expect(screen.getByRole('button', { name: /Zoom 135%/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Enquadrar divisão' }))
    expect(screen.getByRole('button', { name: /Zoom 100%/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Aproximar' }))
    expect(screen.getByRole('button', { name: /Zoom 125%/ })).toBeInTheDocument()
  })

  it('dois dedos fazem zoom e cancelam o arrasto do móvel começado pelo primeiro', () => {
    render(<EditorPage />)
    const before = doc()
    const sofa = document.querySelector('[data-item-id]')
    const c = toPx(1.5, 1)
    const touch = (id, x, y) => ({ clientX: x, clientY: y, button: 0, pointerId: id, pointerType: 'touch' })
    fireEvent.pointerDown(sofa, touch(1, c.x, c.y))
    fireEvent.pointerMove(svg(), touch(1, c.x + 20, c.y))
    fireEvent.pointerDown(svg(), touch(2, c.x + 120, c.y))
    fireEvent.pointerMove(svg(), touch(2, c.x + 220, c.y))
    expect(screen.getByRole('button', { name: /Zoom 200%/ })).toBeInTheDocument()
    fireEvent.pointerUp(svg(), touch(2, c.x + 220, c.y))
    fireEvent.pointerMove(svg(), touch(1, c.x + 80, c.y))
    fireEvent.pointerUp(svg(), touch(1, c.x + 80, c.y))
    expect(doc()).toBe(before)
    expect(useEditorStore.getState().interaction).toBeNull()
  })

  it('arrastar o fundo desloca a vista sem mudar a escala nem o documento', () => {
    render(<EditorPage />)
    const before = doc()
    const scale = svg().dataset.scale
    const floor = screen.getByTestId('plan-floor')
    const sofaBefore = document.querySelector('.plan-item').getAttribute('transform')
    drag(floor, { x: 700, y: 500 }, { x: 650, y: 450 })
    release({ x: 650, y: 450 })
    expect(svg().dataset.scale).toBe(scale)
    expect(document.querySelector('.plan-item').getAttribute('transform')).not.toBe(sofaBefore)
    expect(doc()).toBe(before)
  })

  it('o botão de snap e a tecla G alternam o ajuste à grelha', async () => {
    const user = userEvent.setup()
    render(<EditorPage />)
    await user.click(screen.getByRole('button', { name: 'Snap à grelha ativo' }))
    expect(doc().settings.snapToGrid).toBe(false)
    await user.keyboard('g')
    expect(doc().settings.snapToGrid).toBe(true)
  })
})

describe('catálogo → planta', () => {
  it('o botão + adiciona e seleciona o móvel', async () => {
    const user = userEvent.setup()
    render(<EditorPage />)
    await user.click(screen.getByRole('button', { name: 'Adicionar Poltrona' }))
    const id = useEditorStore.getState().selectedItemId
    expect(findItem(doc(), id).catalogId).toBe('armchair')
    expect(screen.getByRole('button', { name: /Poltrona, 82 cm × 84 cm/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('arrastar um cartão para a planta coloca o móvel no ponto largado', () => {
    render(<EditorPage />)
    const card = screen.getByRole('article', { name: 'Planta grande' })
    const data = {}
    const dataTransfer = { setData: (k, v) => (data[k] = v), getData: (k) => data[k], effectAllowed: '', dropEffect: '' }
    fireEvent.dragStart(card, { dataTransfer })
    const at = toPx(4, 3)
    const area = document.querySelector('.plan-view')
    // O jsdom não implementa DragEvent; definimos as coordenadas à mão.
    const dragEvent = (type) => {
      const event = createEvent[type](area, { dataTransfer })
      Object.defineProperties(event, { clientX: { value: at.x }, clientY: { value: at.y } })
      return event
    }
    fireEvent(area, dragEvent('dragOver'))
    expect(document.querySelector('.plan-drop-ghost').getAttribute('points')).not.toMatch(/NaN/)
    fireEvent(area, dragEvent('drop'))
    const id = useEditorStore.getState().selectedItemId
    const plant = findItem(doc(), id)
    expect(plant.catalogId).toBe('plant')
    expect(plant.position.x).toBeCloseTo(4, 1)
    expect(plant.position.z).toBeCloseTo(3, 1)
    expect(useEditorStore.getState().catalogDragId).toBeNull()
  })
})

describe('teclado', () => {
  it('atalhos atuam no selecionado e não interferem com campos de texto', async () => {
    const user = userEvent.setup()
    render(<EditorPage />)
    act(() => useEditorStore.getState().selectItem(sofaId))

    await user.keyboard('r')
    expect(findItem(doc(), sofaId).rotation).toBe(15)
    await user.keyboard('{Shift>}R{/Shift}')
    expect(findItem(doc(), sofaId).rotation).toBe(0)

    const x = findItem(doc(), sofaId).position.x
    await user.keyboard('{ArrowRight}')
    expect(findItem(doc(), sofaId).position.x).toBeCloseTo(x + 0.1)

    // Num campo de texto, Backspace apaga texto e não o móvel.
    const field = screen.getByLabelText('X')
    await user.click(field)
    await user.keyboard('{Backspace}')
    expect(findItem(doc(), sofaId)).not.toBeNull()
    await user.keyboard('{Escape}')
    field.blur()

    await user.keyboard('{Control>}d{/Control}')
    const copy = useEditorStore.getState().selectedItemId
    expect(copy).not.toBe(sofaId)

    await user.keyboard('{Delete}')
    expect(findItem(doc(), copy)).toBeNull()
    expect(useEditorStore.getState().selectedItemId).toBeNull()
  })

  it('Escape limpa a seleção', async () => {
    const user = userEvent.setup()
    render(<EditorPage />)
    act(() => useEditorStore.getState().selectItem(sofaId))
    await user.keyboard('{Escape}')
    expect(useEditorStore.getState().selectedItemId).toBeNull()
  })
})

describe('inspetor do móvel', () => {
  it('valores exatos atualizam a planta; medidas fixas ficam desativadas', async () => {
    const user = userEvent.setup()
    render(<EditorPage />)
    act(() => useEditorStore.getState().selectItem(sofaId))
    const width = screen.getByLabelText('Comprimento')
    await user.clear(width)
    await user.type(width, '250{Enter}')
    expect(findItem(doc(), sofaId).dimensions.width).toBe(2.5)
    expect(screen.getByTestId('selection-width')).toHaveTextContent('250 cm')

    const rotation = screen.getByLabelText('Rotação')
    await user.clear(rotation)
    await user.type(rotation, '-90{Enter}')
    expect(findItem(doc(), sofaId).rotation).toBe(270)

    const bed = addCatalogItem('bed-double', { x: 3, z: 2.5 })
    act(() => useEditorStore.getState().selectItem(bed))
    expect(await screen.findByLabelText('Comprimento')).toBeDisabled()
    expect(screen.getByText('Este modelo tem medidas fixas.')).toBeInTheDocument()

    await user.click(within(screen.getByRole('complementary', { name: 'Propriedades' })).getByRole('button', { name: 'Eliminar' }))
    expect(findItem(doc(), bed)).toBeNull()
    expect(screen.getByRole('complementary', { name: 'Propriedades' })).toHaveTextContent('Tipo de divisão')
  })
})
