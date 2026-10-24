import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createFurnitureItem, getActiveLayout } from '@/core/model'
import { getCatalogEntry } from '@/data/catalog/furniture.js'
import { resetEditorStore, useEditorStore } from '@/store/editorStore.js'
import { resetProjectStore, useProjectStore } from '@/store/projectStore.js'
import { EditorPage } from './EditorPage.jsx'

beforeEach(() => {
  resetProjectStore()
  resetEditorStore()
})

const statusBar = () => within(screen.getByRole('contentinfo', { name: 'Estado do projeto' }))

describe('EditorPage: estrutura', () => {
  it('mostra todas as áreas do editor', () => {
    render(<EditorPage />)
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Catálogo de móveis' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Propriedades' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /Planta da divisão: Sala de estar, 5,00 m por 4,00 m/ })).toBeInTheDocument()
    expect(statusBar().getByText('5,00 m × 4,00 m')).toBeInTheDocument()
    expect(statusBar().getByText('20,00 m²')).toBeInTheDocument()
    expect(statusBar().getByText('Sem conflitos')).toBeInTheDocument()
  })

  it('ações de fases seguintes estão desativadas e explicam porquê', async () => {
    const user = userEvent.setup()
    render(<EditorPage />)
    const save = screen.getByRole('button', { name: /Guardar/ })
    expect(save).toHaveAttribute('aria-disabled', 'true')
    expect(save).toHaveAccessibleDescription(/Fase 7/)
    expect(screen.getByRole('button', { name: 'Anular' })).toHaveAccessibleDescription(/Fase 7/)
    expect(screen.getByRole('radio', { name: /3D/ })).toHaveAttribute('aria-disabled', 'true')
    await user.click(screen.getByRole('radio', { name: /3D/ }))
    expect(useEditorStore.getState().viewMode).toBe('2d')
  })
})

