import { parseProject, summarizeProject } from '@/core/model'
import { RepositoryError, assertRepository } from './ProjectRepository.js'

/*
 * Repositório em LocalStorage. Cada projeto fica numa chave própria e um
 * índice guarda os resumos para a lista abrir sem ler todos os projetos:
 *   spaceshift:v1:index            → ProjectSummary[]
 *   spaceshift:v1:project:<id>     → projeto (JSON)
 * Se o índice faltar ou estiver corrompido é reconstruído a partir das
 * chaves dos projetos. Um projeto ilegível aparece na lista marcado como
 * danificado, para poder ser eliminado, e nunca bloqueia a aplicação.
 */

export const STORAGE_PREFIX = 'spaceshift:v1'

/** Armazenamento em memória com a mesma interface (modo privado, testes). */
export function createMemoryStorage() {
  const data = new Map()
  return {
    get length() {
      return data.size
    },
    key: (i) => [...data.keys()][i] ?? null,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => void data.set(key, String(value)),
    removeItem: (key) => void data.delete(key),
    clear: () => data.clear(),
  }
}

/** LocalStorage se existir e aceitar escrita; senão null. */
export function getBrowserStorage() {
  try {
    const storage = globalThis.localStorage
    const probe = `${STORAGE_PREFIX}:probe`
    storage.setItem(probe, '1')
    storage.removeItem(probe)
    return storage
  } catch {
    return null
  }
}

function isQuotaError(error) {
  return error?.name === 'QuotaExceededError' || error?.code === 22 || error?.code === 1014
}

export function createLocalStorageRepository({ storage = getBrowserStorage(), prefix = STORAGE_PREFIX } = {}) {
  const persistent = Boolean(storage)
  const store = storage ?? createMemoryStorage()
  const indexKey = `${prefix}:index`
  const projectKey = (id) => `${prefix}:project:${id}`
  const projectPrefix = `${prefix}:project:`

  const write = (key, value) => {
    try {
      store.setItem(key, value)
    } catch (error) {
      if (isQuotaError(error)) {
        throw new RepositoryError(
          'quota',
          'Não há espaço no armazenamento do browser. Exporte e elimine projetos antigos para continuar a guardar.',
          error,
        )
      }
      throw new RepositoryError('unknown', 'Não foi possível guardar o projeto neste browser.', error)
    }
  }

  const readIndex = () => {
    const raw = store.getItem(indexKey)
    if (raw !== null) {
      try {
        const index = JSON.parse(raw)
        if (Array.isArray(index) && index.every((entry) => typeof entry?.id === 'string')) return index
      } catch {
        // índice corrompido: reconstrói abaixo
      }
    }
    return rebuildIndex()
  }

  const rebuildIndex = () => {
    const index = []
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i)
      if (!key?.startsWith(projectPrefix)) continue
      const id = key.slice(projectPrefix.length)
      const result = parseProject(store.getItem(key))
      index.push(result.ok ? summarizeProject(result.project) : brokenSummary(id, result.error.message))
    }
    try {
      store.setItem(indexKey, JSON.stringify(index))
    } catch {
      // sem espaço para o índice: continua a funcionar só em memória
    }
    return index
  }

  const writeIndex = (index) => write(indexKey, JSON.stringify(index))

  return assertRepository({
    persistent,

    async list() {
      return [...readIndex()].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    },

    async get(id) {
      const raw = store.getItem(projectKey(id))
      if (raw === null) return { ok: false, error: { code: 'not-found', message: 'Este projeto não existe ou foi eliminado.' } }
      const result = parseProject(raw)
      if (!result.ok) return result
      if (result.project.id !== id) {
        return { ok: false, error: { code: 'invalid-project', message: 'Os dados guardados não correspondem a este projeto.' } }
      }
      return result
    },

    async save(project) {
      const savedAt = new Date().toISOString()
      write(projectKey(project.id), JSON.stringify(project))
      const summary = summarizeProject(project, { savedAt })
      const index = readIndex().filter((entry) => entry.id !== project.id)
      writeIndex([summary, ...index])
      return { savedAt }
    },

    async remove(id) {
      store.removeItem(projectKey(id))
      const index = readIndex()
      if (index.some((entry) => entry.id === id)) writeIndex(index.filter((entry) => entry.id !== id))
    },
  })
}

function brokenSummary(id, error) {
  return {
    id,
    name: 'Projeto danificado',
    createdAt: '',
    updatedAt: '',
    roomType: 'other',
    layoutCount: 0,
    itemCount: 0,
    preview: null,
    broken: true,
    error,
  }
}
