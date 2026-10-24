/*
 * Contrato do repositório de projetos. O editor e a página de projetos só
 * falam com este contrato; a primeira implementação usa o LocalStorage e
 * uma futura pode falar com uma API (autenticação, base de dados, cloud)
 * sem mudar quem a usa. Todos os métodos são assíncronos por isso.
 *
 * @typedef {object} ProjectSummary
 * @property {string} id
 * @property {string} name
 * @property {string} createdAt
 * @property {string} updatedAt     última gravação
 * @property {string} roomType
 * @property {number} layoutCount
 * @property {number} itemCount     móveis da disposição ativa
 * @property {object} preview       divisão e móveis para a miniatura
 * @property {boolean} [broken]     dados guardados ilegíveis
 * @property {string} [error]       motivo, quando `broken`
 *
 * @typedef {object} ProjectRepository
 * @property {() => Promise<ProjectSummary[]>} list   mais recentes primeiro
 * @property {(id: string) => Promise<{ok: true, project: object} | {ok: false, error: {code: string, message: string}}>} get
 * @property {(project: object) => Promise<{savedAt: string}>} save   lança RepositoryError
 * @property {(id: string) => Promise<void>} remove
 * @property {boolean} persistent   falso quando os dados só duram até fechar a página
 */

export const REPOSITORY_METHODS = ['list', 'get', 'save', 'remove']

export class RepositoryError extends Error {
  /** @param {'quota'|'unavailable'|'unknown'} code */
  constructor(code, message, cause) {
    super(message)
    this.name = 'RepositoryError'
    this.code = code
    this.cause = cause
  }
}

/** Confirma que um objeto cumpre o contrato (útil em testes e ao trocar de implementação). */
export function assertRepository(repository) {
  for (const method of REPOSITORY_METHODS) {
    if (typeof repository?.[method] !== 'function') throw new TypeError(`O repositório não implementa ${method}().`)
  }
  return repository
}
