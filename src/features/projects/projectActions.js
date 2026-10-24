import { createProject, duplicateProject, parseProject, sanitizeProjectName, uniqueProjectName } from '@/core/model'
import { createExampleProject } from '@/data/examples/exampleProject.js'
import { readFileAsText } from '@/services/export/download.js'
import { getRepository } from '@/services/persistence'

/*
 * Ações da página de projetos. Falam só com o repositório (assíncrono),
 * por isso continuam iguais quando os projetos passarem a viver num servidor.
 */

const repository = () => getRepository()

/** Cria e grava um projeto novo. Devolve o projeto. */
export async function createNewProject({ name, roomType, width, depth }) {
  const project = createProject({ name: sanitizeProjectName(name) ?? 'Projeto sem nome', roomType, room: { width, depth } })
  await repository().save(project)
  return project
}

export async function createExample(existingNames = []) {
  const example = createExampleProject()
  const project = { ...example, name: uniqueProjectName(example.name, existingNames) }
  await repository().save(project)
  return project
}

/** Duplica um projeto guardado com um nome livre ("Sala (cópia)"). */
export async function duplicateStoredProject(id, existingNames = []) {
  const result = await repository().get(id)
  if (!result.ok) throw new Error(result.error.message)
  const copy = duplicateProject(result.project, { name: uniqueProjectName(`${result.project.name} (cópia)`, existingNames) })
  await repository().save(copy)
  return copy
}

export async function renameStoredProject(id, name) {
  const clean = sanitizeProjectName(name)
  if (!clean) throw new Error('O nome não pode ficar vazio.')
  const result = await repository().get(id)
  if (!result.ok) throw new Error(result.error.message)
  const project = { ...result.project, name: clean, updatedAt: new Date().toISOString() }
  await repository().save(project)
  return project
}

export async function deleteStoredProject(id) {
  await repository().remove(id)
}

export async function loadStoredProject(id) {
  return repository().get(id)
}

/**
 * Importa um ficheiro .json exportado. Se já existir um projeto com o
 * mesmo id (importar duas vezes, ou o original ainda está cá), cria uma
 * cópia em vez de o substituir.
 * @returns {Promise<{ok: true, project: object, copied: boolean} | {ok: false, error: object}>}
 */
export async function importProjectFile(file, existing = []) {
  let text
  try {
    text = await readFileAsText(file)
  } catch {
    return { ok: false, error: { code: 'read-failed', message: 'Não foi possível ler o ficheiro.' } }
  }
  const result = parseProject(text)
  if (!result.ok) return result
  const names = existing.map((summary) => summary.name)
  const clash = existing.some((summary) => summary.id === result.project.id)
  const project = clash
    ? duplicateProject(result.project, { name: uniqueProjectName(result.project.name, names) })
    : { ...result.project, name: uniqueProjectName(result.project.name, names) }
  await repository().save(project)
  return { ok: true, project, copied: clash }
}
