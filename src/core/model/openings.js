import { add, scale } from '../geometry/vec2.js'
import { clamp, roundToMm } from '../units/units.js'
import { createId } from './ids.js'

/*
 * Portas e janelas. Pertencem à divisão (são as mesmas em todas as
 * disposições) e ficam numa das quatro paredes interiores.
 *
 * Cada parede tem um início, uma direção e uma normal para dentro:
 *   top    de (0, 0) para a direita      bottom de (0, P) para a direita
 *   left   de (0, 0) para baixo          right  de (L, 0) para baixo
 * `offset` é a distância do início da parede ao CENTRO da abertura.
 * Uma porta tem a dobradiça num dos lados (`hinge`: 'start' | 'end',
 * no sentido da parede) e abre para dentro ou para fora (`swing`).
 */

export const WALL_SIDES = ['top', 'right', 'bottom', 'left']

export const WALL_LABELS = { top: 'superior', right: 'direita', bottom: 'inferior', left: 'esquerda' }

export const OPENING_TYPES = {
  door: { label: 'Porta', width: 0.8, height: 2.0, sill: 0 },
  window: { label: 'Janela', width: 1.2, height: 1.2, sill: 0.9 },
}

export const OPENING_LIMITS = {
  width: { min: 0.4, max: 4 },
  height: { min: 0.3, max: 3 },
  sill: { min: 0, max: 2.5 },
}

/** Folga mínima entre uma abertura e o canto ou outra abertura (m). */
const CORNER_GAP = 0.1

/** Início, direção, normal para dentro e comprimento de uma parede. */
export function wallFrame(room, wall) {
  switch (wall) {
    case 'top':
      return { start: { x: 0, z: 0 }, dir: { x: 1, z: 0 }, inward: { x: 0, z: 1 }, length: room.width }
    case 'bottom':
      return { start: { x: 0, z: room.depth }, dir: { x: 1, z: 0 }, inward: { x: 0, z: -1 }, length: room.width }
    case 'left':
      return { start: { x: 0, z: 0 }, dir: { x: 0, z: 1 }, inward: { x: 1, z: 0 }, length: room.depth }
    default:
      return { start: { x: room.width, z: 0 }, dir: { x: 0, z: 1 }, inward: { x: -1, z: 0 }, length: room.depth }
  }
}

/** Extremos da abertura na face interior da parede (m). */
export function openingSegment(room, opening) {
  const frame = wallFrame(room, opening.wall)
  const centre = add(frame.start, scale(frame.dir, opening.offset))
  const half = scale(frame.dir, opening.width / 2)
  return { ...frame, centre, from: add(centre, scale(half, -1)), to: add(centre, half) }
}

/**
 * Área varrida pela folha de uma porta: um quarto de círculo com centro
 * na dobradiça e raio igual à largura, do lado para onde abre. É convexo
 * (90°), por isso entra diretamente no teste de colisões.
 */
export function doorSwingPolygon(room, door, segments = 16) {
  const seg = openingSegment(room, door)
  const hinge = door.hinge === 'end' ? seg.to : seg.from
  const towardJamb = door.hinge === 'end' ? scale(seg.dir, -1) : seg.dir
  const normal = door.swing === 'out' ? scale(seg.inward, -1) : seg.inward
  const points = [hinge]
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * (Math.PI / 2)
    points.push(add(hinge, add(scale(towardJamb, door.width * Math.cos(a)), scale(normal, door.width * Math.sin(a)))))
  }
  return points
}

/** Ponto onde fica a ponta da folha aberta a 90° (para desenhar a folha). */
export function doorLeafEnd(room, door) {
  const seg = openingSegment(room, door)
  const hinge = door.hinge === 'end' ? seg.to : seg.from
  const normal = door.swing === 'out' ? scale(seg.inward, -1) : seg.inward
  return { hinge, end: add(hinge, scale(normal, door.width)) }
}

/** Limita as medidas e a posição de uma abertura para caber na parede. */
export function clampOpening(room, opening) {
  const length = wallFrame(room, opening.wall).length
  const width = roundToMm(clamp(opening.width, OPENING_LIMITS.width.min, Math.max(OPENING_LIMITS.width.min, length - 2 * CORNER_GAP)))
  const sill = opening.type === 'door' ? 0 : roundToMm(clamp(opening.sill, OPENING_LIMITS.sill.min, room.wallHeight - OPENING_LIMITS.height.min))
  const height = roundToMm(clamp(opening.height, OPENING_LIMITS.height.min, room.wallHeight - sill))
  const half = width / 2
  const offset = roundToMm(clamp(opening.offset, half + CORNER_GAP, Math.max(half + CORNER_GAP, length - half - CORNER_GAP)))
  return { ...opening, width, height, sill, offset }
}

