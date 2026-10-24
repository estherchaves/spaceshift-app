import { clipByHalfPlane, getItemShape, intersectConvex, polygonsDistance, polygonsOverlap, shapeBounds } from '../geometry/index.js'
import { pointInPolygon } from '../geometry/polygon.js'
import { formatCentimetres, formatLength } from '../units/units.js'
import { getAccessibilityProfile } from '../model/accessibility.js'
import { buildCirculationGrid, zoneReaches, zoneRuns } from './circulation.js'
import { analyzeOpenings } from './openingRules.js'
import { SINGLE_BED_MAX_WIDTH, USAGE_RULES, measureUsage } from './usage.js'
import {
  ACCESS_WIDTH,
  MAX_TUCK_DEPTH,
  MIN_ISOLATED_AREA,
  MIN_PASSAGE_GAP,
  REACH,
  blocksWalking,
  isDecorative,
  isCompanionPair,
  isFloorCovering,
  isTuckPair,
  verticalOverlap,
} from './rules.js'

/*
 * Análise de uma disposição. Função pura: recebe a divisão, os móveis e
 * as definições e devolve problemas com mensagem, móveis envolvidos e um
 * marcador geométrico (em metros) que as vistas desenham.
 *
 * Erros (geometria impossível): fora da divisão, sobreposição, acima do teto.
 * Avisos (conforto): passagem estreita, zona de uso ocupada, móvel sem
 * acesso, zona isolada.
 *
 * Duas larguras: a passagem mínima configurada (corredores, 90 cm por
 * omissão) mede as passagens e a zona de circulação; o acesso a cada
 * móvel e as zonas isoladas usam a largura de acesso (60 cm, ou a
 * passagem mínima se for menor), como uma passagem secundária.
 */

const EPSILON = 0.001
const MIN_VISIBLE_ZONE = 0.1
const PERPENDICULAR = { left: ['top', 'bottom'], right: ['top', 'bottom'], top: ['left', 'right'], bottom: ['left', 'right'] }

/** @typedef {{shape?: 'rect'|'ellipse'|'corner', role?: string|null, usage?: string|null}} ItemProfile */

/** As quatro paredes interiores: distância de um ponto a cada uma e projeção nela. */
function wallsFor(room) {
  return [
    { side: 'left', label: 'esquerda', distance: (p) => p.x, project: (p) => ({ x: 0, z: p.z }) },
    { side: 'right', label: 'direita', distance: (p) => room.width - p.x, project: (p) => ({ x: room.width, z: p.z }) },
    { side: 'top', label: 'superior', distance: (p) => p.z, project: (p) => ({ x: p.x, z: 0 }) },
    { side: 'bottom', label: 'inferior', distance: (p) => room.depth - p.z, project: (p) => ({ x: p.x, z: room.depth }) },
  ].map((wall) => ({ ...wall, outside: (p) => -wall.distance(p) }))
}

/**
 * @param {import('../model/types.js').Room} room
 * @param {import('../model/types.js').FurnitureItem[]} items
 * @param {{circulationMin: number, accessibility?: string}} settings
 * @param {{getProfile?: (item) => ItemProfile}} [options]
 */
