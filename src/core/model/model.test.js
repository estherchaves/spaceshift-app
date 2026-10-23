import { describe, expect, it } from 'vitest'
import {
  createFurnitureItem,
  createLayout,
  createProject,
  getActiveLayout,
  migrateProject,
  occupancyRatio,
  occupiedArea,
  parseProject,
  PROJECT_FILE_FORMAT,
  roomArea,
  SCHEMA_VERSION,
  serializeProject,
  validateProject,
} from './index.js'

const sofaEntry = {
  id: 'sofa-3',
  name: 'Sofá de 3 lugares',
  category: 'sofas',
  dimensions: { width: 2.2, depth: 0.9, height: 0.85 },
  resizable: null,
  color: '#8a8f94',
  finishes: ['linen', 'velvet'],
  price: 899,
  plan2d: 'sofa',
  model3d: 'sofa',
}

function sampleProject() {
  const project = createProject({ name: 'Sala da Ana', roomType: 'living' })
  getActiveLayout(project).items.push(
    createFurnitureItem(sofaEntry, { position: { x: 2.5, z: 1 } }),
    createFurnitureItem({ ...sofaEntry, id: 'lamp', category: 'lighting', elevation: 1.8 }),
  )
  return project
}

describe('fábricas do modelo', () => {
  it('cria um projeto válido com a versão de esquema atual', () => {
    const project = createProject({ name: '  Quarto  ', roomType: 'bedroom' })
    expect(project.schemaVersion).toBe(SCHEMA_VERSION)
    expect(project.name).toBe('Quarto')
    expect(project.room).toMatchObject({ type: 'bedroom', width: 4, depth: 3.5 })
    expect(project.layouts).toHaveLength(1)
    expect(project.activeLayoutId).toBe(project.layouts[0].id)
    expect(validateProject(project)).toEqual({ valid: true, errors: [] })
  })

  it('usa um nome por omissão e ignora tipos de divisão desconhecidos', () => {
    const project = createProject({ name: '   ', roomType: 'castelo' })
    expect(project.name).toBe('Projeto sem nome')
    expect(project.room.type).toBe('living')
  })

  it('cria móveis a partir do catálogo com cópia independente das dimensões', () => {
    const item = createFurnitureItem(sofaEntry, { rotation: -90, position: { x: 1.23456, z: 0 } })
    expect(item).toMatchObject({
      catalogId: 'sofa-3',
      category: 'sofas',
      rotation: 270,
      position: { x: 1.235, z: 0 },
      finish: 'linen',
      locked: false,
      elevation: 0,
    })
    item.dimensions.width = 3
    expect(sofaEntry.dimensions.width).toBe(2.2)
  })

  it('gera identificadores únicos', () => {
    const ids = new Set(Array.from({ length: 200 }, () => createLayout().id))
    expect(ids.size).toBe(200)
  })
})

describe('métricas', () => {
  it('calcula a área da divisão e a área ocupada no chão', () => {
    const project = sampleProject()
    const items = getActiveLayout(project).items
    expect(roomArea(project.room)).toBe(20)
    // o candeeiro está elevado e não ocupa chão
    expect(occupiedArea(items)).toBeCloseTo(1.98)
    expect(occupancyRatio(project.room, items)).toBeCloseTo(0.099)
  })
})

describe('validação', () => {
  it('aponta o caminho e explica cada erro', () => {
    const project = sampleProject()
    project.room.width = 0
    project.layouts[0].items[0].rotation = 400
    project.layouts[0].items[1].id = project.layouts[0].items[0].id
    const { valid, errors } = validateProject(project)
    expect(valid).toBe(false)
    const paths = errors.map((e) => e.path)
    expect(paths).toContain('room.width')
    expect(paths).toContain('layouts[0].items[0].rotation')
    expect(paths).toContain('layouts[0].items[1].id')
    errors.forEach((e) => expect(e.message.length).toBeGreaterThan(5))
  })

  it('rejeita uma disposição ativa inexistente', () => {
    const project = sampleProject()
    project.activeLayoutId = 'nope'
    expect(validateProject(project).errors.map((e) => e.path)).toContain('activeLayoutId')
  })

  it('não lança exceções com dados arbitrários', () => {
    for (const junk of [null, 42, 'texto', [], { layouts: 'x', room: [] }]) {
      expect(() => validateProject(junk)).not.toThrow()
      expect(validateProject(junk).valid).toBe(false)
    }
  })
})

describe('migrações', () => {
  it('não altera projetos já na versão atual', () => {
    const project = sampleProject()
    const result = migrateProject(project)
    expect(result).toEqual({ ok: true, project, migrated: false })
  })

  it('aplica migrações em cadeia até à versão alvo', () => {
    const migrations = {
      1: (p) => ({ ...p, schemaVersion: 2, tags: [] }),
      2: (p) => ({ ...p, schemaVersion: 3, tags: [...p.tags, 'migrado'] }),
    }
    const result = migrateProject({ schemaVersion: 1, name: 'Antigo' }, { migrations, targetVersion: 3 })
    expect(result.ok).toBe(true)
    expect(result.migrated).toBe(true)
    expect(result.project).toEqual({ schemaVersion: 3, name: 'Antigo', tags: ['migrado'] })
  })

  it('explica quando falta uma migração ou a versão é mais recente', () => {
    expect(migrateProject({ schemaVersion: 1 }, { migrations: {}, targetVersion: 2 }).error.code).toBe(
      'missing-migration',
    )
    const future = migrateProject({ schemaVersion: SCHEMA_VERSION + 1 })
    expect(future.ok).toBe(false)
    expect(future.error.code).toBe('future-version')
    expect(future.error.message).toMatch(/versão mais recente/)
    expect(migrateProject({}).error.code).toBe('no-version')
  })
})

describe('exportação e importação JSON', () => {
  it('ida e volta preserva o projeto', () => {
    const project = sampleProject()
    const text = serializeProject(project, { exportedAt: '2026-10-23T12:00:00.000Z' })
    const envelope = JSON.parse(text)
    expect(envelope.format).toBe(PROJECT_FILE_FORMAT)
    expect(envelope.exportedAt).toBe('2026-10-23T12:00:00.000Z')
    const result = parseProject(text)
    expect(result.ok).toBe(true)
    expect(result.project).toEqual(project)
  })

  it('aceita um projeto sem envelope', () => {
    const project = sampleProject()
    expect(parseProject(JSON.stringify(project)).ok).toBe(true)
  })

  it('devolve erros compreensíveis para dados corrompidos ou incompatíveis', () => {
    expect(parseProject('{ isto não é json').error.code).toBe('invalid-json')
    expect(parseProject(JSON.stringify({ format: 'outra-app', project: {} })).error.code).toBe('wrong-format')

    const broken = sampleProject()
    broken.room.wallColor = 'vermelho'
    const result = parseProject(JSON.stringify(broken))
    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('invalid-project')
    expect(result.error.details.map((d) => d.path)).toContain('room.wallColor')
  })
})
