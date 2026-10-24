import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { worldToScreen } from '@/core/coordinates/viewport.js'
import { createProject, findItem, getActiveLayout } from '@/core/model'
import { createExampleProject } from '@/data/examples/exampleProject.js'
import { fitRoom } from '@/features/editor2d/planGeometry.js'
import { renderPlanSheet } from '@/features/export/exportImages.jsx'
import { getRepository } from '@/services/persistence'
import { addCatalogItem } from '@/store/commands.js'
import { resetEditorStore } from '@/store/editorStore.js'
import { useProjectStore } from '@/store/projectStore.js'
import { TEST_ELEMENT_SIZE } from '@/test/setup.js'
import { EditorPage } from './EditorPage.jsx'

const store = () => useProjectStore.getState()
const toPx = (x, z) => worldToScreen(fitRoom(store().project.room, TEST_ELEMENT_SIZE), { x, z })
const svg = () => document.querySelector('.plan-svg')

beforeEach(() => {
  resetEditorStore()
  store().loadProject(createProject({ name: 'Teste' }))
})

describe('anular e refazer no editor', () => {
  it('um arrasto inteiro é um só passo e Ctrl+Z desfaz', async () => {
    const user = userEvent.setup()
    render(<EditorPage />)
    let id
    act(() => {
      id = addCatalogItem('sofa-3', { x: 1.5, z: 1 })
    })
    const start = findItem(store().project, id).position
    const sofa = screen.getByRole('button', { name: /^Sofá de 3 lugares,/ })
    const from = toPx(1.5, 1)
    fireEvent.pointerDown(sofa, { clientX: from.x, clientY: from.y, button: 0, pointerId: 1 })
    for (const t of [0.25, 0.5, 0.75, 1]) {
      const p = toPx(1.5 + t * 1.5, 1 + t * 2)
      fireEvent.pointerMove(svg(), { clientX: p.x, clientY: p.y, pointerId: 1 })
    }
    const to = toPx(3, 3)
    fireEvent.pointerUp(svg(), { clientX: to.x, clientY: to.y, pointerId: 1 })
    // O snap encosta a aresta à grelha, por isso o centro fica perto de (3, 3).
    const moved = findItem(store().project, id).position
    expect(moved.x).toBeCloseTo(3, 1)
    expect(moved.z).toBeCloseTo(3, 1)
    expect(store().history.past.map((e) => e.label)).toEqual(['Adicionar Sofá de 3 lugares', 'Mover Sofá de 3 lugares'])
    expect(screen.getByRole('button', { name: 'Anular: Mover Sofá de 3 lugares' })).not.toHaveAttribute('aria-disabled')

    await user.keyboard('{Control>}z{/Control}')
    expect(findItem(store().project, id).position).toEqual(start)
    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}')
    expect(findItem(store().project, id).position).toEqual(moved)
    await user.click(screen.getByRole('button', { name: 'Anular: Mover Sofá de 3 lugares' }))
    expect(findItem(store().project, id).position).toEqual(start)
  })

  it('Ctrl+Z dentro de um campo de texto não mexe no projeto', async () => {
    const user = userEvent.setup()
    render(<EditorPage />)
    act(() => {
      addCatalogItem('armchair')
    })
    await user.click(screen.getByRole('button', { name: /Nome do projeto/ }))
    await user.keyboard('{Control>}z{/Control}')
    expect(getActiveLayout(store().project).items).toHaveLength(1)
  })
})

describe('gravação no editor', () => {
  it('Ctrl+S grava já e o indicador mostra a hora', async () => {
    const user = userEvent.setup()
    render(<EditorPage />)
    act(() => {
      addCatalogItem('armchair')
    })
    expect(screen.getByText('Alterações por guardar')).toBeInTheDocument()
    await user.keyboard('{Control>}s{/Control}')
    expect(await screen.findByText(/^Guardado às \d\d:\d\d$/)).toBeInTheDocument()
    const saved = await getRepository().get(store().project.id)
    expect(getActiveLayout(saved.project).items).toHaveLength(1)
    expect(screen.getByRole('button', { name: /Guardar/ })).toHaveAttribute('aria-disabled', 'true')
  })
})

describe('disposições e comparação', () => {
  beforeEach(() => {
    store().loadProject(createExampleProject())
  })

  it('cria uma cópia da disposição, troca entre elas e compara lado a lado', async () => {
    const user = userEvent.setup()
    render(<EditorPage />)
    const tabs = () => screen.getAllByRole('tab')
    expect(tabs().map((t) => t.textContent)).toEqual(['Sofá virado para a TV9', 'Sofá de canto10'])

    await user.click(screen.getByRole('button', { name: 'Nova disposição' }))
    await user.click(screen.getByRole('menuitem', { name: 'Copiar a disposição atual' }))
    expect(tabs()).toHaveLength(3)
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('Sofá virado para a TV (cópia)')

    await user.click(screen.getByRole('tab', { name: /Sofá de canto/ }))
    expect(getActiveLayout(store().project).name).toBe('Sofá de canto')

    await user.click(screen.getByRole('button', { name: /^Comparar/ }))
    const compare = screen.getByRole('region', { name: 'Comparar disposições' })
    const cards = within(compare).getAllByRole('article')
    expect(cards).toHaveLength(3)
    expect(cards[0]).toHaveAccessibleName(/Sofá virado para a TV: \d+ pontos/)
    // A cópia fica logo a seguir à original.
    expect(cards[1]).toHaveAccessibleName(/Sofá virado para a TV \(cópia\)/)
    expect(within(cards[2]).getByText('A editar')).toBeInTheDocument()
    expect(within(cards[2]).getByText(/\d+ avisos?/)).toBeInTheDocument()

    await user.click(within(cards[0]).getByRole('button', { name: 'Abrir esta disposição' }))
    expect(screen.queryByRole('region', { name: 'Comparar disposições' })).not.toBeInTheDocument()
    expect(getActiveLayout(store().project).name).toBe('Sofá virado para a TV')
  })

  it('eliminar uma disposição pede confirmação e pode ser anulado', async () => {
    const user = userEvent.setup()
    render(<EditorPage />)
    await user.click(screen.getByRole('button', { name: 'Mais ações para Sofá virado para a TV' }))
    await user.click(screen.getByRole('menuitem', { name: 'Eliminar' }))
    await user.click(screen.getByRole('button', { name: 'Eliminar disposição' }))
    expect(store().project.layouts).toHaveLength(1)
    act(() => store().undo())
    await waitFor(() => expect(screen.getAllByRole('tab')).toHaveLength(2))
  })

  it('Comparar precisa de duas disposições', () => {
    store().loadProject(createProject())
    render(<EditorPage />)
    expect(screen.getByRole('button', { name: /^Comparar/ })).toHaveAccessibleDescription(/segunda disposição/)
  })
})

describe('exportação', () => {
  it('a folha da planta é um SVG autónomo com o projeto, a disposição e os móveis', () => {
    const project = createExampleProject()
    const svgText = renderPlanSheet(project, project.layouts[0], new Date('2026-10-24T12:00:00Z'))
    expect(svgText).toMatch(/^<\?xml/)
    expect(svgText).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(svgText).toContain('Sala de exemplo')
    expect(svgText).toContain('Sofá virado para a TV · Sala de estar · 24 de outubro de 2026')
    expect(svgText).toContain('MÓVEIS (9)')
    expect(svgText).toContain('5,20 m')
    expect(svgText).toContain('@font-face')
    expect(svgText).not.toMatch(/href="http/)
  })
})
