/*
 * Modelos 3D procedimentais dos móveis, descritos como listas de peças.
 *
 * São funções puras (sem Three.js) para poderem ser testadas sem WebGL:
 * os testes verificam que todas as peças cabem dentro das medidas do
 * móvel, que não há valores inválidos e que todos os modelos do catálogo
 * existem. O componente Furniture3D transforma as peças em meshes.
 *
 * Referencial local (metros): origem no centro da base do móvel;
 *   x ∈ [−w/2, w/2] (comprimento), y ∈ [0, h] (altura), z ∈ [−d/2, d/2]
 *   (largura), com a parte de trás em −z — igual aos símbolos de planta.
 *
 * Peça: { shape, position: [x, y, z] (centro), size: [sx, sy, sz], role,
 *         rotation?: [rx, ry, rz], color?: '#rrggbb' }
 *   shape: 'box' | 'roundedBox' | 'cylinder' | 'cone' | 'sphere'
 *   cylinder/cone/sphere usam size como diâmetro em x/z e altura em y.
 *   taper (opcional): razão entre o raio menor e o maior. Num cilindro o
 *   topo tem o diâmetro total e a base fica mais estreita (vaso); num cone
 *   a base tem o diâmetro total e o topo fica mais estreito (abajur).
 *   role: 'main' (cor do móvel) | 'soft' (almofadas, variante clara) |
 *         'wood' | 'metal' | 'linen' | 'shade' | 'pot' | 'leaf' | 'book' | 'dark'
 */

const box = (position, size, role = 'main', extra = {}) => ({ shape: 'box', position, size, role, ...extra })
const soft = (position, size, role = 'soft', extra = {}) => ({ shape: 'roundedBox', position, size, role, ...extra })
const cyl = (position, size, role = 'main', extra = {}) => ({ shape: 'cylinder', position, size, role, ...extra })

/** Quatro pernas cilíndricas encaixadas nos cantos (com recuo `inset`). */
function legs(w, d, height, { inset = 0.05, radius = 0.02, role = 'wood' } = {}) {
  const x = w / 2 - inset - radius
  const z = d / 2 - inset - radius
  return [
    [-x, -z],
    [x, -z],
    [-x, z],
    [x, z],
  ].map(([lx, lz]) => cyl([lx, height / 2, lz], [radius * 2, height, radius * 2], role))
}

function sofa(w, d, h) {
  const legH = Math.min(0.08, h * 0.1)
  const armW = Math.min(0.18, w * 0.1)
  const armTop = h * 0.72
  const backD = Math.min(0.22, d * 0.24)
  const baseTop = legH + h * 0.24
  const seatTop = h * 0.52
  const innerW = w - 2 * armW
  const count = Math.max(1, Math.round((w - 0.3) / 0.65))
  const gap = 0.012
  const cushionW = innerW / count - gap
  const seatD = d - backD - 0.02
  const parts = [
    ...legs(w, d, legH, { radius: 0.022 }),
    box([0, (legH + baseTop) / 2, 0], [w, baseTop - legH, d]),
    box([-(w / 2 - armW / 2), (legH + armTop) / 2, 0], [armW, armTop - legH, d]),
    box([w / 2 - armW / 2, (legH + armTop) / 2, 0], [armW, armTop - legH, d]),
    box([0, (baseTop + h) / 2, -d / 2 + backD / 2], [innerW, h - baseTop, backD]),
  ]
  for (let i = 0; i < count; i++) {
    const x = -innerW / 2 + gap / 2 + cushionW / 2 + i * (cushionW + gap)
    parts.push(soft([x, (baseTop + seatTop) / 2, d / 2 - seatD / 2 - 0.01], [cushionW, seatTop - baseTop, seatD]))
    const backH = (h - seatTop) * 0.82
    parts.push(soft([x, seatTop + backH / 2, -d / 2 + backD + 0.07], [cushionW, backH, 0.14]))
  }
  return parts
}

