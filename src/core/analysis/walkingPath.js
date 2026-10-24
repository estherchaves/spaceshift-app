import { add, length, scale, sub } from '../geometry/vec2.js'
import { buildClearanceField } from './circulation.js'

/*
 * Percurso a pé entre dois pontos da divisão.
 *
 * 1. Folga de cada célula (a mesma grelha da circulação): uma pessoa com
 *    `body` de largura passa numa célula se a folga for ≥ body / 2.
 * 2. A* com 8 vizinhos. O custo de cada passo é o comprimento, um pouco
 *    agravado junto aos móveis (quem anda não vai encostado), por isso o
 *    caminho fica pelo meio das passagens.
 * 3. O caminho em escada da grelha é endireitado: de cada ponto salta-se
 *    para o mais distante que se vê em linha reta sem sair das células
 *    livres.
 * 4. Ao longo do caminho mede-se a largura da passagem (a corda mais
 *    curta por cada ponto, com raios exatos até às paredes e aos móveis)
 *    e guarda-se o ponto mais estreito.
 */

/** Largura de uma pessoa a andar de frente (m). */
export const WALK_BODY = 0.5

const COMFORT = 0.45 // abaixo desta folga o passo custa mais
const FAR = 50

export function findWalkingPath(room, obstacles, from, to, { body = WALK_BODY } = {}) {
  const field = buildClearanceField(room, obstacles)
  const { cell, cols, rows, offsetX, offsetZ, clearance, centre } = field
  const radius = body / 2 - cell / 2
  const passable = (k) => clearance[k] >= radius
  const cellOf = (p) => {
    const i = Math.min(cols - 1, Math.max(0, Math.floor((p.x - offsetX) / cell)))
    const j = Math.min(rows - 1, Math.max(0, Math.floor((p.z - offsetZ) / cell)))
    return j * cols + i
  }

  const start = nearestPassable(field, cellOf(from), passable)
  const goal = nearestPassable(field, cellOf(to), passable)
  if (start === null || goal === null) return { ok: false, reason: 'blocked' }
  const cells = astar(field, start, goal, passable)
  if (!cells) return { ok: false, reason: 'no-path' }

  const at = (k) => centre(k % cols, Math.floor(k / cols))
  const first = start === cellOf(from) ? from : at(start)
  const last = goal === cellOf(to) ? to : at(goal)
  const raw = [first, ...cells.slice(1, -1).map(at), last]
  const points = smooth(raw, (a, b) => lineIsClear(a, b, cell, cellOf, passable))
  const total = points.slice(1).reduce((sum, p, i) => sum + length(sub(p, points[i])), 0)
  return { ok: true, points, length: total, narrowest: narrowestPoint(room, obstacles, points) }
}

/** A célula livre mais próxima (em anel crescente), ou null. */
function nearestPassable({ cols, rows }, k, passable) {
  if (passable(k)) return k
  const i0 = k % cols
  const j0 = Math.floor(k / cols)
  for (let r = 1; r < Math.max(cols, rows); r++) {
    let best = null
    let bestD = Infinity
    for (let j = j0 - r; j <= j0 + r; j++) {
      for (let i = i0 - r; i <= i0 + r; i++) {
        if (Math.max(Math.abs(i - i0), Math.abs(j - j0)) !== r) continue
        if (i < 0 || j < 0 || i >= cols || j >= rows) continue
        const n = j * cols + i
        const d = (i - i0) ** 2 + (j - j0) ** 2
        if (passable(n) && d < bestD) {
          best = n
          bestD = d
        }
      }
    }
    if (best !== null) return best
  }
  return null
}

function astar({ cols, rows, clearance, cell }, start, goal, passable) {
  const n = cols * rows
  const g = new Float64Array(n).fill(Infinity)
  const came = new Int32Array(n).fill(-1)
  const closed = new Uint8Array(n)
  const gi = goal % cols
  const gj = Math.floor(goal / cols)
  const h = (k) => {
    const i = k % cols
    const j = (k - i) / cols
    return Math.hypot(i - gi, j - gj) * cell
  }
  const heap = new MinHeap()
  g[start] = 0
  heap.push(start, h(start))
  const steps = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, Math.SQRT2],
    [1, -1, Math.SQRT2],
    [-1, 1, Math.SQRT2],
    [-1, -1, Math.SQRT2],
  ]
  while (heap.size) {
    const k = heap.pop()
    if (k === goal) break
    if (closed[k]) continue
    closed[k] = 1
    const i = k % cols
    const j = (k - i) / cols
    for (const [di, dj, len] of steps) {
      const ni = i + di
      const nj = j + dj
      if (ni < 0 || nj < 0 || ni >= cols || nj >= rows) continue
      const m = nj * cols + ni
      if (closed[m] || !passable(m)) continue
      // Na diagonal, não cortar cantos.
      if (di && dj && (!passable(j * cols + ni) || !passable(nj * cols + i))) continue
      const tight = Math.max(0, COMFORT - clearance[m]) / COMFORT
      const cost = g[k] + len * cell * (1 + 0.6 * tight)
      if (cost < g[m]) {
        g[m] = cost
        came[m] = k
        heap.push(m, cost + h(m))
      }
    }
  }
  if (g[goal] === Infinity) return null
  const path = [goal]
  while (path[path.length - 1] !== start) path.push(came[path[path.length - 1]])
  return path.reverse()
}

