import { describe, expect, it } from 'vitest'
import {
  addItem,
  createFurnitureItem,
  createProject,
  duplicateItem,
  findItem,
  getActiveLayout,
  removeItem,
  updateItem,
  validateProject,
} from './index.js'

const entry = {
  id: 'sofa-3',
  name: 'Sofá',
  category: 'sofas',
  dimensions: { width: 2.2, depth: 0.9, height: 0.85 },
  color: '#999999',
  finishes: [],
}
const bounds = { min: { width: 1.9, depth: 0.85, height: 0.75 }, max: { width: 2.8, depth: 1.05, height: 0.9 } }

function withSofa() {
  const project = createProject()
  const item = createFurnitureItem(entry, { position: { x: 2, z: 1 } })
  return { project: addItem(project, item), id: item.id }
}

describe('operações sobre móveis', () => {
  it('adiciona e encontra móveis na disposição ativa', () => {
    const { project, id } = withSofa()
    expect(getActiveLayout(project).items).toHaveLength(1)
    expect(findItem(project, id).name).toBe('Sofá')
    expect(validateProject(project).valid).toBe(true)
  })

  it('não altera o projeto original (imutabilidade)', () => {
    const base = createProject()
    const next = addItem(base, createFurnitureItem(entry))
    expect(getActiveLayout(base).items).toHaveLength(0)
    expect(next).not.toBe(base)
  })

  it('atualiza com valores sanitizados', () => {
    const { project, id } = withSofa()
    const next = updateItem(
      project,
      id,
      { position: { x: 2.12345, z: 99 }, rotation: -45, dimensions: { width: 5, depth: 0.95 } },
      { bounds },
    )
    const item = findItem(next, id)
    expect(item.position).toEqual({ x: 2.123, z: 6 }) // z limitado a depth + 2 m
    expect(item.rotation).toBe(315)
    expect(item.dimensions).toEqual({ width: 2.8, depth: 0.95, height: 0.85 })
    expect(validateProject(next).valid).toBe(true)
  })

  it('devolve o mesmo projeto quando nada muda ou o móvel não existe', () => {
    const { project, id } = withSofa()
    expect(updateItem(project, id, { position: { x: 2, z: 1 } })).toBe(project)
    expect(updateItem(project, 'nope', { rotation: 90 })).toBe(project)
    expect(removeItem(project, 'nope')).toBe(project)
    expect(updateItem(project, id, { color: 'vermelho', dimensions: { width: NaN } })).toBe(project)
  })

  it('remove móveis', () => {
    const { project, id } = withSofa()
    expect(getActiveLayout(removeItem(project, id)).items).toHaveLength(0)
  })

  it('duplica com novo id, deslocado e desbloqueado', () => {
    const { project, id } = withSofa()
    const locked = updateItem(project, id, { locked: true })
    const { project: next, itemId } = duplicateItem(locked, id)
    expect(itemId).not.toBe(id)
    const copy = findItem(next, itemId)
    expect(copy.position).toEqual({ x: 2.3, z: 1.3 })
    expect(copy.locked).toBe(false)
    expect(copy.dimensions).not.toBe(findItem(next, id).dimensions)
    expect(duplicateItem(project, 'nope')).toEqual({ project, itemId: null })
  })
})
