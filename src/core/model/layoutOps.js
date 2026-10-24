import { LIMITS } from './constants.js'
import { createId } from './ids.js'

/*
 * Operações imutáveis sobre as disposições de um projeto. Todas partilham
 * a mesma divisão; cada uma tem a sua lista de móveis. Como em itemOps,
 * se nada mudar devolvem o MESMO projeto.
 */

const now = () => new Date().toISOString()

export function canAddLayout(project) {
  return project.layouts.length < LIMITS.layoutsPerProject
}

/** Nome livre do tipo "Disposição 3" (ou "Sofá junto à janela (cópia)"). */
export function nextLayoutName(project, base = null) {
  const names = new Set(project.layouts.map((layout) => layout.name))
  if (base) {
    const copy = `${base} (cópia)`
    if (!names.has(copy)) return copy
    for (let n = 2; ; n++) if (!names.has(`${base} (cópia ${n})`)) return `${base} (cópia ${n})`
  }
  for (let n = project.layouts.length + 1; ; n++) if (!names.has(`Disposição ${n}`)) return `Disposição ${n}`
}

export function sanitizeLayoutName(name) {
  return typeof name === 'string' ? name.trim().replace(/\s+/g, ' ').slice(0, LIMITS.projectName.maxLength) : ''
}

/**
 * Acrescenta uma disposição e torna-a ativa. Com `fromLayoutId` copia os
 * móveis dessa disposição (com novos ids); sem ele começa vazia.
 * @returns {{project: object, layoutId: string|null}}
 */
export function addLayout(project, { fromLayoutId = null, name } = {}) {
  if (!canAddLayout(project)) return { project, layoutId: null }
  const source = fromLayoutId ? project.layouts.find((layout) => layout.id === fromLayoutId) : null
  if (fromLayoutId && !source) return { project, layoutId: null }
  const layout = {
    id: createId('layout'),
    name: sanitizeLayoutName(name) || nextLayoutName(project, source?.name ?? null),
    createdAt: now(),
    items: source ? source.items.map((item) => ({ ...item, id: createId('item') })) : [],
  }
  const index = source ? project.layouts.indexOf(source) + 1 : project.layouts.length
  const layouts = [...project.layouts.slice(0, index), layout, ...project.layouts.slice(index)]
  return { project: { ...project, layouts, activeLayoutId: layout.id }, layoutId: layout.id }
}

export function renameLayout(project, layoutId, name) {
  const clean = sanitizeLayoutName(name)
  const layout = project.layouts.find((l) => l.id === layoutId)
  if (!clean || !layout || layout.name === clean) return project
  return { ...project, layouts: project.layouts.map((l) => (l.id === layoutId ? { ...l, name: clean } : l)) }
}

/** Remove uma disposição (nunca a última). Se era a ativa, passa para a vizinha. */
export function removeLayout(project, layoutId) {
  const index = project.layouts.findIndex((l) => l.id === layoutId)
  if (index === -1 || project.layouts.length <= 1) return project
  const layouts = project.layouts.filter((l) => l.id !== layoutId)
  const activeLayoutId =
    project.activeLayoutId === layoutId ? layouts[Math.min(index, layouts.length - 1)].id : project.activeLayoutId
  return { ...project, layouts, activeLayoutId }
}

export function setActiveLayout(project, layoutId) {
  if (project.activeLayoutId === layoutId || !project.layouts.some((l) => l.id === layoutId)) return project
  return { ...project, activeLayoutId: layoutId }
}