/** Todas as células atravessadas pelo segmento são livres? */
function lineIsClear(a, b, cell, cellOf, passable) {
  const d = length(sub(b, a))
  const n = Math.max(1, Math.ceil(d / (cell / 2)))
  for (let s = 0; s <= n; s++) {
    if (!passable(cellOf(add(a, scale(sub(b, a), s / n))))) return false
  }
  return true
}

/** Endireita o caminho: salta para o ponto mais distante à vista. */
function smooth(points, visible) {
  if (points.length <= 2) return points
  const out = [points[0]]
  let i = 0
  while (i < points.length - 1) {
    let j = points.length - 1
    while (j > i + 1 && !visible(points[i], points[j])) j--
    out.push(points[j])
    i = j
  }
  return out
}

/** Distância de `p` na direção `d` (unitária) até à parede ou móvel mais próximo. */
export function rayDistance(room, obstacles, p, d) {
  let best = FAR
  // Paredes interiores.
  if (d.x > 1e-12) best = Math.min(best, (room.width - p.x) / d.x)
  if (d.x < -1e-12) best = Math.min(best, -p.x / d.x)
  if (d.z > 1e-12) best = Math.min(best, (room.depth - p.z) / d.z)
  if (d.z < -1e-12) best = Math.min(best, -p.z / d.z)
  for (const shape of obstacles) {
    for (const polygon of shape) {
      for (let k = 0; k < polygon.length; k++) {
        const a = polygon[k]
        const b = polygon[(k + 1) % polygon.length]
        const t = raySegment(p, d, a, b)
        if (t !== null && t < best) best = t
      }
    }
  }
  return Math.max(0, best)
}

function raySegment(p, d, a, b) {
  const e = sub(b, a)
  const denom = d.x * e.z - d.z * e.x
  if (Math.abs(denom) < 1e-12) return null
  const ap = sub(a, p)
  const t = (ap.x * e.z - ap.z * e.x) / denom
  const u = (ap.x * d.z - ap.z * d.x) / denom
  return t >= 0 && u >= 0 && u <= 1 ? t : null
}

/**
 * Largura da passagem num ponto: a corda mais curta que passa por ele,
 * de obstáculo a obstáculo (ou parede), procurada de 10° em 10°. Num
 * corredor é a largura do corredor, seja qual for a direção do caminho.
 */
export function passageWidthAt(room, obstacles, p, directions = 18) {
  let best = null
  for (let k = 0; k < directions; k++) {
    const t = (k / directions) * Math.PI
    const d = { x: Math.cos(t), z: Math.sin(t) }
    const back = { x: -d.x, z: -d.z }
    const ahead = rayDistance(room, obstacles, p, d)
    const behind = rayDistance(room, obstacles, p, back)
    if (!best || ahead + behind < best.width) best = { width: ahead + behind, from: add(p, scale(d, ahead)), to: add(p, scale(back, behind)) }
  }
  return best
}

/** Ponto mais estreito do caminho, sem contar as pontas (onde se para). */
function narrowestPoint(room, obstacles, points, step = 0.05, skip = 0.2) {
  const total = points.slice(1).reduce((sum, p, i) => sum + length(sub(p, points[i])), 0)
  const ignore = (along) => total > 2 * skip && (along < skip || total - along < skip)
  let best = null
  let travelled = 0
  for (let s = 1; s < points.length; s++) {
    const a = points[s - 1]
    const seg = sub(points[s], a)
    const len = length(seg)
    if (len < 1e-9) continue
    const dir = scale(seg, 1 / len)
    for (let t = 0; t <= len; t += step) {
      if (ignore(travelled + t)) continue
      const p = add(a, scale(dir, t))
      const here = passageWidthAt(room, obstacles, p)
      if (!best || here.width < best.width) best = { point: p, ...here }
    }
    travelled += len
  }
  return best
}

class MinHeap {
  constructor() {
    this.keys = []
    this.values = []
  }

  get size() {
    return this.keys.length
  }

  push(value, key) {
    const { keys, values } = this
    let i = keys.length
    keys.push(key)
    values.push(value)
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (keys[parent] <= key) break
      keys[i] = keys[parent]
      values[i] = values[parent]
      i = parent
    }
    keys[i] = key
    values[i] = value
  }

  pop() {
    const { keys, values } = this
    const top = values[0]
    const lastKey = keys.pop()
    const lastValue = values.pop()
    if (keys.length) {
      let i = 0
      const n = keys.length
      for (;;) {
        const l = 2 * i + 1
        if (l >= n) break
        const r = l + 1
        const c = r < n && keys[r] < keys[l] ? r : l
        if (keys[c] >= lastKey) break
        keys[i] = keys[c]
        values[i] = values[c]
        i = c
      }
      keys[i] = lastKey
      values[i] = lastValue
    }
    return top
  }
}