/** As aberturas da mesma parede sobrepõem-se? */
export function openingsOverlap(a, b) {
  if (a.wall !== b.wall) return false
  return Math.abs(a.offset - b.offset) < (a.width + b.width) / 2 + CORNER_GAP - 1e-9
}

/**
 * Posição livre numa parede para uma abertura nova, o mais perto possível
 * de `preferred` (por omissão o meio). Devolve null se a parede não tiver espaço.
 */
export function findOpeningOffset(room, openings, candidate, preferred) {
  const length = wallFrame(room, candidate.wall).length
  const half = candidate.width / 2
  const min = half + CORNER_GAP
  const max = length - half - CORNER_GAP
  if (max < min) return null
  const target = clamp(preferred ?? length / 2, min, max)
  const others = openings.filter((o) => o.wall === candidate.wall && o.id !== candidate.id)
  const free = (offset) => !others.some((o) => openingsOverlap({ ...candidate, offset }, o))
  const step = 0.05
  for (let d = 0; d <= length; d += step) {
    for (const offset of [target - d, target + d]) {
      if (offset >= min - 1e-9 && offset <= max + 1e-9 && free(offset)) return roundToMm(offset)
    }
  }
  return null
}

/**
 * Cria uma abertura numa parede, no sítio livre mais próximo do meio
 * (ou de `preferred`). Procura noutras paredes se aquela estiver cheia.
 * @returns {object|null}
 */
export function createOpening(room, type, { wall = 'top', preferred, ...overrides } = {}) {
  const preset = OPENING_TYPES[type] ?? OPENING_TYPES.door
  const base = {
    id: createId('opening'),
    type: OPENING_TYPES[type] ? type : 'door',
    wall,
    offset: 0,
    width: preset.width,
    height: preset.height,
    sill: preset.sill,
    ...(type === 'door' ? { hinge: 'start', swing: 'in' } : {}),
    ...overrides,
  }
  const openings = room.openings ?? []
  for (const side of [wall, ...WALL_SIDES.filter((s) => s !== wall)]) {
    const candidate = clampOpening(room, { ...base, wall: side })
    const offset = findOpeningOffset(room, openings, candidate, side === wall ? preferred : undefined)
    if (offset !== null) return { ...candidate, offset }
  }
  return null
}

/**
 * Aplica uma alteração a uma abertura, mantendo-a válida: tipo, parede,
 * lado da dobradiça e sentido conhecidos; medidas e posição limitadas.
 */
export function applyOpeningPatch(room, opening, patch) {
  const next = { ...opening }
  if (WALL_SIDES.includes(patch.wall)) next.wall = patch.wall
  for (const key of ['offset', 'width', 'height', 'sill']) {
    if (typeof patch[key] === 'number' && Number.isFinite(patch[key])) next[key] = patch[key]
  }
  if (opening.type === 'door') {
    if (patch.hinge === 'start' || patch.hinge === 'end') next.hinge = patch.hinge
    if (patch.swing === 'in' || patch.swing === 'out') next.swing = patch.swing
  }
  return clampOpening(room, next)
}

/** Depois de mudar o tamanho da divisão, as aberturas voltam a caber nas paredes. */
export function fitOpeningsToRoom(room) {
  if (!room.openings?.length) return room
  const openings = room.openings.map((opening) => {
    const fitted = clampOpening(room, opening)
    return Object.keys(fitted).every((key) => fitted[key] === opening[key]) ? opening : fitted
  })
  return openings.every((opening, i) => opening === room.openings[i]) ? room : { ...room, openings }
}

/** Nome para mensagens: «Porta», «Janela 2»… */
export function openingLabels(openings) {
  const totals = {}
  for (const o of openings) totals[o.type] = (totals[o.type] ?? 0) + 1
  const seen = {}
  return new Map(
    openings.map((o) => {
      const label = OPENING_TYPES[o.type]?.label ?? 'Abertura'
      if (totals[o.type] === 1) return [o.id, label]
      seen[o.type] = (seen[o.type] ?? 0) + 1
      return [o.id, `${label} ${seen[o.type]}`]
    }),
  )
}