function sofaCorner(w, d, h) {
  const legH = Math.min(0.08, h * 0.1)
  const backD = Math.min(0.22, d * 0.14)
  const armW = Math.min(0.18, w * 0.07)
  const chaiseW = w * 0.34
  const mainD = d * 0.56
  const baseTop = legH + h * 0.24
  const seatTop = h * 0.52
  const mainSeatW = w - armW - chaiseW
  return [
    ...legs(w, mainD, legH).map((p) => ({ ...p, position: [p.position[0], p.position[1], p.position[2] - (d - mainD) / 2] })),
    cyl([w / 2 - 0.08, legH / 2, d / 2 - 0.08], [0.044, legH, 0.044], 'wood'),
    box([0, (legH + baseTop) / 2, -d / 2 + mainD / 2], [w, baseTop - legH, mainD]),
    box([w / 2 - chaiseW / 2, (legH + baseTop) / 2, mainD / 2], [chaiseW, baseTop - legH, d - mainD]),
    box([-(w / 2 - armW / 2), (legH + h * 0.72) / 2, -d / 2 + mainD / 2], [armW, h * 0.72 - legH, mainD]),
    box([0, (baseTop + h) / 2, -d / 2 + backD / 2], [w, h - baseTop, backD]),
    soft([-w / 2 + armW + mainSeatW / 2, (baseTop + seatTop) / 2, -d / 2 + backD + (mainD - backD) / 2], [mainSeatW - 0.02, seatTop - baseTop, mainD - backD - 0.02]),
    soft([w / 2 - chaiseW / 2, (baseTop + seatTop) / 2, -d / 2 + backD + (d - backD) / 2], [chaiseW - 0.02, seatTop - baseTop, d - backD - 0.02]),
    soft([-w / 2 + armW + mainSeatW / 2, seatTop + (h - seatTop) * 0.4, -d / 2 + backD + 0.07], [mainSeatW - 0.04, (h - seatTop) * 0.8, 0.14]),
    soft([w / 2 - chaiseW / 2, seatTop + (h - seatTop) * 0.4, -d / 2 + backD + 0.07], [chaiseW - 0.04, (h - seatTop) * 0.8, 0.14]),
  ]
}

function bed(w, d, h) {
  const legH = 0.1
  const frameTop = 0.32
  const mattressTop = Math.min(0.56, h * 0.6)
  const headD = 0.07
  const pillows = w < 1.2 ? 1 : 2
  const pillowGap = 0.08
  const pillowW = (w - 0.12 - pillowGap * (pillows - 1)) / pillows
  const parts = [
    ...legs(w, d, legH, { inset: 0.04, radius: 0.025 }),
    box([0, (legH + frameTop) / 2, headD / 2], [w, frameTop - legH, d - headD]),
    box([0, h / 2, -d / 2 + headD / 2], [w, h, headD]),
    soft([0, (frameTop + mattressTop) / 2, headD / 2], [w - 0.06, mattressTop - frameTop, d - headD - 0.04], 'linen'),
    soft([0, mattressTop + 0.02, d * 0.14], [w - 0.02, 0.05, d * 0.66], 'soft'),
  ]
  for (let i = 0; i < pillows; i++) {
    const x = -w / 2 + 0.06 + pillowW / 2 + i * (pillowW + pillowGap)
    parts.push(soft([x, mattressTop + 0.06, -d / 2 + headD + 0.2], [pillowW, 0.12, 0.34], 'linen'))
  }
  return parts
}

function table(w, d, h, { top = 0.04, inset = 0.06, legSize = 0.055 } = {}) {
  const legH = h - top
  const lx = w / 2 - inset - legSize / 2
  const lz = d / 2 - inset - legSize / 2
  return [
    box([0, h - top / 2, 0], [w, top, d]),
    ...[
      [-lx, -lz],
      [lx, -lz],
      [-lx, lz],
      [lx, lz],
    ].map(([x, z]) => box([x, legH / 2, z], [legSize, legH, legSize], 'wood')),
  ]
}