export function analyzeLayout(room, items, settings, { getProfile = () => ({}) } = {}) {
  // Um perfil de acessibilidade aumenta as larguras: a cadeira de rodas
  // precisa da passagem toda também para chegar a cada móvel.
  const accessibility = getAccessibilityProfile(settings)
  const passage = Math.max(settings.circulationMin, accessibility.passage ?? 0)
  const access = accessibility.passage ? passage : Math.min(ACCESS_WIDTH, passage)
  const walls = wallsFor(room)
  const labels = itemLabels(items)
  const entries = items.map((item) => {
    const profile = { shape: 'rect', role: null, usage: null, ...getProfile(item) }
    const shape = getItemShape(item, profile.shape)
    // Nome para as mensagens: com número quando há vários iguais ("Cadeira de jantar 2").
    return { item: { ...item, name: labels.get(item.id) }, profile, shape, bounds: shapeBounds(shape) }
  })
  // Paredes a que cada móvel está encostado (para reconhecer recantos sem saída).
  for (const entry of entries) {
    const points = entry.shape.flat()
    entry.touches = new Set(walls.filter((wall) => Math.min(...points.map(wall.distance)) < MIN_PASSAGE_GAP).map((wall) => wall.side))
  }
  const issues = []

  // 1. Fora da divisão, com a parte exata que sai.
  for (const { item, shape } of entries) {
    const overflow = {}
    const regions = []
    for (const wall of walls) {
      const amount = Math.max(0, ...shape.flat().map(wall.outside))
      if (amount > EPSILON) {
        overflow[wall.side] = amount
        for (const polygon of shape) {
          const part = clipByHalfPlane(polygon, wall.outside)
          if (part.length >= 3) regions.push(part)
        }
      }
    }
    const sides = Object.keys(overflow)
    if (sides.length === 0) continue
    const box = shapeBounds(shape)
    const tooWide = box.width > room.width + EPSILON
    const tooDeep = box.depth > room.depth + EPSILON
    const fitsRotated =
      (tooWide || tooDeep) && box.depth <= room.width + EPSILON && box.width <= room.depth + EPSILON
    const worst = walls.filter((wall) => overflow[wall.side]).sort((a, b) => overflow[b.side] - overflow[a.side])
    let message
    let hint
    if (tooWide || tooDeep) {
      const axis = tooWide ? { need: box.width, have: room.width } : { need: box.depth, have: room.depth }
      message = `${item.name} não cabe na divisão nesta posição: ocupa ${formatLength(axis.need)} e a divisão tem ${formatLength(axis.have)}.`
      hint = fitsRotated ? 'Rode-o 90° para caber.' : 'Escolha um tamanho menor ou aumente a divisão.'
    } else {
      const list = worst.map((wall) => `${formatCentimetres(overflow[wall.side])} na parede ${wall.label}`)
      message = `${item.name} ultrapassa ${list.join(' e ')}.`
      hint = 'Arraste-o para dentro ou use «Trazer para dentro».'
    }
    issues.push({
      id: `outside:${item.id}`,
      severity: 'error',
      type: 'outside',
      title: tooWide || tooDeep ? 'Não cabe na divisão' : 'Fora da divisão',
      message,
      hint,
      itemIds: [item.id],
      marker: { kind: 'region', polygons: regions },
      fix: tooWide || tooDeep ? null : { type: 'bring-inside', itemId: item.id, delta: insideDelta(overflow) },
    })
  }

  // 2. Sobreposições (forma real + altura) e acima do teto.
  for (const entry of entries) entry.overlaps = new Set()
  for (let a = 0; a < entries.length; a++) {
    for (let b = a + 1; b < entries.length; b++) {
      const A = entries[a]
      const B = entries[b]
      if (!boxesWithin(A.bounds, B.bounds, 0)) continue
      if (isFloorCovering(A.item) || isFloorCovering(B.item)) continue
      if (!verticalOverlap(A.item, B.item)) continue
      let depth = 0
      const regions = []
      for (const pa of A.shape) {
        for (const pb of B.shape) {
          const hit = polygonsOverlap(pa, pb)
          if (!hit.overlapping) continue
          depth = Math.max(depth, hit.depth)
          const region = intersectConvex(pa, pb)
          if (region.length) regions.push(region)
        }
      }
      if (depth === 0) continue
      if (isTuckPair(A.profile, B.profile) && depth <= MAX_TUCK_DEPTH) continue
      A.overlaps.add(B)
      B.overlaps.add(A)
      issues.push({
        id: `overlap:${A.item.id}:${B.item.id}`,
        severity: 'error',
        type: 'overlap',
        title: 'Sobreposição',
        message: `${A.item.name} e ${B.item.name} sobrepõem-se ${formatCentimetres(depth)}.`,
        hint: `Afaste um dos móveis pelo menos ${formatCentimetres(depth)}.`,
        itemIds: [A.item.id, B.item.id],
        marker: { kind: 'region', polygons: regions },
      })
    }
  }

  for (const { item, shape } of entries) {
    const top = (item.elevation ?? 0) + item.dimensions.height
    if (top <= room.wallHeight + EPSILON) continue
    issues.push({
      id: `ceiling:${item.id}`,
      severity: 'error',
      type: 'ceiling',
      title: 'Mais alto do que o teto',
      message: `${item.name} chega a ${formatLength(top)} e o pé-direito é ${formatLength(room.wallHeight)}.`,
      hint: 'Reduza a altura ou a altura ao chão.',
      itemIds: [item.id],
      marker: { kind: 'region', polygons: shape },
    })
  }

  // 3. Passagens estreitas entre móveis e entre móveis e paredes.
  const walkers = entries.filter((entry) => blocksWalking(entry.item))
  const blockedBy = (point, ignore) =>
    walkers.some((other) => !ignore.includes(other) && other.shape.some((polygon) => pointInPolygon(point, polygon)))
  const gapIsFree = (from, to, ignore) =>
    [0.25, 0.5, 0.75].every((t) => !blockedBy({ x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t }, ignore))
  const narrow = (distance) => distance >= MIN_PASSAGE_GAP && distance < passage - EPSILON
  const passageIssue = (id, itemIds, label, gap) => ({
    id,
    severity: 'warning',
    type: 'passage',
    title: 'Passagem estreita',
    message: `Passagem de ${formatCentimetres(gap.distance)} entre ${label}. O mínimo sugerido é ${formatCentimetres(passage)}.`,
    hint: 'Afaste os móveis ou, se não for para passar, encoste-os.',
    itemIds,
    marker: { kind: 'gap', from: gap.from, to: gap.to, distance: gap.distance },
  })

  const relevant = walkers.filter((entry) => !isDecorative(entry.item))
  for (let a = 0; a < relevant.length; a++) {
    for (let b = a + 1; b < relevant.length; b++) {
      const A = relevant[a]
      const B = relevant[b]
      if (isCompanionPair(A.profile, B.profile) || !boxesWithin(A.bounds, B.bounds, passage)) continue
      // Dois móveis encostados à mesma parede: a folga entre eles é um nicho, não uma passagem.
      if ([...A.touches].some((side) => B.touches.has(side))) continue
      // Móveis sobrepostos já são um erro; aqui só interessam os separados.
      if (A.shape.some((pa) => B.shape.some((pb) => polygonsOverlap(pa, pb).overlapping))) continue
      let gap = null
      for (const pa of A.shape) {
        for (const pb of B.shape) {
          const d = polygonsDistance(pa, pb)
          if (!gap || d.distance < gap.distance) gap = d
        }
      }
      if (!gap || !narrow(gap.distance) || !gapIsFree(gap.from, gap.to, [A, B])) continue
      issues.push(passageIssue(`passage:${A.item.id}:${B.item.id}`, [A.item.id, B.item.id], `${A.item.name} e ${B.item.name}`, gap))
    }
  }

  for (const entry of relevant) {
    const points = entry.shape.flat()
    for (const wall of walls) {
      const distance = Math.min(...points.map(wall.distance))
      if (!narrow(distance)) continue
      // Móvel encostado a uma parede perpendicular: a folga é um recanto sem saída.
      if (PERPENDICULAR[wall.side].some((side) => entry.touches.has(side))) continue
      // Centro do troço mais próximo da parede (aresta paralela → meio da aresta).
      const near = points.filter((p) => wall.distance(p) <= distance + EPSILON)
      const from = { x: near.reduce((s, p) => s + p.x, 0) / near.length, z: near.reduce((s, p) => s + p.z, 0) / near.length }
      const to = wall.project(from)
      if (!gapIsFree(from, to, [entry])) continue
      issues.push(
        passageIssue(`passage:${entry.item.id}:${wall.side}`, [entry.item.id], `${entry.item.name} e a parede ${wall.label}`, { from, to, distance }),
      )
    }
  }

  // 4. Zonas de uso: frente do roupeiro, lados da cama, frente do sofá…
  for (const entry of walkers) {
    const usage = entry.profile.usage
    if (!USAGE_RULES[usage]) continue
    const obstacles = walkers
      // Um móvel sobreposto já é um erro: não se repete como zona de uso ocupada.
      .filter((other) => other !== entry && !entry.overlaps.has(other) && !isCompanionPair(entry.profile, other.profile))
      .map((other) => ({ name: other.item.name, shape: other.shape }))
    const zones = measureUsage(entry.item, usage, entry.profile.shape, obstacles, room)
    const blocked = zones.filter((zone) => zone.free < zone.required - EPSILON)
    if (blocked.length === 0) continue
    const rule = USAGE_RULES[usage]
    const name = entry.item.name
    // Numa cama estreita basta um dos lados livre.
    if (usage === 'bed' && entry.item.dimensions.width <= SINGLE_BED_MAX_WIDTH) {
      if (blocked.length < zones.length) continue
      const best = Math.max(...zones.map((zone) => zone.free))
      issues.push(usageIssue(entry, 'sides', zones.map((zone) => zone.polygon), {
        message: `${name} precisa de ${formatCentimetres(rule.depth)} livres de pelo menos um dos lados ${rule.purpose}; o melhor lado tem ${formatCentimetres(best)}.`,
      }))
      continue
    }
    for (const zone of blocked) {
      const where = zone.side === 'front' ? 'à frente' : 'de cada lado'
      issues.push(usageIssue(entry, `${zone.side}:${zones.indexOf(zone)}`, [zone.polygon], {
        message: `${name} precisa de ${formatCentimetres(rule.depth)} livres ${where} ${rule.purpose}; tem ${formatCentimetres(zone.free)} (${zone.blocker}).`,
      }))
    }
  }

  // 5. Circulação: zona de circulação, acesso a cada móvel e zonas isoladas.
  const obstacles = walkers.map((entry) => entry.shape)
  const corridors = buildCirculationGrid(room, obstacles, passage)
  const grid = access === passage ? corridors : buildCirculationGrid(room, obstacles, access)
  const main = grid.zones[0] ?? null
  if (!main && walkers.length > 0) {
    issues.push({
      id: 'circulation:none',
      severity: 'warning',
      type: 'no-circulation',
      title: 'Sem espaço para circular',
      message: `Não sobra nenhuma zona livre com ${formatCentimetres(access)} de largura.`,
      hint: 'Retire ou reduza móveis.',
      itemIds: [],
      marker: null,
    })
  }
  if (main) {
    const reach = grid.radius + grid.cell + REACH
    for (const entry of walkers) {
      // Cadeiras puxam-se da mesa: não precisam de acesso próprio.
      if (isDecorative(entry.item) || entry.profile.role === 'chair') continue
      if (zoneReaches(grid, 0, entry.shape, reach)) continue
      issues.push({
        id: `access:${entry.item.id}`,
        severity: 'warning',
        type: 'access',
        title: 'Sem acesso',
        message: `Não há uma passagem de ${formatCentimetres(access)} até ${entry.item.name}.`,
        hint: 'Abra espaço à volta do móvel ou mude-o de sítio.',
        itemIds: [entry.item.id],
        marker: { kind: 'region', polygons: entry.shape },
      })
    }
    for (const zone of grid.zones.slice(1)) {
      if (zone.area < MIN_ISOLATED_AREA) continue
      const centre = {
        x: grid.offsetX + ((zone.minI + zone.maxI + 1) / 2) * grid.cell,
        z: grid.offsetZ + ((zone.minJ + zone.maxJ + 1) / 2) * grid.cell,
      }
      issues.push({
        id: `zone:${Math.round(centre.x * 100)}:${Math.round(centre.z * 100)}`,
        severity: 'warning',
        type: 'isolated',
        title: 'Zona isolada',
        message: `Há ${formatArea2(zone.area)} livres ${describeLocation(centre, room)} sem uma passagem de ${formatCentimetres(access)} até ao resto da divisão.`,
        hint: 'Alargue a passagem entre os móveis que fecham esta zona.',
        itemIds: [],
        marker: { kind: 'zone', runs: zoneRuns(grid, zone.id), centre },
      })
    }
  }

  // 6. Portas, janelas e acessibilidade.
  const openingResult = analyzeOpenings(room, walkers, { grid, access, profile: accessibility })
  issues.push(...openingResult.issues)

  const errors = issues.filter((issue) => issue.severity === 'error')
  const warnings = issues.filter((issue) => issue.severity === 'warning')
  // Estado de cada móvel nas vistas: erro em qualquer problema geométrico;
  // aviso só quando o problema é o próprio móvel (sem acesso, zona de uso). As passagens
  // estreitas são de dois móveis e mostram-se com a cota, não a contornar.
  const itemStatus = new Map()
  for (const issue of warnings) {
    if (issue.type === 'access' || issue.type === 'usage' || issue.type === 'window') for (const id of issue.itemIds) itemStatus.set(id, 'warning')
  }
  for (const issue of errors) for (const id of issue.itemIds) itemStatus.set(id, 'error')

  return {
    issues: [...errors, ...warnings],
    errors,
    warnings,
    itemStatus,
    // Zona de circulação para mostrar na planta, sem pontos soltos de poucas células.
    circulation: {
      runs: corridors.zones.filter((zone) => zone.area >= MIN_VISIBLE_ZONE).flatMap((zone) => zoneRuns(corridors, zone.id)),
      area: corridors.zones.reduce((sum, zone) => sum + zone.area, 0),
      passage,
      access,
    },
    // Círculo livre para rodar (modo de acessibilidade), para desenhar.
    turning: openingResult.turning,
    // Formas que impedem a passagem (para o percurso a pé).
    obstacles,
  }
}

