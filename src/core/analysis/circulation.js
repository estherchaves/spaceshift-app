import { pointPolygonDistance, shapeBounds } from '../geometry/index.js'
import { GRID_CELL, MAX_GRID_CELLS } from './rules.js'

/*
 * Grelha de circulação. Uma célula é "circulável" quando um círculo com
 * o diâmetro da passagem mínima, centrado nela, cabe sem tocar em paredes
 * nem em obstáculos. As células circuláveis ligadas entre si formam
 * zonas; a maior é a zona de circulação principal.
 *
 * Os obstáculos são rasterizados linha a linha (uma célula é obstáculo
 * se o móvel tocar o seu quadrado, alargado meia célula) e a distância de
 * cada célula ao obstáculo mais próximo vem de uma transformada de
 * distância euclidiana exata em tempo linear (Felzenszwalb e
 * Huttenlocher). As paredes entram pela distância exata. A tolerância é
 * de cerca de uma célula (5 cm): as passagens em si são medidas à parte,
 * com a geometria exata, em analyzeLayout.
 */

export function cellSizeFor(room) {
  const byCount = Math.sqrt((room.width * room.depth) / MAX_GRID_CELLS)
  return Math.max(GRID_CELL, Math.ceil(byCount * 100) / 100)
}

/**
 * Folga de cada célula: distância (m) do centro da célula à parede ou ao
 * obstáculo mais próximo. É a base da circulação e do percurso a pé.
 * @param {{width:number, depth:number}} room
 * @param {Array<Array<{x:number,z:number}[]>>} obstacles  formas (listas de polígonos)
 */
export function buildClearanceField(room, obstacles) {
  const cell = cellSizeFor(room)
  const cols = Math.max(1, Math.floor(room.width / cell + 1e-9))
  const rows = Math.max(1, Math.floor(room.depth / cell + 1e-9))
  const offsetX = (room.width - cols * cell) / 2
  const offsetZ = (room.depth - rows * cell) / 2
  const centre = (i, j) => ({ x: offsetX + (i + 0.5) * cell, z: offsetZ + (j + 0.5) * cell })

  // Rasterização dos obstáculos (só as células da caixa de cada móvel).
  const INF = 1e20
  const field = new Float64Array(cols * rows).fill(INF)
  const half = cell / 2
  for (const polygons of obstacles) {
    for (const polygon of polygons) {
      const box = shapeBounds([polygon])
      const j0 = Math.max(0, Math.floor((box.minZ - half - offsetZ) / cell))
      const j1 = Math.min(rows - 1, Math.floor((box.maxZ + half - offsetZ) / cell))
      for (let j = j0; j <= j1; j++) {
        // Linha a linha: intervalo do polígono convexo entre z − ½ e z + ½ célula.
        const z = offsetZ + (j + 0.5) * cell
        const span = convexSpanX(polygon, z - half, z + half)
        if (!span) continue
        const i0 = Math.max(0, Math.ceil((span.min - half - offsetX) / cell - 0.5))
        const i1 = Math.min(cols - 1, Math.floor((span.max + half - offsetX) / cell - 0.5))
        for (let i = i0; i <= i1; i++) field[j * cols + i] = 0
      }
    }
  }
  squaredDistanceTransform(field, cols, rows)

  const clearance = new Float64Array(cols * rows)
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i
      const p = centre(i, j)
      const wall = Math.min(p.x, room.width - p.x, p.z, room.depth - p.z)
      // field está em células². A rasterização engorda os móveis até meia
      // célula, por isso a folga real é a distância entre centros + meia célula.
      clearance[k] = Math.min(wall, Math.sqrt(field[k]) * cell + half)
    }
  }
  return { cell, cols, rows, offsetX, offsetZ, centre, clearance }
}

/**
 * @param {{width:number, depth:number}} room
 * @param {Array<Array<{x:number,z:number}[]>>} obstacles  formas (listas de polígonos)
 * @param {number} passage  largura mínima de passagem (m)
 */
export function buildCirculationGrid(room, obstacles, passage) {
  const field = buildClearanceField(room, obstacles)
  const { cell, cols, rows, clearance } = field
  const radius = passage / 2 - cell / 2
  const walkable = new Uint8Array(cols * rows)
  for (let k = 0; k < walkable.length; k++) walkable[k] = clearance[k] >= radius ? 1 : 0
  const { labels, zones } = labelZones(walkable, cols, rows, cell)
  return { ...field, radius, walkable, labels, zones }
}

/** Intervalo em X ocupado por um polígono convexo na faixa z ∈ [z0, z1] (ou null). */
function convexSpanX(polygon, z0, z1) {
  let min = Infinity
  let max = -Infinity
  const take = (x) => {
    if (x < min) min = x
    if (x > max) max = x
  }
  for (let k = 0; k < polygon.length; k++) {
    const a = polygon[k]
    const b = polygon[(k + 1) % polygon.length]
    if (a.z >= z0 && a.z <= z1) take(a.x)
    // Interseções da aresta com as linhas z0 e z1.
    for (const z of [z0, z1]) {
      if ((a.z - z) * (b.z - z) < 0) take(a.x + ((z - a.z) / (b.z - a.z)) * (b.x - a.x))
    }
  }
  return min <= max ? { min, max } : null
}