function coffeeTable(w, d, h) {
  return [...table(w, d, h, { top: 0.035, inset: 0.04, legSize: 0.045 }), box([0, 0.11, 0], [w - 0.14, 0.025, d - 0.14], 'wood')]
}

function tableRound(w, d, h) {
  return [
    cyl([0, h - 0.02, 0], [w, 0.04, d]),
    cyl([0, (h - 0.04) / 2, 0], [0.11, h - 0.04, 0.11], 'wood'),
    cyl([0, 0.015, 0], [Math.min(w, d) * 0.5, 0.03, Math.min(w, d) * 0.5], 'wood'),
  ]
}

function desk(w, d, h) {
  const top = 0.035
  const cabW = Math.min(0.42, w * 0.3)
  const legH = h - top
  return [
    box([0, h - top / 2, 0], [w, top, d]),
    box([-w / 2 + 0.03, legH / 2, 0], [0.04, legH, d - 0.04], 'wood'),
    box([w / 2 - cabW / 2, legH / 2, 0], [cabW, legH, d - 0.04]),
    ...[0.25, 0.5, 0.75].map((f) => box([w / 2 - cabW / 2, legH * f, d / 2 - 0.015], [cabW * 0.4, 0.015, 0.012], 'metal')),
  ]
}

function cabinet(w, d, h, { legsHeight = 0.1, doorWidth = 0.45 } = {}) {
  const doors = Math.max(1, Math.round(w / doorWidth))
  const bodyH = h - legsHeight
  const parts = [
    ...(legsHeight > 0 ? legs(w, d, legsHeight, { inset: 0.03, radius: 0.018 }) : []),
    box([0, legsHeight + bodyH / 2, 0], [w, bodyH, d - 0.01]),
  ]
  for (let i = 1; i < doors; i++) {
    parts.push(box([-w / 2 + (i * w) / doors, legsHeight + bodyH / 2, d / 2 - 0.004], [0.006, bodyH - 0.02, 0.008], 'dark'))
  }
  for (let i = 0; i < doors; i++) {
    const x = -w / 2 + ((i + 0.5) * w) / doors
    parts.push(box([x, legsHeight + bodyH * 0.8, d / 2 - 0.006], [Math.min(0.12, w / doors / 3), 0.012, 0.012], 'metal'))
  }
  return parts
}

function nightstand(w, d, h) {
  return [
    ...cabinet(w, d, h, { legsHeight: 0.12, doorWidth: 1 }),
    box([0, 0.12 + (h - 0.12) * 0.5, d / 2 - 0.004], [w - 0.02, 0.006, 0.008], 'dark'),
  ]
}

function wardrobe(w, d, h) {
  const doors = Math.max(2, Math.round(w / 0.5))
  const parts = [box([0, 0.04, 0], [w - 0.02, 0.08, d - 0.04], 'dark'), box([0, 0.08 + (h - 0.08) / 2, 0], [w, h - 0.08, d - 0.01])]
  for (let i = 1; i < doors; i++) {
    parts.push(box([-w / 2 + (i * w) / doors, h / 2 + 0.04, d / 2 - 0.004], [0.006, h - 0.1, 0.008], 'dark'))
  }
  for (let i = 0; i < doors; i++) {
    const side = i % 2 === 0 ? 1 : -1
    const x = -w / 2 + (i * w) / doors + (w / doors) * (side > 0 ? 0.88 : 0.12)
    parts.push(cyl([x, h * 0.5, d / 2 - 0.008], [0.016, 0.32, 0.016], 'metal'))
  }
  return parts
}

const BOOK_COLORS = ['#7b5e57', '#c7b9a3', '#4f5d63', '#a46a4c', '#d9cfbf', '#6b7b5e', '#38404a', '#b89b72']

