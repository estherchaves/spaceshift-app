import { SCHEMA_VERSION } from './constants.js'

/**
 * Registo de migrações: a chave é a versão de ORIGEM e a função devolve o
 * projeto na versão seguinte. Ao criar o esquema v2, adiciona-se
 * `1: (p) => ({ ...p, schemaVersion: 2, ...novosCampos })`.
 *
 * A v1 é a primeira versão pública, por isso ainda não há migrações.
 */
export const MIGRATIONS = {}

/**
 * Leva um projeto de qualquer versão conhecida até `targetVersion`.
 * @returns {{ok: true, project: object, migrated: boolean} | {ok: false, error: {code: string, message: string}}}
 */
export function migrateProject(raw, { migrations = MIGRATIONS, targetVersion = SCHEMA_VERSION } = {}) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return failure('invalid', 'Os dados não correspondem a um projeto SpaceShift.')
  }
  const version = raw.schemaVersion
  if (!Number.isInteger(version) || version < 1) {
    return failure('no-version', 'O projeto não indica uma versão de esquema válida.')
  }
  if (version > targetVersion) {
    return failure(
      'future-version',
      `Este projeto foi criado numa versão mais recente do SpaceShift (esquema ${version}). Atualize a aplicação para o abrir.`,
    )
  }

  let project = raw
  for (let v = version; v < targetVersion; v++) {
    const step = migrations[v]
    if (!step) return failure('missing-migration', `Não existe migração do esquema ${v} para ${v + 1}.`)
    project = step(project)
    if (project?.schemaVersion !== v + 1) {
      return failure('broken-migration', `A migração do esquema ${v} não produziu a versão ${v + 1}.`)
    }
  }
  return { ok: true, project, migrated: version !== targetVersion }
}

function failure(code, message) {
  return { ok: false, error: { code, message } }
}
