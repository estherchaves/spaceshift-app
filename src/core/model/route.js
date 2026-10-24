import { clamp, roundToMm } from '../units/units.js'
import { createId } from './ids.js'
import { openingLabels } from './openings.js'

/*
 * Caminho de entrega: o que um móvel atravessa até chegar à divisão
 * (porta do prédio, escadas, corredor…). Pertence à divisão, como as
 * portas, e acaba sempre numa porta da divisão (`entryDoorId`, ou a
 * primeira porta). Cada passo tem uma largura e uma altura livres; o
 * corredor e a escada podem ter uma curva a 90° (no corredor, a largura
 * depois da curva pode ser outra).
 */

export const ROUTE_STEP_TYPES = {
  door: { label: 'Porta', width: 0.8, height: 2.0 },
  corridor: { label: 'Corredor', width: 0.9, height: 2.4 },
  stairs: { label: 'Escada', width: 0.9, height: 2.0 },
}

export const ROUTE_LIMITS = {
  width: { min: 0.4, max: 4 },
  height: { min: 1, max: 4 },
  steps: 8,
  label: 40,
}

export const EMPTY_ROUTE = { steps: [], entryDoorId: null }

export function createRouteStep(type) {
  const preset = ROUTE_STEP_TYPES[type] ?? ROUTE_STEP_TYPES.door
  const kind = ROUTE_STEP_TYPES[type] ? type : 'door'
  return {
    id: createId('step'),
    type: kind,
    label: preset.label,
    width: preset.width,
    height: preset.height,
    ...(kind === 'door' ? {} : { turn: false }),
    ...(kind === 'corridor' ? { widthAfter: preset.width } : {}),
  }
}

const limit = (value, range) => roundToMm(clamp(value, range.min, range.max))
const isNumber = (v) => typeof v === 'number' && Number.isFinite(v)

/** Aplica uma alteração a um passo, mantendo-o válido. */
export function applyRouteStepPatch(step, patch) {
  const next = { ...step }
  if (typeof patch.label === 'string') next.label = patch.label.replace(/\s+/g, ' ').trim().slice(0, ROUTE_LIMITS.label) || ROUTE_STEP_TYPES[step.type].label
  if (isNumber(patch.width)) next.width = limit(patch.width, ROUTE_LIMITS.width)
  if (isNumber(patch.height)) next.height = limit(patch.height, ROUTE_LIMITS.height)
  if (step.type !== 'door' && typeof patch.turn === 'boolean') next.turn = patch.turn
  if (step.type === 'corridor' && isNumber(patch.widthAfter)) next.widthAfter = limit(patch.widthAfter, ROUTE_LIMITS.width)
  return next
}

/** A porta da divisão onde o caminho acaba (ou null se não houver portas). */
export function entryDoor(room) {
  const doors = (room.openings ?? []).filter((o) => o.type === 'door')
  return doors.find((d) => d.id === room.route?.entryDoorId) ?? doors[0] ?? null
}

/**
 * Todos os passos a verificar, pela ordem: os do caminho e, no fim, a
 * porta da divisão (com `openingId`).
 */
export function deliverySteps(room) {
  const steps = [...(room.route?.steps ?? [])]
  const door = entryDoor(room)
  if (door) {
    const label = openingLabels(room.openings).get(door.id)
    steps.push({ id: `opening:${door.id}`, type: 'door', label: `${label} da divisão`, width: door.width, height: door.height, openingId: door.id })
  }
  return steps
}
