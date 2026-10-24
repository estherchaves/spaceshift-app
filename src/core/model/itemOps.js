import { normalizeDegrees } from '../geometry/angles.js'
import { clamp, roundToMm } from '../units/units.js'
import { LIMITS } from './constants.js'
import { createId } from './ids.js'

/*
 * Operações imutáveis sobre os móveis da disposição ativa. Recebem e
 * devolvem projetos; se nada mudar devolvem o MESMO objeto, o que permite
 * ao store (e mais tarde ao histórico) ignorar alterações vazias.
 */

/** Distância máxima (m) a que o centro de um móvel pode ficar fora da divisão. */
export const OUTSIDE_MARGIN = 2

export const DEFAULT_SIZE_BOUNDS = {
  min: { width: LIMITS.item.min, depth: LIMITS.item.min, height: 0.01 },
  max: { width: LIMITS.item.max, depth: LIMITS.item.max, height: LIMITS.item.max },
}

function mapActiveItems(project, recipe) {
  let changed = false
  const layouts = project.layouts.map((layout) => {
    if (layout.id !== project.activeLayoutId) return layout
    const items = recipe(layout.items)
    if (items === layout.items) return layout
    changed = true
    return { ...layout, items }
  })
  return changed ? { ...project, layouts } : project
}

export function findItem(project, itemId) {
  const layout = project.layouts.find((l) => l.id === project.activeLayoutId)
  return layout?.items.find((item) => item.id === itemId) ?? null
}

export function addItem(project, item) {
  return mapActiveItems(project, (items) => [...items, item])
}

export function removeItem(project, itemId) {
  return mapActiveItems(project, (items) =>
    items.some((i) => i.id === itemId) ? items.filter((i) => i.id !== itemId) : items,
  )
}

/**
 * Aplica uma alteração parcial (posição, rotação, dimensões, cor…) com
 * valores sempre válidos: posições arredondadas ao milímetro e mantidas
 * perto da divisão, rotação normalizada e dimensões dentro de `bounds`.
 */
export function updateItem(project, itemId, patch, { bounds = DEFAULT_SIZE_BOUNDS } = {}) {
  const room = project.room
  return mapActiveItems(project, (items) => {
    const index = items.findIndex((i) => i.id === itemId)
    if (index === -1) return items
    const current = items[index]
    const next = sanitizeItemPatch(current, patch, room, bounds)
    if (isSameItem(current, next)) return items
    const copy = items.slice()
    copy[index] = next
    return copy
  })
}

export function sanitizeItemPatch(item, patch, room, bounds = DEFAULT_SIZE_BOUNDS) {
  const next = { ...item }
  if (patch.position) {
    const x = isNumber(patch.position.x) ? patch.position.x : item.position.x
    const z = isNumber(patch.position.z) ? patch.position.z : item.position.z
    next.position = {
      x: roundToMm(clamp(x, -OUTSIDE_MARGIN, room.width + OUTSIDE_MARGIN)),
      z: roundToMm(clamp(z, -OUTSIDE_MARGIN, room.depth + OUTSIDE_MARGIN)),
    }
  }
  if (isNumber(patch.rotation)) next.rotation = roundToMm(normalizeDegrees(patch.rotation))
  if (patch.dimensions) {
    const dimensions = { ...item.dimensions }
    for (const key of ['width', 'depth', 'height']) {
      const value = patch.dimensions[key]
      if (isNumber(value)) dimensions[key] = roundToMm(clamp(value, bounds.min[key], bounds.max[key]))
    }
    next.dimensions = dimensions
  }
  if (typeof patch.color === 'string' && /^#[0-9a-f]{6}$/i.test(patch.color)) next.color = patch.color.toLowerCase()
  if (patch.finish === null || typeof patch.finish === 'string') next.finish = patch.finish
  if (typeof patch.locked === 'boolean') next.locked = patch.locked
  if (typeof patch.name === 'string' && patch.name.trim()) next.name = patch.name.trim().slice(0, 60)
  return next
}

/**
 * Duplica um móvel, ligeiramente deslocado para ficar visível.
 * @returns {{project: object, itemId: string|null}}
 */
export function duplicateItem(project, itemId, offset = { x: 0.3, z: 0.3 }) {
  const source = findItem(project, itemId)
  if (!source) return { project, itemId: null }
  const copy = {
    ...structuredClone(source),
    id: createId('item'),
    locked: false,
    position: {
      x: roundToMm(clamp(source.position.x + offset.x, -OUTSIDE_MARGIN, project.room.width + OUTSIDE_MARGIN)),
      z: roundToMm(clamp(source.position.z + offset.z, -OUTSIDE_MARGIN, project.room.depth + OUTSIDE_MARGIN)),
    },
  }
  return { project: addItem(project, copy), itemId: copy.id }
}

function isSameItem(a, b) {
  return (
    a.position.x === b.position.x &&
    a.position.z === b.position.z &&
    a.rotation === b.rotation &&
    a.dimensions.width === b.dimensions.width &&
    a.dimensions.depth === b.dimensions.depth &&
    a.dimensions.height === b.dimensions.height &&
    a.color === b.color &&
    a.finish === b.finish &&
    a.locked === b.locked &&
    a.name === b.name
  )
}

const isNumber = (v) => typeof v === 'number' && Number.isFinite(v)
