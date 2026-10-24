/*
 * Regras e limiares da análise. Valores em metros. São orientações de
 * conforto para habitação, não requisitos legais.
 */

/** Revestimentos de chão (tapetes): ficam por baixo dos móveis e não colidem. */
export const FLOOR_COVERING_MAX_HEIGHT = 0.03

/** Abaixo desta altura ao chão um objeto suspenso é um obstáculo para quem passa. */
export const HEAD_CLEARANCE = 1.9

/** Folgas menores do que isto são móveis encostados, não passagens. */
export const MIN_PASSAGE_GAP = 0.1

/** Quanto uma cadeira pode entrar debaixo de uma mesa sem ser colisão. */
export const MAX_TUCK_DEPTH = 0.3

/** Distância a que uma pessoa, de pé na zona de circulação, alcança um móvel. */
export const REACH = 0.2

/**
 * Largura de acesso aos móveis (passagem secundária). Chegar a um sofá ou
 * a um roupeiro não exige a largura de um corredor principal; usa-se esta
 * ou a passagem mínima configurada, se for menor.
 */
export const ACCESS_WIDTH = 0.6

/**
 * Zonas livres menores do que isto não são assinaladas como isoladas (m²):
 * o espaço para as pernas entre o sofá e a mesa de centro não é uma zona
 * a que se precise de chegar.
 */
export const MIN_ISOLATED_AREA = 1

/** Categorias que não precisam de acesso nem de passagem à volta (candeeiros, plantas, televisão). */
export const DECORATIVE_CATEGORIES = new Set(['lighting', 'decor', 'media'])

/** Tamanho da célula da grelha de circulação e número máximo de células. */
export const GRID_CELL = 0.05
export const MAX_GRID_CELLS = 40000

export function isFloorCovering(item) {
  return !item.elevation && item.dimensions.height <= FLOOR_COVERING_MAX_HEIGHT
}

/** Ocupa espaço onde uma pessoa passa. */
export function blocksWalking(item) {
  return !isFloorCovering(item) && (item.elevation ?? 0) < HEAD_CLEARANCE
}

/** Intervalo vertical [base, topo] ocupado pelo móvel. */
export function verticalRange(item) {
  const base = item.elevation ?? 0
  return { min: base, max: base + item.dimensions.height }
}

export function verticalOverlap(a, b, epsilon = 0.001) {
  const ra = verticalRange(a)
  const rb = verticalRange(b)
  return Math.min(ra.max, rb.max) - Math.max(ra.min, rb.min) > epsilon
}

export function isDecorative(item) {
  return DECORATIVE_CATEGORIES.has(item.category)
}

/*
 * Móveis usados em conjunto. Entre eles a folga é intencional (a mesa de
 * centro a 40 cm do sofá, a cadeira junto à mesa), por isso não conta como
 * passagem estreita. Cadeiras podem ainda entrar debaixo da mesa.
 */
const COMPANIONS = [
  ['chair', 'table'],
  ['seat', 'coffee-table'],
  ['bed', 'nightstand'],
]

const pairMatches = (a, b, [x, y]) => (a.role === x && b.role === y) || (a.role === y && b.role === x)

export function isCompanionPair(profileA, profileB) {
  return COMPANIONS.some((pair) => pairMatches(profileA, profileB, pair))
}

/** Cadeira que pode ficar parcialmente debaixo de uma mesa. */
export function isTuckPair(profileA, profileB) {
  return pairMatches(profileA, profileB, ['chair', 'table'])
}
