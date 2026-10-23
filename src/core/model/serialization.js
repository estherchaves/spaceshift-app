import { PROJECT_FILE_FORMAT } from './constants.js'
import { migrateProject } from './migrations.js'
import { validateProject } from './validation.js'

/**
 * Formato do ficheiro .json exportado. O "envelope" permite reconhecer
 * ficheiros do SpaceShift e acrescentar metadados sem tocar no projeto.
 */
export function serializeProject(project, { exportedAt = new Date().toISOString() } = {}) {
  return JSON.stringify({ format: PROJECT_FILE_FORMAT, exportedAt, project }, null, 2)
}

/**
 * Lê texto JSON (ficheiro importado ou localStorage) e devolve um projeto
 * válido na versão atual, ou um erro explicado em português.
 * Aceita o envelope de exportação ou um projeto "nu".
 *
 * @returns {{ok: true, project: object, migrated: boolean} |
 *           {ok: false, error: {code: string, message: string, details?: {path: string, message: string}[]}}}
 */
export function parseProject(text, options) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    return failure('invalid-json', 'O ficheiro não é JSON válido ou está corrompido.')
  }

  if (data && typeof data === 'object' && 'format' in data) {
    if (data.format !== PROJECT_FILE_FORMAT) {
      return failure('wrong-format', 'Este ficheiro não é um projeto SpaceShift.')
    }
    data = data.project
  }

  const migration = migrateProject(data, options)
  if (!migration.ok) return migration

  const { valid, errors } = validateProject(migration.project)
  if (!valid) {
    return failure('invalid-project', 'O projeto tem dados inválidos e não pode ser aberto.', errors)
  }
  return { ok: true, project: migration.project, migrated: migration.migrated }
}

function failure(code, message, details) {
  return { ok: false, error: details ? { code, message, details } : { code, message } }
}
