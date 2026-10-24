import { shapeArea } from '../geometry/index.js'
import { buildCirculationGrid } from './circulation.js'
import { blocksWalking } from './rules.js'

/*
 * Pontuação de uma disposição (0–100), para comparar soluções para a
 * mesma divisão. É uma orientação, não uma avaliação profissional, e é
 * transparente: cada parcela mostra quanto valeu e porquê.
 *
 *  - Espaço livre (30): chão que sobra depois dos móveis que ocupam o
 *    chão onde se anda (tapetes e candeeiros suspensos não contam).
 *  - Circulação (40): área onde se circula com a passagem mínima
 *    configurada, comparada com a mesma divisão vazia.
 *  - Problemas (30): cada aviso tira 6 pontos e cada erro 15. Com erros a
 *    disposição não é viável tal como está, por isso fica abaixo de 50.
 *
 * O custo total não entra na pontuação: o mesmo espaço pode ser bom com
 * móveis caros ou baratos. Aparece ao lado, para pesar as duas coisas.
 */

export const SCORE_WEIGHTS = { space: 30, circulation: 40, issues: 30 }
/** Abaixo disto o espaço livre vale 0; a partir de FREE_FULL vale tudo. */
export const FREE_NONE = 0.3
export const FREE_FULL = 0.65
/** Fração da circulação da divisão vazia que já vale a pontuação toda. */
export const CIRCULATION_FULL = 0.6
export const WARNING_PENALTY = 6
export const ERROR_PENALTY = 15
export const MAX_SCORE_WITH_ERRORS = 49

export const SCORE_GRADES = [
  { min: 80, key: 'great', label: 'Muito boa' },
  { min: 65, key: 'good', label: 'Boa' },
  { min: 50, key: 'fair', label: 'Razoável' },
  { min: 0, key: 'poor', label: 'Fraca' },
]

const clamp01 = (v) => Math.min(1, Math.max(0, v))

const baselineCache = new Map()
/** Área de circulação da divisão vazia (mesma grelha que a análise). */
export function emptyRoomCirculation(room, passage) {
  const key = `${room.width}:${room.depth}:${passage}`
  if (!baselineCache.has(key)) {
    if (baselineCache.size > 50) baselineCache.clear()
    const grid = buildCirculationGrid(room, [], passage)
    baselineCache.set(key, grid.zones.reduce((sum, zone) => sum + zone.area, 0))
  }
  return baselineCache.get(key)
}

export function gradeFor(score, hasErrors = false) {
  if (hasErrors) return { key: 'blocked', label: 'Com erros' }
  return SCORE_GRADES.find((grade) => score >= grade.min)
}

/**
 * Chão ocupado pelos móveis que impedem a passagem (tapetes e objetos
 * elevados não contam). É a mesma medida na barra inferior e na comparação.
 */
export function blockedFloorArea(items, getProfile = () => ({})) {
  return items
    .filter(blocksWalking)
    .reduce((sum, item) => sum + shapeArea(item.dimensions, getProfile(item).shape ?? 'rect'), 0)
}

/**
 * @param {object} room
 * @param {object[]} items
 * @param {ReturnType<import('./analyzeLayout.js').analyzeLayout>} analysis  análise desta disposição
 * @param {{getProfile?: (item) => {shape?: string}, getPrice?: (item) => number|null}} [options]
 */
export function scoreLayout(room, items, analysis, { getProfile = () => ({}), getPrice = () => null } = {}) {
  const roomArea = room.width * room.depth
  const occupied = blockedFloorArea(items, getProfile)
  const freeArea = Math.max(0, roomArea - occupied)
  const freeRatio = roomArea > 0 ? freeArea / roomArea : 0

  const baseline = emptyRoomCirculation(room, analysis.circulation.passage)
  const circulationArea = analysis.circulation.area
  const circulationRatio = baseline > 0 ? clamp01(circulationArea / baseline) : 0

  const errors = analysis.errors.length
  const warnings = analysis.warnings.length
  const passages = analysis.warnings.filter((issue) => issue.type === 'passage').map((issue) => issue.marker.distance)
  const narrowest = passages.length ? Math.min(...passages) : null

  let cost = 0
  let unpriced = 0
  for (const item of items) {
    const price = getPrice(item)
    if (Number.isFinite(price)) cost += price
    else unpriced += 1
  }

  const parts = [
    {
      key: 'space',
      label: 'Espaço livre',
      max: SCORE_WEIGHTS.space,
      points: SCORE_WEIGHTS.space * clamp01((freeRatio - FREE_NONE) / (FREE_FULL - FREE_NONE)),
    },
    {
      key: 'circulation',
      label: 'Circulação',
      max: SCORE_WEIGHTS.circulation,
      points: SCORE_WEIGHTS.circulation * clamp01(circulationRatio / CIRCULATION_FULL),
    },
    {
      key: 'issues',
      label: 'Problemas',
      max: SCORE_WEIGHTS.issues,
      points: Math.max(0, SCORE_WEIGHTS.issues - warnings * WARNING_PENALTY - errors * ERROR_PENALTY),
    },
  ].map((part) => ({ ...part, points: Math.round(part.points) }))

  const total = parts.reduce((sum, part) => sum + part.points, 0)
  const score = errors > 0 ? Math.min(total, MAX_SCORE_WITH_ERRORS) : total

  return {
    score,
    grade: gradeFor(score, errors > 0),
    parts,
    metrics: {
      roomArea,
      freeArea,
      freeRatio,
      circulationArea,
      circulationRatio,
      narrowest,
      passage: analysis.circulation.passage,
      errors,
      warnings,
      cost,
      unpriced,
      itemCount: items.length,
    },
  }
}

/**
 * Destaques entre várias disposições: melhor pontuação, mais espaço
 * livre, melhor circulação e mais barata. Só há destaque quando há pelo
 * menos duas disposições e um valor é estritamente o melhor.
 * @param {{id: string, result: ReturnType<typeof scoreLayout>}[]} entries
 * @returns {Map<string, string[]>} id → chaves de destaque
 */
export function compareHighlights(entries) {
  const highlights = new Map(entries.map((entry) => [entry.id, []]))
  if (entries.length < 2) return highlights
  const pick = (key, value, better) => {
    const values = entries.map((entry) => ({ id: entry.id, value: value(entry.result) })).filter((e) => e.value !== null)
    if (values.length < 2) return
    const best = values.reduce((a, b) => (better(b.value, a.value) ? b : a))
    if (values.filter((e) => e.value === best.value).length > 1) return
    highlights.get(best.id).push(key)
  }
  const higher = (a, b) => a > b
  pick('score', (r) => r.score, higher)
  pick('space', (r) => Math.round(r.metrics.freeArea * 10), higher)
  pick('circulation', (r) => Math.round(r.metrics.circulationRatio * 100), higher)
  pick('cost', (r) => (r.metrics.itemCount > 0 && r.metrics.unpriced < r.metrics.itemCount ? Math.round(r.metrics.cost) : null), (a, b) => a < b)
  return highlights
}
