import { beforeEach, describe, expect, it } from 'vitest'
import { createFurnitureItem, validateProject } from '@/core/model'
import { getCatalogEntry } from '@/data/catalog/furniture.js'
import { resetEditorStore, useEditorStore } from './editorStore.js'
import { resetProjectStore, useProjectStore } from './projectStore.js'
import { computeLayoutMetrics } from './selectors.js'

beforeEach(() => {
  resetProjectStore()
  resetEditorStore()
})

describe('projectStore', () => {
  it('começa com um projeto válido e sem alterações', () => {
    const { project, dirty } = useProjectStore.getState()
    expect(validateProject(project).valid).toBe(true)
    expect(dirty).toBe(false)
  })

  it('altera a divisão de forma segura e marca alterações', () => {
    useProjectStore.getState().updateRoom({ width: 6.25, depth: 100 })
    const { project, dirty } = useProjectStore.getState()
    expect(project.room.width).toBe(6.25)
    expect(project.room.depth).toBe(30)
    expect(dirty).toBe(true)
    expect(validateProject(project).valid).toBe(true)
  })

  it('não cria alterações quando nada muda', () => {
    const before = useProjectStore.getState().project
    useProjectStore.getState().updateRoom({ width: before.room.width })
    useProjectStore.getState().renameProject('   ')
    useProjectStore.getState().updateSettings({ snapToGrid: 'talvez' })
    expect(useProjectStore.getState().project).toBe(before)
    expect(useProjectStore.getState().dirty).toBe(false)
  })

  it('renomeia o projeto e atualiza a data de modificação', () => {
    const before = useProjectStore.getState().project.updatedAt
    useProjectStore.getState().renameProject('  Quarto   principal ')
    const { project } = useProjectStore.getState()
    expect(project.name).toBe('Quarto principal')
    expect(Date.parse(project.updatedAt)).toBeGreaterThanOrEqual(Date.parse(before))
  })

  it('atualiza as definições do editor', () => {
    useProjectStore.getState().updateSettings({ gridSize: 0.25, snapToGrid: false })
    expect(useProjectStore.getState().project.settings).toMatchObject({ gridSize: 0.25, snapToGrid: false })
  })
})

describe('editorStore', () => {
  it('troca a vista e o painel móvel', () => {
    useEditorStore.getState().setViewMode('3d')
    useEditorStore.getState().setMobilePanel('catalog')
    expect(useEditorStore.getState()).toMatchObject({ viewMode: '3d', mobilePanel: 'catalog' })
  })
})

describe('computeLayoutMetrics', () => {
  const room = { width: 4, depth: 3 }
  const place = (id, x, z, rotation = 0) => createFurnitureItem(getCatalogEntry(id), { position: { x, z }, rotation })

  it('sem móveis não há conflitos', () => {
    expect(computeLayoutMetrics(room, [])).toMatchObject({ roomArea: 12, occupiedArea: 0, conflicts: 0 })
  })

  it('conta móveis fora da divisão e sobreposições', () => {
    const items = [place('sofa-3', 1.2, 0.5), place('armchair', 2.4, 0.5), place('plant', 3.9, 2.9)]
    expect(computeLayoutMetrics(room, items)).toMatchObject({ outside: 1, overlaps: 1, conflicts: 2, itemCount: 3 })
  })

  it('tapetes e candeeiros suspensos não colidem com móveis', () => {
    const items = [place('rug', 2, 1.5), place('coffee-table', 2, 1.5), place('pendant-lamp', 2, 1.5)]
    expect(computeLayoutMetrics(room, items).conflicts).toBe(0)
  })
})