describe('EditorPage: propriedades da divisão', () => {
  it('alterar as medidas atualiza a planta, as cotas e a barra inferior', async () => {
    const user = userEvent.setup()
    render(<EditorPage />)
    const width = screen.getByLabelText('Comprimento')
    await user.clear(width)
    await user.type(width, '6,5{Enter}')
    expect(useProjectStore.getState().project.room.width).toBe(6.5)
    expect(screen.getByTestId('dimension-Comprimento')).toHaveTextContent('6,50 m')
    expect(statusBar().getByText('6,50 m × 4,00 m')).toBeInTheDocument()
    expect(statusBar().getByText('26,00 m²')).toBeInTheDocument()
    expect(screen.getByText('Alterações por guardar')).toBeInTheDocument()
  })

  it('valores fora dos limites são ajustados e texto inválido é ignorado', async () => {
    const user = userEvent.setup()
    render(<EditorPage />)
    const depth = screen.getByLabelText('Largura')
    await user.clear(depth)
    await user.type(depth, '99{Enter}')
    expect(useProjectStore.getState().project.room.depth).toBe(30)
    await user.clear(depth)
    await user.type(depth, 'abc')
    expect(depth).toHaveAttribute('aria-invalid', 'true')
    await user.tab()
    expect(depth).toHaveValue('30')
    expect(useProjectStore.getState().project.room.depth).toBe(30)
  })

  it('setas do teclado ajustam o valor e Escape cancela a edição', async () => {
    const user = userEvent.setup()
    render(<EditorPage />)
    const width = screen.getByLabelText('Comprimento')
    await user.click(width)
    await user.keyboard('{ArrowUp}')
    expect(useProjectStore.getState().project.room.width).toBe(5.1)
    await user.keyboard('{Shift>}{ArrowDown}{/Shift}')
    expect(useProjectStore.getState().project.room.width).toBe(4.1)
    await user.clear(width)
    await user.type(width, '9{Escape}')
    expect(width).toHaveValue('4,1')
  })

  it('muda o material do chão, a cor das paredes e as definições do editor', async () => {
    const user = userEvent.setup()
    render(<EditorPage />)
    await user.selectOptions(screen.getByLabelText('Material do chão'), 'walnut')
    expect(screen.getByTestId('plan-floor')).toHaveAttribute('fill', '#7a5a43')
    await user.click(screen.getByRole('button', { name: 'Sálvia' }))
    expect(useProjectStore.getState().project.room.wallColor).toBe('#cfd4cc')
    expect(screen.getByRole('button', { name: 'Sálvia' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('switch', { name: 'Ajustar à grelha' }))
    expect(useProjectStore.getState().project.settings.snapToGrid).toBe(false)
    await user.selectOptions(screen.getByLabelText('Grelha'), '0.25')
    expect(statusBar().getByText('Grelha 25 cm · Snap desligado')).toBeInTheDocument()
  })

  it('renomeia o projeto na barra superior (Enter confirma, Escape cancela)', async () => {
    const user = userEvent.setup()
    render(<EditorPage />)
    await user.click(screen.getByRole('button', { name: /Nome do projeto: Sala de estar/ }))
    const input = screen.getByRole('textbox', { name: 'Nome do projeto' })
    await user.clear(input)
    await user.type(input, 'Casa da praia{Enter}')
    expect(screen.getByRole('button', { name: /Nome do projeto: Casa da praia/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Nome do projeto/ }))
    await user.type(screen.getByRole('textbox', { name: 'Nome do projeto' }), ' X{Escape}')
    expect(useProjectStore.getState().project.name).toBe('Casa da praia')
  })
})

describe('EditorPage: catálogo', () => {
  it('pesquisa e filtra por categoria, com estado vazio recuperável', async () => {
    const user = userEvent.setup()
    render(<EditorPage />)
    const catalog = within(screen.getByRole('complementary', { name: 'Catálogo de móveis' }))
    expect(catalog.getAllByRole('article').length).toBeGreaterThanOrEqual(15)

    await user.click(catalog.getByRole('button', { name: 'Camas' }))
    expect(catalog.getAllByRole('article')).toHaveLength(3)

    await user.type(catalog.getByRole('searchbox', { name: 'Pesquisar móveis' }), 'sofá')
    expect(catalog.queryAllByRole('article')).toHaveLength(0)
    expect(catalog.getByText('Nenhum móvel encontrado')).toBeInTheDocument()

    await user.click(catalog.getByRole('button', { name: 'Limpar filtros' }))
    expect(catalog.getAllByRole('article').length).toBeGreaterThanOrEqual(15)
    expect(catalog.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('mostra as medidas de cada móvel em centímetros', () => {
    render(<EditorPage />)
    const card = within(screen.getByRole('article', { name: 'Sofá de 3 lugares' }))
    expect(card.getByText('220 × 92 × 84 cm')).toBeInTheDocument()
  })
})

describe('EditorPage: sincronização com o modelo', () => {
  it('desenha os móveis do projeto e conta conflitos reais', () => {
    render(<EditorPage />)
    act(() => {
      useProjectStore.setState((state) => {
        const project = structuredClone(state.project)
        getActiveLayout(project).items.push(
          createFurnitureItem(getCatalogEntry('sofa-3'), { position: { x: 1.2, z: 0.5 } }),
          createFurnitureItem(getCatalogEntry('armchair'), { position: { x: 2.4, z: 0.5 } }),
        )
        return { project }
      })
    })
    expect(document.querySelectorAll('.plan-item')).toHaveLength(2)
    expect(statusBar().getByText('1 conflito')).toBeInTheDocument()
  })
})

describe('EditorPage: navegação em ecrãs pequenos', () => {
  it('os separadores escolhem o painel visível e respondem às setas', async () => {
    const user = userEvent.setup()
    const { container } = render(<EditorPage />)
    const tabs = within(screen.getByRole('radiogroup', { name: 'Painel visível' }))
    await user.click(tabs.getByRole('radio', { name: 'Catálogo' }))
    expect(container.querySelector('.app-shell')).toHaveAttribute('data-mobile-panel', 'catalog')
    await user.keyboard('{ArrowRight}')
    expect(useEditorStore.getState().mobilePanel).toBe('plan')
    expect(tabs.getByRole('radio', { name: 'Planta' })).toHaveFocus()
  })
})
