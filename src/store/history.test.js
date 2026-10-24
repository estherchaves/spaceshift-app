import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createProject, findItem, getActiveLayout } from '@/core/model'
import { createLocalStorageRepository, createMemoryStorage } from '@/services/persistence'
import { startAutosave } from './autosave.js'
import { addCatalogItem, createLayout, redoChange, switchLayout, undoChange } from './commands.js'
import { resetEditorStore, useEditorStore } from './editorStore.js'
import { resetProjectStore, useProjectStore } from './projectStore.js'

const store = () => useProjectStore.getState()
const items = () => getActiveLayout(store().project).items

beforeEach(() => {
  resetProjectStore()
  resetEditorStore()
})

describe('anular e refazer', () => {
  it('cada ação é um passo, com nome legível', () => {
    const id = addCatalogItem('sofa-3', { x: 2, z: 2 })
    store().updateItem(id, { position: { x: 3, z: 2 } })
    store().updateItem(id, { rotation: 90 })
    expect(store().history.past.map((e) => e.label)).toEqual(['Adicionar Sofá de 3 lugares', 'Mover Sofá de 3 lugares', 'Rodar Sofá de 3 lugares'])
    undoChange()
    expect(findItem(store().project, id).rotation).toBe(0)
    undoChange()
    expect(findItem(store().project, id).position.x).toBe(2)
    redoChange()
    expect(findItem(store().project, id).position.x).toBe(3)
  })

  it('alterações sem efeito não criam passos', () => {
    store().renameProject('Sala de estar')
    store().updateRoom({ width: store().project.room.width })
    expect(store().history.past).toHaveLength(0)
  })

  it('anular a adição de um móvel tira-o da seleção', () => {
    const id = addCatalogItem('armchair')
    expect(useEditorStore.getState().selectedItemId).toBe(id)
    undoChange()
    expect(items()).toHaveLength(0)
    expect(useEditorStore.getState().selectedItemId).toBeNull()
  })

  it('não anula a meio de um gesto', () => {
    addCatalogItem('armchair')
    useEditorStore.getState().setInteraction({ type: 'move', itemId: 'x', preview: {} })
    expect(undoChange()).toBe(false)
    expect(items()).toHaveLength(1)
  })

  it('trocar de disposição não é um passo', () => {
    const first = store().project.activeLayoutId
    addCatalogItem('armchair')
    createLayout({ copyCurrent: false })
    const second = store().project.activeLayoutId
    switchLayout(first)
    expect(store().history.past.map((e) => e.label)).toEqual(['Adicionar Poltrona', 'Nova disposição'])
    undoChange()
    expect(store().project.layouts).toHaveLength(1)
    redoChange()
    expect(store().project.layouts.map((l) => l.id)).toContain(second)
    // Refazer repõe o projeto tal como estava ao anular (a ver a primeira).
    expect(store().project.activeLayoutId).toBe(first)
  })

  it('o seletor de cor contínuo dá um só passo', () => {
    const id = addCatalogItem('armchair')
    for (const color of ['#111111', '#222222', '#333333']) store().updateItem(id, { color })
    expect(store().history.past).toHaveLength(2)
  })
})

describe('estado de gravação', () => {
  afterEach(() => vi.useRealTimers())

  it('anular até ao estado gravado deixa de ter alterações por guardar', () => {
    const project = createProject({ name: 'Gravado' })
    store().loadProject(project)
    store().renameProject('Outro nome')
    expect(store().dirty).toBe(true)
    expect(store().saveStatus).toBe('unsaved')
    undoChange()
    expect(store().dirty).toBe(false)
    expect(store().saveStatus).toBe('saved')
  })

  it('a gravação automática junta várias alterações numa escrita', async () => {
    vi.useFakeTimers()
    const repository = createLocalStorageRepository({ storage: createMemoryStorage() })
    const save = vi.spyOn(repository, 'save')
    store().loadProject(createProject({ name: 'Auto' }))
    const autosave = startAutosave({ repository, delay: 500 })
    store().renameProject('Auto 1')
    store().renameProject('Auto 2')
    expect(save).not.toHaveBeenCalled()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })
    expect(save).toHaveBeenCalledTimes(1)
    expect(store().saveStatus).toBe('saved')
    expect(store().lastSavedAt).toBeTruthy()
    expect((await repository.get(store().project.id)).project.name).toBe('Auto 2')
    autosave.stop()
  })

  it('um erro de gravação fica visível e a próxima gravação tenta outra vez', async () => {
    const repository = createLocalStorageRepository({ storage: createMemoryStorage() })
    vi.spyOn(repository, 'save').mockRejectedValueOnce(new Error('Sem espaço'))
    store().loadProject(createProject())
    const autosave = startAutosave({ repository })
    store().renameProject('Novo')
    expect(await autosave.flush()).toBe(false)
    expect(store().saveStatus).toBe('error')
    expect(store().saveError).toBe('Sem espaço')
    expect(await autosave.flush()).toBe(true)
    expect(store().saveStatus).toBe('saved')
    autosave.stop()
  })
})