function bookshelf(w, d, h) {
  const t = 0.025
  const shelves = Math.max(2, Math.round(h / 0.38))
  const bays = Math.max(1, Math.round(w / 0.45))
  const parts = [
    box([-w / 2 + t / 2, h / 2, 0], [t, h, d]),
    box([w / 2 - t / 2, h / 2, 0], [t, h, d]),
    box([0, h / 2, -d / 2 + 0.005], [w - 2 * t, h, 0.01], 'dark'),
  ]
  const innerW = w - 2 * t
  for (let s = 0; s <= shelves; s++) {
    const y = Math.min(h - t / 2, t / 2 + (s * (h - t)) / shelves)
    parts.push(box([0, y, 0], [innerW, t, d]))
  }
  for (let b = 1; b < bays; b++) parts.push(box([-innerW / 2 + (b * innerW) / bays, h / 2, 0], [t * 0.8, h, d]))
  // Livros: alturas e cores determinísticas (sem aleatoriedade entre renders).
  let k = 0
  for (let s = 0; s < shelves; s++) {
    const floorY = t + (s * (h - t)) / shelves
    const space = (h - t) / shelves - t
    for (let b = 0; b < bays; b++) {
      const bayLeft = -innerW / 2 + (b * innerW) / bays + 0.02
      const fill = 0.45 + ((s * 3 + b * 5) % 4) * 0.1
      const bookCount = Math.max(2, Math.floor(((innerW / bays) * fill) / 0.035))
      for (let i = 0; i < bookCount; i++) {
        const bh = Math.min(space - 0.01, space * (0.62 + ((k * 7) % 5) * 0.06))
        parts.push(box([bayLeft + 0.0175 + i * 0.035, floorY + bh / 2, 0.01], [0.03, bh, d * 0.7], 'book', { color: BOOK_COLORS[k % BOOK_COLORS.length] }))
        k++
      }
    }
  }
  return parts
}

function chair(w, d, h) {
  const seatY = Math.min(0.46, h * 0.55)
  const seatT = 0.04
  return [
    ...legs(w, d, seatY - seatT, { inset: 0.02, radius: 0.016 }),
    soft([0, seatY - seatT / 2, 0.01], [w, seatT, d - 0.02], 'main'),
    box([0, (seatY + h) / 2, -d / 2 + 0.02], [w, h - seatY, 0.04]),
  ]
}

function armchair(w, d, h) {
  const legH = 0.09
  const armW = Math.min(0.16, w * 0.18)
  const backD = Math.min(0.2, d * 0.24)
  const baseTop = legH + h * 0.22
  const seatTop = h * 0.5
  const innerW = w - 2 * armW
  return [
    ...legs(w, d, legH, { radius: 0.02 }),
    box([0, (legH + baseTop) / 2, 0], [w, baseTop - legH, d]),
    soft([-(w / 2 - armW / 2), (legH + h * 0.7) / 2, 0], [armW, h * 0.7 - legH, d], 'main'),
    soft([w / 2 - armW / 2, (legH + h * 0.7) / 2, 0], [armW, h * 0.7 - legH, d], 'main'),
    soft([0, (baseTop + h) / 2, -d / 2 + backD / 2], [innerW, h - baseTop, backD], 'main'),
    soft([0, (baseTop + seatTop) / 2, backD / 2], [innerW - 0.02, seatTop - baseTop, d - backD - 0.02]),
  ]
}

