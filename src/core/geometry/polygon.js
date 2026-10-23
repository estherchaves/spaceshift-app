import { dot } from './vec2.js'

/** Área de um polígono simples pela fórmula de Gauss (shoelace). */
export function polygonArea(points) {
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    sum += a.x * b.z - b.x * a.z
  }
  return Math.abs(sum) / 2
}

/** Projeção de um polígono num eixo: intervalo [min, max]. */
export function projectPolygon(points, axis) {
  let min = Infinity
  let max = -Infinity
  for (const p of points) {
    const d = dot(p, axis)
    if (d < min) min = d
    if (d > max) max = d
  }
  return { min, max }
}

export function boundingBox(points) {
  let minX = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxZ = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.z < minZ) minZ = p.z
    if (p.x > maxX) maxX = p.x
    if (p.z > maxZ) maxZ = p.z
  }
  return { minX, minZ, maxX, maxZ, width: maxX - minX, depth: maxZ - minZ }
}

/** Ponto dentro de polígono (ray casting). Pontos na aresta podem variar. */
export function pointInPolygon(point, points) {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i]
    const b = points[j]
    const crosses =
      a.z > point.z !== b.z > point.z &&
      point.x < ((b.x - a.x) * (point.z - a.z)) / (b.z - a.z) + a.x
    if (crosses) inside = !inside
  }
  return inside
}
