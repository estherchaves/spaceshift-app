import { degToRad } from './angles.js'
import { add, rotate } from './vec2.js'
import { boundingBox } from './polygon.js'

/*
 * Forma real da pegada de cada tipo de móvel. O modelo continua a guardar
 * só comprimento × largura; a forma diz que parte desse retângulo o móvel
 * ocupa de facto. Cada forma é uma lista de polígonos CONVEXOS no
 * referencial local (centro na origem, trás = −Z), para o SAT continuar
 * exato: um L é a união de dois retângulos.
 *
 *  - 'rect'    retângulo completo (a maioria dos móveis)
 *  - 'ellipse' mesa redonda/oval, inscrita no retângulo
 *  - 'corner'  sofá de canto: costas a todo o comprimento e chaise
 *              longue do lado direito com a largura toda
 */
export const FOOTPRINT_SHAPES = ['rect', 'ellipse', 'corner']

/** Proporções do sofá de canto, partilhadas pela planta, pelo 3D e pelas colisões. */
export const CORNER_SOFA = { chaiseRatio: 0.34, seatDepthRatio: 0.56 }

/**
 * Lados do polígono que aproxima uma elipse. Com 64 lados o erro máximo
 * (raio × (1 − cos(π/64))) é inferior a 1 mm para mesas até 1,4 m, abaixo
 * da tolerância das colisões.
 */
export const ELLIPSE_SEGMENTS = 64

const rect = (x0, z0, x1, z1) => [
  { x: x0, z: z0 },
  { x: x1, z: z0 },
  { x: x1, z: z1 },
  { x: x0, z: z1 },
]

/** Polígonos convexos da forma, no referencial local do móvel. */
export function getLocalShape({ width, depth }, shape = 'rect') {
  const hw = width / 2
  const hd = depth / 2
  if (shape === 'ellipse') {
    const points = []
    for (let i = 0; i < ELLIPSE_SEGMENTS; i++) {
      const a = (i / ELLIPSE_SEGMENTS) * Math.PI * 2
      points.push({ x: hw * Math.cos(a), z: hd * Math.sin(a) })
    }
    return [points]
  }
  if (shape === 'corner') {
    const seat = -hd + depth * CORNER_SOFA.seatDepthRatio
    const chaise = hw - width * CORNER_SOFA.chaiseRatio
    return [rect(-hw, -hd, hw, seat), rect(chaise, seat, hw, hd)]
  }
  return [rect(-hw, -hd, hw, hd)]
}

/**
 * Contorno exterior único da forma, no referencial local, para desenhar
 * (o L do sofá de canto é um só polígono, não convexo).
 */
export function getLocalOutline(dimensions, shape = 'rect') {
  if (shape !== 'corner') return getLocalShape(dimensions, shape)[0]
  const hw = dimensions.width / 2
  const hd = dimensions.depth / 2
  const seat = -hd + dimensions.depth * CORNER_SOFA.seatDepthRatio
  const chaise = hw - dimensions.width * CORNER_SOFA.chaiseRatio
  return [
    { x: -hw, z: -hd },
    { x: hw, z: -hd },
    { x: hw, z: hd },
    { x: chaise, z: hd },
    { x: chaise, z: seat },
    { x: -hw, z: seat },
  ]
}

/** Polígonos da forma no mundo (metros), com a posição e a rotação do móvel. */
export function getItemShape(item, shape = 'rect') {
  const radians = degToRad(item.rotation ?? 0)
  return getLocalShape(item.dimensions, shape).map((polygon) =>
    polygon.map((point) => add(item.position, rotate(point, radians))),
  )
}

/** Área da forma (m²). */
export function shapeArea(dimensions, shape = 'rect') {
  const { width, depth } = dimensions
  if (shape === 'ellipse') return (Math.PI * width * depth) / 4
  if (shape === 'corner') {
    const seat = depth * CORNER_SOFA.seatDepthRatio
    return width * seat + width * CORNER_SOFA.chaiseRatio * (depth - seat)
  }
  return width * depth
}

/** Caixa alinhada com os eixos que contém todos os polígonos. */
export function shapeBounds(polygons) {
  return boundingBox(polygons.flat())
}
