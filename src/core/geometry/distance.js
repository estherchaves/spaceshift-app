import { dot, length, sub } from './vec2.js'
import { pointInPolygon } from './polygon.js'

/*
 * Distâncias e recortes entre polígonos convexos no plano do chão.
 * Servem para medir passagens e para desenhar a zona exata de uma
 * colisão.
 */

/** Ponto do segmento [a, b] mais próximo de p. */
export function closestPointOnSegment(p, a, b) {
  const ab = sub(b, a)
  const lengthSq = dot(ab, ab)
  if (lengthSq === 0) return a
  const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / lengthSq))
  return { x: a.x + ab.x * t, z: a.z + ab.z * t }
}

/** Ponto da fronteira do polígono mais próximo de p, e a distância. */
export function closestPointOnPolygon(p, polygon) {
  let best = { point: polygon[0], distance: Infinity }
  for (let i = 0; i < polygon.length; i++) {
    const q = closestPointOnSegment(p, polygon[i], polygon[(i + 1) % polygon.length])
    const d = length(sub(p, q))
    if (d < best.distance) best = { point: q, distance: d }
  }
  return best
}

/** Distância de um ponto a um polígono (0 se estiver dentro). */
export function pointPolygonDistance(p, polygon) {
  if (pointInPolygon(p, polygon)) return 0
  return closestPointOnPolygon(p, polygon).distance
}

/**
 * Distância mínima entre dois polígonos convexos que não se sobrepõem.
 * Devolve também onde a passagem é mais estreita: `from` (em a) e `to`
 * (em b). Quando as arestas mais próximas são paralelas (o caso habitual,
 * dois móveis frente a frente), o par devolvido fica a meio do troço
 * em que a distância é mínima, que é onde faz sentido mostrar a cota.
 */
export function polygonsDistance(a, b, tolerance = 0.001) {
  const pairs = []
  for (const p of a) pairs.push({ from: p, to: closestPointOnPolygon(p, b).point })
  for (const p of b) pairs.push({ from: closestPointOnPolygon(p, a).point, to: p })
  let distance = Infinity
  for (const pair of pairs) distance = Math.min(distance, length(sub(pair.to, pair.from)))
  const closest = pairs.filter((pair) => length(sub(pair.to, pair.from)) <= distance + tolerance)
  if (closest.length === 1 || distance === 0) return { distance, ...closest[0] }

  // Centra a cota no troço paralelo: média dos extremos ao longo da aresta.
  const ref = closest[0]
  const n = distance > 0 ? { x: (ref.to.x - ref.from.x) / distance, z: (ref.to.z - ref.from.z) / distance } : { x: 0, z: 1 }
  const t = { x: -n.z, z: n.x }
  const along = closest.map((pair) => dot(pair.from, t))
  const mid = (Math.min(...along) + Math.max(...along)) / 2
  const shift = mid - dot(ref.from, t)
  const from = { x: ref.from.x + t.x * shift, z: ref.from.z + t.z * shift }
  return { distance, from, to: { x: from.x + n.x * distance, z: from.z + n.z * distance } }
}

/**
 * Recorta um polígono convexo pelo semiplano em que `inside(p)` é ≥ 0
 * (Sutherland–Hodgman). `inside` deve ser linear em p.
 */
export function clipByHalfPlane(polygon, inside) {
  const out = []
  for (let i = 0; i < polygon.length; i++) {
    const current = polygon[i]
    const next = polygon[(i + 1) % polygon.length]
    const dc = inside(current)
    const dn = inside(next)
    if (dc >= 0) out.push(current)
    if ((dc >= 0) !== (dn >= 0)) {
      const t = dc / (dc - dn)
      out.push({ x: current.x + (next.x - current.x) * t, z: current.z + (next.z - current.z) * t })
    }
  }
  return out
}

function signedArea(polygon) {
  let sum = 0
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]
    const b = polygon[(i + 1) % polygon.length]
    sum += a.x * b.z - b.x * a.z
  }
  return sum / 2
}

/** Interseção de dois polígonos convexos (pode ser vazia: []). */
export function intersectConvex(subject, clip) {
  // Orientação do recorte: o interior fica do mesmo lado de todas as arestas.
  const sign = signedArea(clip) >= 0 ? 1 : -1
  let result = subject
  for (let i = 0; i < clip.length && result.length > 0; i++) {
    const a = clip[i]
    const b = clip[(i + 1) % clip.length]
    result = clipByHalfPlane(result, (p) => sign * ((b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x)))
  }
  return result.length >= 3 ? result : []
}
