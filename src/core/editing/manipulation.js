import { degToRad, normalizeDegrees, radToDeg, snapAngle } from '../geometry/angles.js'
import { getFootprint } from '../geometry/footprint.js'
import { boundingBox } from '../geometry/polygon.js'
import { snapToGrid } from '../geometry/snap.js'
import { add, rotate, sub } from '../geometry/vec2.js'
import { clamp, roundToMm } from '../units/units.js'

/*
 * Matemática da manipulação direta na planta (mover, rodar, redimensionar).
 * Tudo em metros e independente do ecrã: a interface converte o ponteiro
 * para coordenadas do mundo e chama estas funções.
 */

/**
 * Posição final de um móvel arrastado. Com snap, alinha a caixa envolvente
 * do móvel (não o centro) à grelha: assim as arestas encostam às linhas da
 * grelha e às paredes, que estão em x = 0 e z = 0.
 */
export function snapItemPosition(item, position, gridSize, enabled = true) {
  if (!enabled || !gridSize) return { x: roundToMm(position.x), z: roundToMm(position.z) }
  const box = boundingBox(getFootprint({ ...item, position: { x: 0, z: 0 } }))
  const minX = snapToGrid(position.x + box.minX, gridSize)
  const minZ = snapToGrid(position.z + box.minZ, gridSize)
  return { x: roundToMm(minX - box.minX), z: roundToMm(minZ - box.minZ) }
}

export function moveItem(item, startPosition, delta, { gridSize, snap }) {
  return snapItemPosition(item, add(startPosition, delta), gridSize, snap)
}

/**
 * Rotação a partir do ponteiro. A pega de rotação fica "à frente" do móvel
 * (lado −Z local), por isso o ângulo 0 corresponde ao ponteiro por cima.
 * Com `free` (tecla Shift) a rotação é contínua, ao grau.
 */
export function rotationFromPointer(center, pointer, { step = 15, free = false } = {}) {
  const d = sub(pointer, center)
  if (Math.hypot(d.x, d.z) < 1e-9) return 0
  const degrees = normalizeDegrees(radToDeg(Math.atan2(d.z, d.x)) + 90)
  return free ? normalizeDegrees(Math.round(degrees)) : snapAngle(degrees, step)
}

/** Converte um ponto do mundo para o referencial local do móvel. */
export function toLocal(item, point) {
  return rotate(sub(point, item.position), -degToRad(item.rotation))
}

export function toWorld(item, local) {
  return add(item.position, rotate(local, degToRad(item.rotation)))
}

/**
 * Redimensiona arrastando uma pega, mantendo fixa a aresta (ou o canto)
 * oposta. `handle` = {sx, sz} com valores −1, 0 ou 1 no referencial local:
 * {sx: 1, sz: 0} é a pega da aresta direita, {sx: 1, sz: 1} o canto
 * inferior direito. Funciona com qualquer rotação.
 *
 * @returns {{position: {x, z}, dimensions: {width, depth, height}}}
 */
export function resizeFromHandle(item, handle, pointer, { bounds, gridSize, snap }) {
  const local = toLocal(item, pointer)
  const { width, depth } = item.dimensions
  const step = snap && gridSize ? gridSize : 0.01

  const resizeAxis = (sign, size, coordinate, key) => {
    if (sign === 0) return { size, shift: 0 }
    const raw = sign * coordinate + size / 2 // distância da aresta fixa ao ponteiro
    const next = clamp(snapToGrid(raw, step), bounds.min[key], bounds.max[key])
    return { size: next, shift: (sign * (next - size)) / 2 }
  }

  const x = resizeAxis(handle.sx, width, local.x, 'width')
  const z = resizeAxis(handle.sz, depth, local.z, 'depth')
  const centre = toWorld(item, { x: x.shift, z: z.shift })
  return {
    position: { x: roundToMm(centre.x), z: roundToMm(centre.z) },
    dimensions: { ...item.dimensions, width: roundToMm(x.size), depth: roundToMm(z.size) },
  }
}

export const RESIZE_HANDLES = [
  { id: 'n', sx: 0, sz: -1 },
  { id: 'ne', sx: 1, sz: -1 },
  { id: 'e', sx: 1, sz: 0 },
  { id: 'se', sx: 1, sz: 1 },
  { id: 's', sx: 0, sz: 1 },
  { id: 'sw', sx: -1, sz: 1 },
  { id: 'w', sx: -1, sz: 0 },
  { id: 'nw', sx: -1, sz: -1 },
]

/** Pegas que fazem sentido para os limites do móvel (ex.: só largura). */
export function availableHandles(bounds) {
  const canX = bounds.max.width > bounds.min.width
  const canZ = bounds.max.depth > bounds.min.depth
  return RESIZE_HANDLES.filter((h) => (h.sx === 0 || canX) && (h.sz === 0 || canZ) && (canX || canZ))
}
