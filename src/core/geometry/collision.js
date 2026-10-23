import { getEdgeNormals, getFootprint } from './footprint.js'
import { boundingBox, projectPolygon } from './polygon.js'

/**
 * Tolerância geométrica: móveis encostados (a tocar numa aresta) não são
 * considerados sobrepostos. 1 mm chega para absorver arredondamentos.
 */
export const EPSILON = 0.001

/**
 * Teste de sobreposição entre dois polígonos CONVEXOS pelo
 * Teorema do Eixo Separador (SAT). Funciona com qualquer rotação.
 *
 * @returns {{overlapping: boolean, depth: number}}
 *   depth é a menor penetração (m) encontrada entre os eixos testados;
 *   0 quando não há sobreposição.
 */
export function polygonsOverlap(a, b, epsilon = EPSILON) {
  const axes = [...getEdgeNormals(a), ...getEdgeNormals(b)]
  let minDepth = Infinity
  for (const axis of axes) {
    const pa = projectPolygon(a, axis)
    const pb = projectPolygon(b, axis)
    const depth = Math.min(pa.max, pb.max) - Math.max(pa.min, pb.min)
    if (depth <= epsilon) return { overlapping: false, depth: 0 }
    if (depth < minDepth) minDepth = depth
  }
  return { overlapping: true, depth: minDepth }
}

export function itemsOverlap(itemA, itemB, epsilon = EPSILON) {
  return polygonsOverlap(getFootprint(itemA), getFootprint(itemB), epsilon)
}

/**
 * Verifica se um móvel está totalmente dentro de uma divisão retangular
 * [0, room.width] × [0, room.depth]. Usa os cantos reais do móvel rodado.
 *
 * @returns {{inside: boolean, overflow: {left:number, right:number, top:number, bottom:number}}}
 *   overflow indica quantos metros o móvel ultrapassa cada parede.
 */
export function checkInsideRoom(item, room, epsilon = EPSILON) {
  const box = boundingBox(getFootprint(item))
  const overflow = {
    left: Math.max(0, -box.minX),
    right: Math.max(0, box.maxX - room.width),
    top: Math.max(0, -box.minZ),
    bottom: Math.max(0, box.maxZ - room.depth),
  }
  const inside = Object.values(overflow).every((v) => v <= epsilon)
  return { inside, overflow }
}
