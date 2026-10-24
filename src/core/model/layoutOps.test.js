import { describe, expect, it } from 'vitest'
import { FURNITURE_CATALOG } from '@/data/catalog/furniture.js'
import { createFurnitureItem, createProject, getActiveLayout } from './factories.js'
import { addItem } from './itemOps.js'
import { addLayout, nextLayoutName, removeLayout, renameLayout, setActiveLayout } from './layoutOps.js'
import { LIMITS } from './constants.js'
import { duplicateProject, summarizeProject, uniqueProjectName } from './projectOps.js'
import { serializeProject, parseProject } from './serialization.js'

function projectWithSofa() {
  const project = createProject({ name: 'Sala' })
  const sofa = createFurnitureItem(FURNITURE_CATALOG[1], { position: { x: 2, z: 1 } })
  return addItem(project, sofa)
}

describe('disposições', () => {
  it('duplicar copia os móveis com ids novos e ativa a cópia', () => {
    const project = projectWithSofa()
    const original = getActiveLayout(project)
    const { project: next, layoutId } = addLayout(project, { fromLayoutId: original.id })
    const copy = next.layouts.find((l) => l.id === layoutId)
    expect(next.activeLayoutId).toBe(layoutId)
    expect(next.layouts.indexOf(copy)).toBe(1)
    expect(copy.name).toBe('Disposição 1 (cópia)')
    expect(copy.items).toHaveLength(1)
    expect(copy.items[0].id).not.toBe(original.items[0].id)
    expect(copy.items[0].position).toEqual(original.items[0].position)
  })

  it('uma disposição vazia recebe o próximo nome livre', () => {
    const project = createProject()
    const { project: next } = addLayout(project)
    expect(getActiveLayout(next).name).toBe('Disposição 2')
    expect(getActiveLayout(next).items).toEqual([])
    expect(nextLayoutName(next)).toBe('Disposição 3')
  })

  it('respeita o limite de disposições', () => {
    let project = createProject()
    for (let i = 1; i < LIMITS.layoutsPerProject; i++) project = addLayout(project).project
    const result = addLayout(project)
    expect(result.layoutId).toBeNull()
    expect(result.project).toBe(project)
  })

  it('mudar o nome ignora nomes vazios e iguais', () => {
    const project = createProject()
    const id = project.layouts[0].id
    expect(renameLayout(project, id, '   ')).toBe(project)
    expect(renameLayout(project, id, 'Disposição 1')).toBe(project)
    expect(renameLayout(project, id, '  Sofá   junto à janela ').layouts[0].name).toBe('Sofá junto à janela')
  })

  it('eliminar a ativa passa para a vizinha e nunca elimina a última', () => {
    let project = createProject()
    const first = project.layouts[0].id
    project = addLayout(project).project
    const second = project.activeLayoutId
    expect(removeLayout(createProject(), createProject().layouts[0].id)).toBeTruthy()
    const after = removeLayout(project, second)
    expect(after.layouts).toHaveLength(1)
    expect(after.activeLayoutId).toBe(first)
    expect(removeLayout(after, first)).toBe(after)
  })

  it('trocar de disposição só muda o id ativo', () => {
    let project = addLayout(createProject()).project
    const first = project.layouts[0].id
    expect(setActiveLayout(project, first).activeLayoutId).toBe(first)
    expect(setActiveLayout(project, 'nao-existe')).toBe(project)
  })
})

describe('projetos', () => {
  it('nomes livres para cópias', () => {
    expect(uniqueProjectName('Sala', [])).toBe('Sala')
    expect(uniqueProjectName('Sala', ['Sala'])).toBe('Sala (cópia)')
    expect(uniqueProjectName('Sala (cópia)', ['Sala', 'Sala (cópia)'])).toBe('Sala (cópia 2)')
  })

  it('duplicar dá um projeto independente com id e datas novos', () => {
    const project = projectWithSofa()
    const copy = duplicateProject(project, { name: 'Outra', now: '2030-01-01T00:00:00.000Z' })
    expect(copy.id).not.toBe(project.id)
    expect(copy.name).toBe('Outra')
    expect(copy.createdAt).toBe('2030-01-01T00:00:00.000Z')
    expect(copy.layouts).toEqual(project.layouts)
  })

  it('o resumo tem o que a lista precisa para a miniatura', () => {
    const summary = summarizeProject(projectWithSofa(), { savedAt: 'agora' })
    expect(summary).toMatchObject({ name: 'Sala', roomType: 'living', layoutCount: 1, itemCount: 1, updatedAt: 'agora' })
    expect(summary.preview.items[0]).toMatchObject({ catalogId: FURNITURE_CATALOG[1].id, position: { x: 2, z: 1 } })
  })

  it('qualquer móvel do catálogo pode ser guardado e reaberto (inclui o tapete de 1 cm)', () => {
    let project = createProject()
    for (const entry of FURNITURE_CATALOG) project = addItem(project, createFurnitureItem(entry, { position: { x: 2, z: 2 } }))
    const result = parseProject(serializeProject(project))
    expect(result.ok).toBe(true)
    expect(getActiveLayout(result.project).items).toHaveLength(FURNITURE_CATALOG.length)
  })
})
