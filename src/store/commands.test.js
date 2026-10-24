import { beforeEach, describe, expect, it } from 'vitest'
import { findItem, getActiveLayout } from '@/core/model'
import { checkInsideRoom } from '@/core/geometry'
import {
  addCatalogItem,
  clearSelection,
  deleteSelected,
  duplicateSelected,
  nudgeSelected,
  rotateSelected,
} from './commands.js'
import { resetEditorStore, useEditorStore } from './editorStore.js'
import { resetProjectStore, useProjectStore } from './projectStore.js'

const doc = () => useProjectStore.getState().project
const item = (id) => findItem(doc(), id)
const selected = () => useEditorStore.getState().selectedItemId

beforeEach(() => {
  resetProjectStore()
  resetEditorStore()
})

describe('comandos do editor', () => {
  it('adicionar seleciona o novo móvel, coloca-o dentro da divisão e mostra a planta', () => {
    useEditorStore.getState().setMobilePanel('catalog')
    const id = addCatalogItem('sofa-3')
    expect(selected()).toBe(id)
    expect(useEditorStore.getState().mobilePanel).toBe('plan')
    expect(checkInsideRoom(item(id), doc().room).inside).toBe(true)
  })

  it('adicionar vários móveis procura espaços livres sem sobreposição', () => {
    const a = addCatalogItem('dining-table')
    const b = addCatalogItem('dining-table')
    expect(item(a).position).not.toEqual(item(b).position)
  })

  it('largar numa posição respeita-a, com snap', () => {
    const id = addCatalogItem('armchair', { x: 1.234, z: 2.07 })
    // poltrona 82 × 84 cm: a aresta esquerda/superior encaixa na grelha de 10 cm
    expect(item(id).position.x - 0.41).toBeCloseTo(0.8)
    expect(item(id).position.z - 0.42).toBeCloseTo(1.6)
  })

  it('posições inválidas (sem coordenadas) usam a procura de espaço livre', () => {
    const id = addCatalogItem('plant', { x: NaN, z: undefined })
    expect(Number.isFinite(item(id).position.x)).toBe(true)
    expect(checkInsideRoom(item(id), doc().room).inside).toBe(true)
  })

  it('ignora ids de catálogo desconhecidos', () => {
    expect(addCatalogItem('nave-espacial')).toBeNull()
    expect(getActiveLayout(doc()).items).toHaveLength(0)
  })

  it('duplicar seleciona a cópia; eliminar remove e limpa a seleção', () => {
    const id = addCatalogItem('plant')
    const copy = duplicateSelected()
    expect(selected()).toBe(copy)
    expect(getActiveLayout(doc()).items).toHaveLength(2)
    expect(deleteSelected()).toBe(true)
    expect(selected()).toBeNull()
    expect(item(copy)).toBeNull()
    expect(item(id)).not.toBeNull()
  })

  it('rodar usa o passo de rotação nos dois sentidos', () => {
    const id = addCatalogItem('desk')
    rotateSelected(1)
    expect(item(id).rotation).toBe(15)
    rotateSelected(-1)
    rotateSelected(-1)
    expect(item(id).rotation).toBe(345)
  })

  it('setas deslocam um passo de grelha, 1 cm sem snap e ×10 com Shift', () => {
    const id = addCatalogItem('plant', { x: 2, z: 2 })
    const start = { ...item(id).position }
    nudgeSelected(1, 0)
    expect(item(id).position.x).toBeCloseTo(start.x + 0.1)
    nudgeSelected(0, -1, true)
    expect(item(id).position.z).toBeCloseTo(start.z - 1)
    useProjectStore.getState().updateSettings({ snapToGrid: false })
    nudgeSelected(-1, 0)
    expect(item(id).position.x).toBeCloseTo(start.x + 0.09)
  })

  it('móveis bloqueados não se movem, não rodam e não são eliminados', () => {
    const id = addCatalogItem('wardrobe')
    useProjectStore.getState().updateItem(id, { locked: true })
    const before = item(id)
    nudgeSelected(1, 0)
    rotateSelected(1)
    expect(deleteSelected()).toBe(false)
    expect(item(id)).toEqual(before)
  })

  it('sem seleção os comandos não fazem nada', () => {
    clearSelection()
    const before = doc()
    nudgeSelected(1, 0)
    rotateSelected(1)
    expect(duplicateSelected()).toBeNull()
    expect(deleteSelected()).toBe(false)
    expect(doc()).toBe(before)
  })
})
