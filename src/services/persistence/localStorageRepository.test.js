import { describe, expect, it } from 'vitest'
import { createProject } from '@/core/model'
import { assertRepository, RepositoryError } from './ProjectRepository.js'
import { createLocalStorageRepository, createMemoryStorage, STORAGE_PREFIX } from './localStorageRepository.js'

const setup = () => {
  const storage = createMemoryStorage()
  return { storage, repo: createLocalStorageRepository({ storage }) }
}

describe('repositório LocalStorage', () => {
  it('cumpre o contrato', () => {
    expect(() => assertRepository(setup().repo)).not.toThrow()
    expect(() => assertRepository({ list() {} })).toThrow(/get/)
  })

  it('guarda, lista (mais recentes primeiro), lê e elimina', async () => {
    const { repo } = setup()
    const a = createProject({ name: 'A' })
    const b = createProject({ name: 'B' })
    await repo.save(a)
    await new Promise((r) => setTimeout(r, 5))
    await repo.save(b)
    expect((await repo.list()).map((s) => s.name)).toEqual(['B', 'A'])
    const read = await repo.get(a.id)
    expect(read.ok).toBe(true)
    expect(read.project).toEqual(a)
    await repo.remove(a.id)
    expect((await repo.list()).map((s) => s.name)).toEqual(['B'])
    expect((await repo.get(a.id)).error.code).toBe('not-found')
  })

  it('voltar a guardar atualiza o resumo sem duplicar', async () => {
    const { repo } = setup()
    const project = createProject({ name: 'Sala' })
    await repo.save(project)
    await repo.save({ ...project, name: 'Sala grande' })
    const list = await repo.list()
    expect(list).toHaveLength(1)
    expect(list[0].name).toBe('Sala grande')
  })

  it('reconstrói um índice corrompido a partir dos projetos', async () => {
    const { repo, storage } = setup()
    const project = createProject({ name: 'Quarto' })
    await repo.save(project)
    storage.setItem(`${STORAGE_PREFIX}:index`, '{isto não é json')
    const list = await repo.list()
    expect(list.map((s) => s.name)).toEqual(['Quarto'])
  })

  it('um projeto danificado aparece marcado e não bloqueia os outros', async () => {
    const { repo, storage } = setup()
    await repo.save(createProject({ name: 'Bom' }))
    storage.setItem(`${STORAGE_PREFIX}:project:project_mau`, '{"schemaVersion": 1')
    storage.removeItem(`${STORAGE_PREFIX}:index`)
    const list = await repo.list()
    expect(list).toHaveLength(2)
    const broken = list.find((s) => s.broken)
    expect(broken.id).toBe('project_mau')
    expect(broken.error).toMatch(/JSON/)
    const read = await repo.get('project_mau')
    expect(read.ok).toBe(false)
    await repo.remove('project_mau')
    expect(await repo.list()).toHaveLength(1)
  })

  it('sem espaço lança um erro explicado', async () => {
    const storage = createMemoryStorage()
    storage.setItem = () => {
      throw Object.assign(new Error('full'), { name: 'QuotaExceededError' })
    }
    const repo = createLocalStorageRepository({ storage })
    const error = await repo.save(createProject()).catch((e) => e)
    expect(error).toBeInstanceOf(RepositoryError)
    expect(error.code).toBe('quota')
    expect(error.message).toMatch(/espaço/)
  })

  it('sem LocalStorage funciona em memória e avisa que não é persistente', async () => {
    const repo = createLocalStorageRepository({ storage: null })
    expect(repo.persistent).toBe(false)
    await repo.save(createProject({ name: 'Temporário' }))
    expect(await repo.list()).toHaveLength(1)
  })
})
