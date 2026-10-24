import { normalizeDegrees } from '../geometry/angles.js'
import { roundToMm } from '../units/units.js'
import { DEFAULT_ROOM, DEFAULT_SETTINGS, ROOM_TYPES, SCHEMA_VERSION } from './constants.js'
import { createId } from './ids.js'

const now = () => new Date().toISOString()

export function createRoom(overrides = {}) {
  const type = overrides.type && ROOM_TYPES[overrides.type] ? overrides.type : DEFAULT_ROOM.type
  const preset = ROOM_TYPES[type]
  return {
    ...DEFAULT_ROOM,
    width: preset.width,
    depth: preset.depth,
    ...overrides,
    openings: overrides.openings ? [...overrides.openings] : [],
    type,
  }
}

export function createLayout(name = 'Disposição 1', items = []) {
  return { id: createId('layout'), name, items, createdAt: now() }
}

/**
 * Cria uma instância de móvel a partir de uma entrada do catálogo.
 * Por omissão fica no centro da divisão indicada.
 */
export function createFurnitureItem(entry, overrides = {}) {
  const item = {
    id: createId('item'),
    catalogId: entry.id,
    name: entry.name,
    category: entry.category,
    position: { x: 0, z: 0 },
    rotation: 0,
    elevation: entry.elevation ?? 0,
    dimensions: { ...entry.dimensions },
    color: entry.color,
    finish: entry.finishes?.[0] ?? null,
    locked: false,
    ...overrides,
  }
  return {
    ...item,
    position: { x: roundToMm(item.position.x), z: roundToMm(item.position.z) },
    rotation: normalizeDegrees(item.rotation),
  }
}

export function createProject({ name = 'Projeto sem nome', roomType, room, settings } = {}) {
  const layout = createLayout()
  const timestamp = now()
  return {
    schemaVersion: SCHEMA_VERSION,
    id: createId('project'),
    name: name.trim() || 'Projeto sem nome',
    createdAt: timestamp,
    updatedAt: timestamp,
    room: createRoom({ ...(roomType ? { type: roomType } : {}), ...room }),
    layouts: [layout],
    activeLayoutId: layout.id,
    settings: { ...DEFAULT_SETTINGS, ...settings },
  }
}

export function getActiveLayout(project) {
  return project.layouts.find((l) => l.id === project.activeLayoutId) ?? project.layouts[0]
}