function usageIssue(entry, key, polygons, { message }) {
  return {
    id: `usage:${entry.item.id}:${key}`,
    severity: 'warning',
    type: 'usage',
    title: 'Espaço de uso',
    message,
    hint: 'Afaste o que está nessa zona ou rode o móvel.',
    itemIds: [entry.item.id],
    marker: { kind: 'region', polygons },
  }
}

/** Nomes únicos para as mensagens: numera móveis com o mesmo nome. */
function itemLabels(items) {
  const totals = new Map()
  for (const item of items) totals.set(item.name, (totals.get(item.name) ?? 0) + 1)
  const seen = new Map()
  const labels = new Map()
  for (const item of items) {
    if (totals.get(item.name) === 1) {
      labels.set(item.id, item.name)
      continue
    }
    const n = (seen.get(item.name) ?? 0) + 1
    seen.set(item.name, n)
    labels.set(item.id, `${item.name} ${n}`)
  }
  return labels
}

/** As caixas estão a menos de `gap` uma da outra? (filtro rápido antes da geometria exata) */
function boxesWithin(a, b, gap) {
  return a.minX - gap <= b.maxX && b.minX - gap <= a.maxX && a.minZ - gap <= b.maxZ && b.minZ - gap <= a.maxZ
}

/** Deslocação que traz um móvel para dentro (só quando cabe). */
function insideDelta(overflow) {
  return { x: (overflow.left ?? 0) - (overflow.right ?? 0), z: (overflow.top ?? 0) - (overflow.bottom ?? 0) }
}

const areaFormatter = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 1, minimumFractionDigits: 1 })
const formatArea2 = (m2) => `${areaFormatter.format(m2)} m²`

/** "junto ao canto superior esquerdo", "no centro", "junto à parede direita"… */
export function describeLocation(point, room) {
  const col = point.x < room.width / 3 ? 'esquerdo' : point.x > (room.width * 2) / 3 ? 'direito' : null
  const row = point.z < room.depth / 3 ? 'superior' : point.z > (room.depth * 2) / 3 ? 'inferior' : null
  if (col && row) return `junto ao canto ${row} ${col}`
  if (row) return `junto à parede ${row}`
  if (col) return `junto à parede ${col === 'esquerdo' ? 'esquerda' : 'direita'}`
  return 'no centro da divisão'
}
