import { serializeProject } from '@/core/model'
import { slugify } from '@/utils/fileName.js'
import { downloadBlob } from './download.js'

export const PROJECT_FILE_EXTENSION = '.spaceshift.json'

export function projectFileName(project) {
  return `${slugify(project.name)}${PROJECT_FILE_EXTENSION}`
}

/** Exporta o projeto completo (todas as disposições) como JSON versionado. */
export function exportProjectJson(project) {
  const blob = new Blob([serializeProject(project)], { type: 'application/json' })
  const fileName = projectFileName(project)
  downloadBlob(blob, fileName)
  return fileName
}
