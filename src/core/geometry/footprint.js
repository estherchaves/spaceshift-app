import { degToRad } from './angles.js'
import { add, rotate, sub, normal } from './vec2.js'
import { boundingBox } from './polygon.js'

/**
 * Pegada (footprint) de um móvel no chão: retângulo orientado (OBB).
 *
 * `dimensions.width` é medido no eixo X local do móvel e `dimensions.depth`
 * no eixo Z local. Com rotação 0 o móvel fica alinhado com a divisão.
 * `position` é o CENTRO do móvel.
 *
 * Devolve os 4 cantos por ordem horária no ecrã, começando no
 * canto "traseiro esquerdo" (−w/2, −d/2) local.
 */
export function getFootprint({ position, dimensions, rotation = 0 }) {
  const hw = dimensions.width / 2
  const hd = dimensions.depth / 2
  const radians = degToRad(rotation)
  const local = [
    { x: -hw, z: -hd },
    { x: hw, z: -hd },
    { x: hw, z: hd },
    { x: -hw, z: hd },
  ]
  return local.map((corner) => add(position, rotate(corner, radians)))
}

/** Eixos de separação de um polígono convexo (normais das arestas). */
export function getEdgeNormals(points) {
  const axes = []
  for (let i = 0; i < points.length; i++) {
    const edge = sub(points[(i + 1) % points.length], points[i])
    axes.push(normal(edge))
  }
  return axes
}

/** Caixa alinhada com os eixos que contém o móvel rodado. */
export function getItemBounds(item) {
  return boundingBox(getFootprint(item))
}

export function footprintArea({ dimensions }) {
  return dimensions.width * dimensions.depth
}
