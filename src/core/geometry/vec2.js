/**
 * Vetores 2D no plano do chão. Usamos {x, z} para não confundir com
 * coordenadas de ecrã ({x, y}).
 */

export const vec = (x, z) => ({ x, z })
export const add = (a, b) => ({ x: a.x + b.x, z: a.z + b.z })
export const sub = (a, b) => ({ x: a.x - b.x, z: a.z - b.z })
export const scale = (a, s) => ({ x: a.x * s, z: a.z * s })
export const dot = (a, b) => a.x * b.x + a.z * b.z
export const length = (a) => Math.hypot(a.x, a.z)

/**
 * Roda um vetor `radians` no sentido dos ponteiros do relógio no ecrã
 * (com Z para baixo, a fórmula padrão produz rotação horária).
 */
export function rotate(a, radians) {
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return { x: a.x * cos - a.z * sin, z: a.x * sin + a.z * cos }
}

/** Perpendicular unitária (normal de uma aresta). */
export function normal(a) {
  const len = length(a) || 1
  return { x: -a.z / len, z: a.x / len }
}