/** Transformada de distância 1D (envelope inferior de parábolas). */
function edt1d(f, n, d, v, z) {
  let k = 0
  v[0] = 0
  z[0] = -Infinity
  z[1] = Infinity
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
    while (s <= z[k]) {
      k--
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
    }
    k++
    v[k] = q
    z[k] = s
    z[k + 1] = Infinity
  }
  k = 0
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]
  }
}

/** Distância euclidiana ao quadrado (em células) até à célula 0 mais próxima, no próprio array. */
function squaredDistanceTransform(grid, cols, rows) {
  const n = Math.max(cols, rows)
  const f = new Float64Array(n)
  const d = new Float64Array(n)
  const v = new Int32Array(n)
  const z = new Float64Array(n + 1)
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) f[j] = grid[j * cols + i]
    edt1d(f, rows, d, v, z)
    for (let j = 0; j < rows; j++) grid[j * cols + i] = d[j]
  }
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) f[i] = grid[j * cols + i]
    edt1d(f, cols, d, v, z)
    for (let i = 0; i < cols; i++) grid[j * cols + i] = d[i]
  }
}

/** Componentes ligados (vizinhança de 4), ordenados da maior para a menor. */
function labelZones(walkable, cols, rows, cell) {
  const labels = new Int32Array(cols * rows).fill(-1)
  const zones = []
  const stack = []
  for (let start = 0; start < walkable.length; start++) {
    if (!walkable[start] || labels[start] !== -1) continue
    const id = zones.length
    const zone = { id, cells: [], minI: Infinity, maxI: -Infinity, minJ: Infinity, maxJ: -Infinity }
    labels[start] = id
    stack.push(start)
    while (stack.length) {
      const k = stack.pop()
      const i = k % cols
      const j = (k - i) / cols
      zone.cells.push(k)
      zone.minI = Math.min(zone.minI, i)
      zone.maxI = Math.max(zone.maxI, i)
      zone.minJ = Math.min(zone.minJ, j)
      zone.maxJ = Math.max(zone.maxJ, j)
      const visit = (n) => {
        if (walkable[n] && labels[n] === -1) {
          labels[n] = id
          stack.push(n)
        }
      }
      if (i > 0) visit(k - 1)
      if (i < cols - 1) visit(k + 1)
      if (j > 0) visit(k - cols)
      if (j < rows - 1) visit(k + cols)
    }
    zone.area = zone.cells.length * cell * cell
    zones.push(zone)
  }
  zones.sort((a, b) => b.cells.length - a.cells.length)
  // Renumera para que a zona 0 seja sempre a principal.
  const remap = new Map(zones.map((zone, index) => [zone.id, index]))
  for (let k = 0; k < labels.length; k++) if (labels[k] !== -1) labels[k] = remap.get(labels[k])
  zones.forEach((zone, index) => (zone.id = index))
  return { labels, zones }
}

/**
 * Corridas horizontais de células de uma zona (ou de todas as circuláveis),
 * em metros: [{x, z, width, depth}]. Desenhá-las como um só caminho SVG é
 * leve mesmo com milhares de células.
 */
export function zoneRuns(grid, zoneId = null) {
  const { cols, rows, cell, offsetX, offsetZ, walkable, labels } = grid
  const runs = []
  const inZone = (k) => (zoneId === null ? walkable[k] === 1 : labels[k] === zoneId)
  for (let j = 0; j < rows; j++) {
    let i = 0
    while (i < cols) {
      if (!inZone(j * cols + i)) {
        i++
        continue
      }
      const start = i
      while (i < cols && inZone(j * cols + i)) i++
      runs.push({ x: offsetX + start * cell, z: offsetZ + j * cell, width: (i - start) * cell, depth: cell })
    }
  }
  return runs
}

/** Há alguma célula da zona a menos de `distance` da forma? */
export function zoneReaches(grid, zoneId, polygons, distance) {
  const { cell, cols, rows, offsetX, offsetZ, labels, centre } = grid
  const box = shapeBounds(polygons)
  const i0 = Math.max(0, Math.floor((box.minX - distance - offsetX) / cell))
  const i1 = Math.min(cols - 1, Math.ceil((box.maxX + distance - offsetX) / cell))
  const j0 = Math.max(0, Math.floor((box.minZ - distance - offsetZ) / cell))
  const j1 = Math.min(rows - 1, Math.ceil((box.maxZ + distance - offsetZ) / cell))
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      if (labels[j * cols + i] !== zoneId) continue
      const p = centre(i, j)
      if (polygons.some((polygon) => pointPolygonDistance(p, polygon) <= distance)) return true
    }
  }
  return false
}
