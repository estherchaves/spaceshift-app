import { degToRad } from '../geometry/angles.js'
import { CORNER_SOFA } from '../geometry/shapes.js'
import { clipByHalfPlane, intersectConvex } from '../geometry/distance.js'
import { polygonArea } from '../geometry/polygon.js'
import { add, rotate, sub } from '../geometry/vec2.js'

/** Interseções com menos área do que isto são só contacto (móveis encostados). */
const MIN_INTRUSION_AREA = 1e-5

/*
 * Zonas de uso: o espaço livre que um móvel precisa à volta para ser
 * usado. Descritas no referencial local (frente = +Z, esquerda = −X) e
 * medidas a partir da aresta do móvel. São orientações de conforto.
 *
 *  - seat:     45 cm à frente para as pernas (sofás e poltronas)
 *  - bed:      60 cm de lado para entrar; numa cama de solteiro basta um lado
 *  - wardrobe: 70 cm à frente para abrir as portas
 *  - drawers:  60 cm à frente para abrir as gavetas
 *  - desk:     75 cm à frente para puxar a cadeira
 */
export const USAGE_RULES = {
  seat: { sides: ['front'], depth: 0.45, purpose: 'para as pernas' },
  bed: { sides: ['left', 'right'], depth: 0.6, purpose: 'para entrar na cama' },
  wardrobe: { sides: ['front'], depth: 0.7, purpose: 'para abrir as portas' },
  drawers: { sides: ['front'], depth: 0.6, purpose: 'para abrir as gavetas' },
  desk: { sides: ['front'], depth: 0.75, purpose: 'para puxar a cadeira' },
}

/** Camas mais estreitas do que isto encostam-se a uma parede: basta um lado livre. */
export const SINGLE_BED_MAX_WIDTH = 1.2

const rect = (x0, z0, x1, z1) => [
  { x: x0, z: z0 },
  { x: x1, z: z0 },
  { x: x1, z: z1 },
  { x: x0, z: z1 },
]

/**
 * Zonas de uso de um móvel, no referencial local. Cada zona tem o lado,
 * o retângulo e a função que mede a distância de um ponto à aresta do móvel.
 */
export function getUsageZones(dimensions, usage, shape = 'rect') {
  const rule = USAGE_RULES[usage]
  if (!rule) return []
  const hw = dimensions.width / 2
  const hd = dimensions.depth / 2
  const d = rule.depth
  const zones = []
  for (const side of rule.sides) {
    if (side === 'front' && shape === 'corner') {
      // Sofá de canto: frente dos lugares e frente da chaise longue.
      const seat = -hd + dimensions.depth * CORNER_SOFA.seatDepthRatio
      const chaise = hw - dimensions.width * CORNER_SOFA.chaiseRatio
      zones.push({ side, polygon: rect(-hw, seat, chaise, seat + d), gap: (p) => p.z - seat })
      zones.push({ side, polygon: rect(chaise, hd, hw, hd + d), gap: (p) => p.z - hd })
    } else if (side === 'front') {
      zones.push({ side, polygon: rect(-hw, hd, hw, hd + d), gap: (p) => p.z - hd })
    } else if (side === 'left') {
      zones.push({ side, polygon: rect(-hw - d, -hd, -hw, hd), gap: (p) => -hw - p.x })
    } else if (side === 'right') {
      zones.push({ side, polygon: rect(hw, -hd, hw + d, hd), gap: (p) => p.x - hw })
    }
  }
  return zones
}

/**
 * Mede cada zona de uso: quanto espaço livre há até ao primeiro obstáculo
 * (outro móvel ou parede) e quem é. `obstacles` = [{ name, shape }].
 * @returns {Array<{side, required, free, blocker, polygon}>} polígonos no mundo
 */
export function measureUsage(item, usage, shape, obstacles, room) {
  const rule = USAGE_RULES[usage]
  if (!rule) return []
  const radians = degToRad(item.rotation ?? 0)
  const toLocal = (p) => rotate(sub(p, item.position), -radians)
  const toWorld = (p) => add(item.position, rotate(p, radians))
  const walls = [
    { name: 'parede', outside: (p) => -p.x },
    { name: 'parede', outside: (p) => p.x - room.width },
    { name: 'parede', outside: (p) => -p.z },
    { name: 'parede', outside: (p) => p.z - room.depth },
  ]

  return getUsageZones(item.dimensions, usage, shape).map((zone) => {
    let free = rule.depth
    let blocker = null
    const consider = (points, name) => {
      for (const p of points) {
        const gap = Math.max(0, zone.gap(p))
        if (gap < free - 1e-9) {
          free = gap
          blocker = name
        }
      }
    }
    for (const obstacle of obstacles) {
      for (const polygon of obstacle.shape) {
        const inside = intersectConvex(polygon.map(toLocal), zone.polygon)
        if (inside.length && polygonArea(inside) > MIN_INTRUSION_AREA) consider(inside, obstacle.name)
      }
    }
    const world = zone.polygon.map(toWorld)
    for (const wall of walls) {
      const outside = clipByHalfPlane(world, wall.outside)
      if (outside.length >= 3 && polygonArea(outside) > MIN_INTRUSION_AREA) consider(outside.map(toLocal), wall.name)
    }
    return { side: zone.side, required: rule.depth, free, blocker, polygon: world }
  })
}