function officeChair(w, d, h) {
  const r = Math.min(w, d) / 2
  const seatY = 0.48
  const parts = [cyl([0, 0.22, 0], [0.05, 0.36, 0.05], 'metal'), soft([0, seatY, 0.02], [w * 0.78, 0.07, d * 0.72], 'main')]
  for (let i = 0; i < 5; i++) {
    const a = (i * 2 * Math.PI) / 5
    const len = r * 0.92
    parts.push(box([Math.sin(a) * len * 0.5, 0.04, Math.cos(a) * len * 0.5], [0.035, 0.03, len], 'metal', { rotation: [0, a, 0] }))
    parts.push({ shape: 'sphere', position: [Math.sin(a) * len * 0.95, 0.025, Math.cos(a) * len * 0.95], size: [0.05, 0.05, 0.05], role: 'dark' })
  }
  parts.push(box([0, (seatY + h) / 2 + 0.06, -d / 2 + 0.08], [w * 0.7, h - seatY - 0.12, 0.05], 'main'))
  parts.push(box([0, seatY + 0.1, -d / 2 + 0.11], [0.04, 0.16, 0.03], 'metal'))
  return parts
}

function floorLamp(w, d, h) {
  const shadeH = Math.min(0.32, h * 0.22)
  return [
    cyl([0, 0.015, 0], [w * 0.65, 0.03, d * 0.65], 'metal'),
    cyl([0, (h - shadeH * 0.6) / 2, 0], [0.025, h - shadeH * 0.6, 0.025], 'metal'),
    { shape: 'cone', position: [0, h - shadeH / 2, 0], size: [w, shadeH, d], role: 'shade', taper: 0.72 },
  ]
}

function pendantLamp(w, d, h) {
  const bulbH = Math.min(w * 0.24, h * 0.3)
  return [
    { shape: 'cone', position: [0, h * 0.45, 0], size: [w, h * 0.9, d], role: 'main', taper: 0.14 },
    { shape: 'sphere', position: [0, bulbH / 2, 0], size: [w * 0.3, bulbH, d * 0.3], role: 'shade' },
    cyl([0, h * 0.95, 0], [0.04, h * 0.1, 0.04], 'metal'),
  ]
}

function rug(w, d, h) {
  return [box([0, h / 2, 0], [w, h, d])]
}

function plant(w, d, h) {
  const potH = Math.min(0.42, h * 0.32)
  const parts = [
    { shape: 'cylinder', position: [0, potH / 2, 0], size: [w * 0.62, potH, d * 0.62], role: 'pot', taper: 0.78 },
    cyl([0, potH - 0.01, 0], [w * 0.56, 0.02, d * 0.56], 'dark'),
    cyl([0, potH + (h - potH) * 0.3, 0], [0.025, (h - potH) * 0.6, 0.025], 'wood'),
  ]
  const leaves = [
    [0, 0.72, 0, 0.42],
    [0.6, 0.6, 0.2, 0.34],
    [-0.55, 0.55, -0.3, 0.34],
    [0.2, 0.5, -0.6, 0.3],
    [-0.25, 0.45, 0.6, 0.3],
    [0.05, 0.86, 0.1, 0.28],
  ]
  for (const [fx, fy, fz, size] of leaves) {
    const s = Math.min(w, d) * size * 1.6
    const y = potH + (h - potH) * fy
    parts.push({
      shape: 'sphere',
      position: [fx * (w / 2 - s / 2), Math.min(y, h - s * 0.45), fz * (d / 2 - s / 2)],
      size: [s, s * 0.9, s],
      role: 'leaf',
    })
  }
  return parts
}

const MODELS = {
  sofa,
  'sofa-corner': sofaCorner,
  bed,
  table,
  'coffee-table': coffeeTable,
  'table-round': tableRound,
  desk,
  nightstand,
  sideboard: (w, d, h) => cabinet(w, d, h),
  wardrobe,
  bookshelf,
  chair,
  armchair,
  'office-chair': officeChair,
  'floor-lamp': floorLamp,
  'pendant-lamp': pendantLamp,
  rug,
  plant,
}

export const MODEL_KEYS = Object.keys(MODELS)

/** Peças do modelo `key` para as medidas dadas; tipos desconhecidos são uma caixa. */
export function buildFurnitureParts(key, { width, depth, height }) {
  const build = MODELS[key]
  return build ? build(width, depth, height) : [box([0, height / 2, 0], [width, height, depth])]
}
