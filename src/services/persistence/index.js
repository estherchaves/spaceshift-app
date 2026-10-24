import { createLocalStorageRepository } from './localStorageRepository.js'

export { RepositoryError, assertRepository } from './ProjectRepository.js'
export { createLocalStorageRepository, createMemoryStorage } from './localStorageRepository.js'

/*
 * Repositório usado pela aplicação. Para ligar um backend basta trocar
 * esta linha por uma implementação que fale com a API.
 */
let repository = null

export function getRepository() {
  repository ??= createLocalStorageRepository()
  return repository
}

/** Testes: injeta outro repositório (ex.: em memória). */
export function setRepository(next) {
  repository = next
}
