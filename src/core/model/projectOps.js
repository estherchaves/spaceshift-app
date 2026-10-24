import { getActiveLayout } from './factories.js'
import { createId } from './ids.js'
import { sanitizeProjectName } from './sanitize.js'

/*
 * Operações sobre projetos inteiros, usadas pela página de projetos e
 * pelo repositório: duplicar, dar um nome livre e resumir para a lista.
 */

/** Nome que não colide com os existentes: "Sala", "Sala (cópia)", "Sala (cópia 2)"… */
export function uniqueProjectName(name, existing) {
  const names = new Set(existing)
  if (!names.has(name)) return name
  const base = name.replace(/ \(cópia( \d+)?\)$/, '')
  if (!names.has(`${base} (cópia)`)) return `${base} (cópia)`
  for (let n = 2; ; n++) if (!names.has(`${base} (cópia ${n})`)) return `${base} (cópia ${n})`
}

/** Cópia independente: novo id, datas novas e o nome indicado. */
export function duplicateProject(project, { name, now = new Date().toISOString() } = {}) {
  return {
    ...project,
    id: createId('project'),
    name: sanitizeProjectName(name ?? `${project.name} (cópia)`) || project.name,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Resumo leve para a lista de projetos: o suficiente para o cartão e
 * para a miniatura da planta, sem carregar o projeto inteiro.
 */
export function summarizeProject(project, { savedAt = project.updatedAt } = {}) {
  const layout = getActiveLayout(project)
  const { room } = project
  return {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    updatedAt: savedAt,
    roomType: room.type,
    layoutCount: project.layouts.length,
    itemCount: layout.items.length,
    preview: {
      room: {
        width: room.width,
        depth: room.depth,
        wallThickness: room.wallThickness,
        floorColor: room.floorColor,
      },
      items: layout.items.map((item) => ({
        catalogId: item.catalogId,
        position: item.position,
        rotation: item.rotation,
        elevation: item.elevation,
        dimensions: item.dimensions,
        color: item.color,
      })),
    },
  }
}
