import { clamp, roundToMm } from '../units/units.js'
import { FLOOR_MATERIALS, LIMITS, ROOM_TYPES } from './constants.js'

const HEX = /^#[0-9a-f]{6}$/i

/**
 * Aplica uma alteração parcial à divisão garantindo que o resultado é
 * sempre válido: medidas limitadas e arredondadas ao milímetro, chaves
 * desconhecidas e cores inválidas ignoradas. Nunca lança exceções.
 */
export function applyRoomPatch(room, patch) {
  const next = { ...room }
  if (patch.type in ROOM_TYPES) next.type = patch.type
  if (isNumber(patch.width)) next.width = limit(patch.width, LIMITS.room)
  if (isNumber(patch.depth)) next.depth = limit(patch.depth, LIMITS.room)
  if (isNumber(patch.wallHeight)) next.wallHeight = limit(patch.wallHeight, LIMITS.wallHeight)
  if (isNumber(patch.wallThickness)) next.wallThickness = limit(patch.wallThickness, LIMITS.wallThickness)
  if (HEX.test(patch.wallColor ?? '')) next.wallColor = patch.wallColor.toLowerCase()
  if (patch.floorMaterial in FLOOR_MATERIALS) {
    next.floorMaterial = patch.floorMaterial
    // Trocar de material aplica a cor típica, salvo se vier uma cor explícita.
    if (!HEX.test(patch.floorColor ?? '')) next.floorColor = FLOOR_MATERIALS[patch.floorMaterial].color
  }
  if (HEX.test(patch.floorColor ?? '')) next.floorColor = patch.floorColor.toLowerCase()
  return next
}

export function applySettingsPatch(settings, patch) {
  const next = { ...settings }
  if (isNumber(patch.gridSize)) next.gridSize = limit(patch.gridSize, LIMITS.gridSize)
  if (typeof patch.snapToGrid === 'boolean') next.snapToGrid = patch.snapToGrid
  if (isNumber(patch.rotationStep)) next.rotationStep = clamp(Math.round(patch.rotationStep), 1, 90)
  if (isNumber(patch.circulationMin)) next.circulationMin = limit(patch.circulationMin, LIMITS.circulationMin)
  return next
}

export function sanitizeProjectName(name) {
  if (typeof name !== 'string') return null
  const trimmed = name.replace(/\s+/g, ' ').trim().slice(0, LIMITS.projectName.maxLength)
  return trimmed || null
}

const isNumber = (v) => typeof v === 'number' && Number.isFinite(v)
const limit = (v, { min, max }) => roundToMm(clamp(v, min, max))
