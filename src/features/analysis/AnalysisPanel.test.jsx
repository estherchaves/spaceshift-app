import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createFurnitureItem, getActiveLayout } from '@/core/model'
import { getCatalogEntry } from '@/data/catalog/furniture.js'
import { EditorPage } from '@/pages/EditorPage/EditorPage.jsx'
import { resetEditorStore, useEditorStore } from '@/store/editorStore.js'
import { resetProjectStore, useProjectStore } from '@/store/projectStore.js'

beforeEach(() => {
  resetProjectStore()
  resetEditorStore()
})

const statusBar = () => within(screen.getByRole('contentinfo', { name: 'Estado do projeto' }))
const panel = () => within(screen.getByRole('region', { name: 'Análise da disposição' }))

function addItems(...items) {
  const created = items.map(([id, x, z, extra = {}]) => createFurnitureItem(getCatalogEntry(id), { position: { x, z }, ...extra }))
  act(() => {
    useProjectStore.setState((state) => {
      const project = structuredClone(state.project)
      getActiveLayout(project).items.push(...created)
      return { project }
    })
  })
  return created
}

describe('painel de análise', () => {
  it('abre a partir da barra inferior e separa erros de avisos', async () => {
    const user = userEvent.setup()
    render(<EditorPage />)
    // Estante 10 cm dentro da parede direita; sofá a 40 cm da parede superior.
    addItems(['bookshelf', 5 - 0.45 + 0.1, 2], ['sofa-3', 2, 0.4 + 0.46])
    expect(statusBar().getByText('1 erro')).toBeInTheDocument()
    expect(statusBar().getByText('1 aviso')).toBeInTheDocument()

    await user.click(statusBar().getByRole('button', { name: /Análise: 1 erro e 1 aviso/ }))
    expect(panel().getByText('Erros · geometria')).toBeInTheDocument()
    expect(panel().getByText('Estante ultrapassa 10 cm na parede direita.')).toBeInTheDocument()
    expect(panel().getByText('Avisos · circulação')).toBeInTheDocument()
    expect(panel().getByText(/Passagem de 40 cm entre Sofá de 3 lugares e a parede superior/)).toBeInTheDocument()
    expect(panel().getByText(/não uma garantia de conformidade legal/)).toBeInTheDocument()
  })

  it('clicar num problema seleciona o móvel e «Trazer para dentro» corrige a posição', async () => {
    const user = userEvent.setup()
    render(<EditorPage />)
    const [shelf] = addItems(['bookshelf', 5 - 0.45 + 0.1, 2])
    act(() => useEditorStore.getState().setAnalysisOpen(true))

    await user.click(panel().getByRole('button', { name: /Fora da divisão/ }))
    expect(useEditorStore.getState()).toMatchObject({ selectedItemId: shelf.id, focusedIssueId: `outside:${shelf.id}` })
    expect(document.querySelector(`[data-issue-id="outside:${shelf.id}"]`)).toHaveAttribute('data-focused', 'true')

    await user.click(panel().getByRole('button', { name: 'Trazer para dentro' }))
    const moved = getActiveLayout(useProjectStore.getState().project).items[0]
    expect(moved.position.x).toBeCloseTo(4.55)
    expect(statusBar().getByText('Sem problemas')).toBeInTheDocument()
  })

  it('a passagem mínima é configurável no painel', async () => {
    const user = userEvent.setup()
    render(<EditorPage />)
    addItems(['sofa-3', 2, 0.4 + 0.46])
    act(() => useEditorStore.getState().setAnalysisOpen(true))
    const field = panel().getByLabelText('Passagem mínima')
    await user.clear(field)
    await user.type(field, '0,35{Enter}')
    expect(useProjectStore.getState().project.settings.circulationMin).toBe(0.35)
    expect(statusBar().getByText('Sem problemas')).toBeInTheDocument()
  })

  it('as cotas das passagens aparecem para o móvel selecionado, mesmo com o painel fechado', () => {
    render(<EditorPage />)
    const [sofa] = addItems(['sofa-3', 2, 0.4 + 0.46])
    expect(document.querySelector('.analysis-gap')).toBeNull()
    act(() => useEditorStore.getState().selectItem(sofa.id))
    expect(document.querySelector('.analysis-gap text')).toHaveTextContent('40 cm')
  })

  it('a zona de circulação mostra-se e esconde-se na planta', () => {
    render(<EditorPage />)
    expect(screen.queryByTestId('circulation-zone')).toBeNull()
    act(() => useEditorStore.getState().setShowCirculation(true))
    expect(screen.getByTestId('circulation-zone')).toBeInTheDocument()
  })
})
