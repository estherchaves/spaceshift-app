/*
 * Medidas coladas de uma loja. Lê o texto de uma página de produto (ou só
 * as medidas) e devolve comprimento, largura e altura em metros, mais
 * pistas para escolher o modelo do catálogo.
 *
 * Formatos reconhecidos, com ou sem unidades, vírgula ou ponto decimal:
 *   «L 220 x P 95 x A 85 cm»           letras antes de cada medida
 *   «LxPxA: 220x95x85 cm»              ordem dada por um cabeçalho
 *   «220 x 95 x 85 cm»                 sem nomes: comprimento × largura × altura
 *   «Largura: 2,2 m  Profundidade: 95 cm  Altura: 85cm»
 *   «Width 220 cm, Depth 95 cm, Height 85 cm», «W×D×H»
 *   «Diâmetro: 110 cm» / «Ø 110»       peças redondas
 * Nas lojas, «largura» é a medida maior de frente e «profundidade» o
 * fundo; quando aparecem «comprimento» e «largura» juntos (C × L × A), a
 * largura passa a ser o fundo.
 */

const NUMBER = String.raw`(\d+(?:[.,]\d+)?)`
const UNIT = String.raw`(?:(mm|cm|m)(?![a-z]))?`

const WORDS = [
  ['comprimento', /\b(?:comprimento|comp\.?)\s*[:=]?\s*/],
  ['largura', /\b(?:largura|larg\.?)\s*[:=]?\s*/],
  ['profundidade', /\b(?:profundidade|prof\.?|fundo)\s*[:=]?\s*/],
  ['altura', /\b(?:altura|alt\.?)\s*[:=]?\s*/],
  ['diametro', /(?:\bdiametro|\bdiameter|ø|⌀)\s*[:=]?\s*/],
  ['width', /\bwidth\s*[:=]?\s*/],
  ['depth', /\bdepth\s*[:=]?\s*/],
  ['height', /\bheight\s*[:=]?\s*/],
  ['length', /\blength\s*[:=]?\s*/],
]

const LETTERS = { c: 'comprimento', l: 'largura', p: 'profundidade', a: 'altura', w: 'width', d: 'depth', h: 'height' }

/** Texto sem acentos, em minúsculas, com «×» e «*» como «x». */
export function normalizeProductText(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[×✕*]/g, 'x')
    .replace(/ /g, ' ')
}

const toNumber = (s) => Number(s.replace(',', '.'))

/**
 * @returns {{ok: boolean, dimensions: {width?: number, depth?: number, height?: number},
 *   round: boolean, missing: string[], unit: string, text: string}}
 */
export function parseProductDimensions(text) {
  const t = normalizeProductText(text)
  const explicitUnit = t.match(/\d\s*(mm|cm|m)(?![a-z])/)?.[1] ?? null
  const values = {}
  const put = (role, raw, unit) => {
    if (values[role] === undefined) values[role] = { value: toNumber(raw), unit: unit ?? null }
  }

  // 1. Nomes por extenso.
  for (const [role, label] of WORDS) {
    const m = t.match(new RegExp(label.source + NUMBER + String.raw`\s*` + UNIT))
    if (m) put(role, m[1], m[2])
  }
  // 2. Letras soltas antes de um número: «L 220», «A: 85».
  for (const m of t.matchAll(new RegExp(String.raw`(?:^|[^a-z0-9])([clpawdh])\s*[:=.]?\s*` + NUMBER + String.raw`\s*` + UNIT, 'g'))) {
    put(LETTERS[m[1]], m[2], m[3])
  }
  // 3. Cabeçalho com a ordem e uma série de números: «LxPxA: 220x95x85».
  const series = t.match(new RegExp(NUMBER + String.raw`\s*` + UNIT + String.raw`\s*x\s*` + NUMBER + String.raw`\s*` + UNIT + String.raw`(?:\s*x\s*` + NUMBER + String.raw`\s*` + UNIT + ')?'))
  const header = t.match(/(?:^|[^a-z])([clpawdh])\s*x\s*([clpawdh])(?:\s*x\s*([clpawdh]))?(?![a-z])/)
  const named = Object.keys(values).length
  if (series && named < 2) {
    const nums = [
      [series[1], series[2]],
      [series[3], series[4]],
      [series[5], series[6]],
    ].filter(([n]) => n !== undefined)
    const trailing = nums.findLast(([, u]) => u)?.[1] ?? null
    const order = header ? [header[1], header[2], header[3]].filter(Boolean).map((l) => LETTERS[l]) : ['__width', '__depth', '__height']
    nums.forEach(([n, u], i) => order[i] && put(order[i], n, u ?? trailing))
  }

  // Papéis → medidas do SpaceShift.
  const v = (role) => values[role]
  const round = Boolean(v('diametro'))
  const width = v('diametro') ?? (v('comprimento') && v('largura') ? v('comprimento') : v('largura') ?? v('comprimento')) ?? v('width') ?? v('length') ?? v('__width')
  const depth = v('diametro') ?? v('profundidade') ?? (v('comprimento') && v('largura') ? v('largura') : null) ?? v('depth') ?? v('__depth')
  const height = v('altura') ?? v('height') ?? v('__height')

  const raw = [width, depth, height].filter(Boolean)
  const unit = explicitUnit ?? guessUnit(raw.map((r) => r.value))
  const metres = (r) => (r ? roundMm(r.value * FACTOR[r.unit ?? unit]) : undefined)
  const dimensions = {}
  if (width) dimensions.width = metres(width)
  if (depth) dimensions.depth = metres(depth)
  if (height) dimensions.height = metres(height)
  const missing = ['width', 'depth', 'height'].filter((k) => dimensions[k] === undefined)
  return { ok: dimensions.width !== undefined && dimensions.depth !== undefined, dimensions, round, missing, unit, text: t }
}

const FACTOR = { mm: 0.001, cm: 0.01, m: 1 }
const roundMm = (x) => Math.round(x * 1000) / 1000

/** Sem unidade escrita: metros se forem números pequenos com casas decimais, milímetros se forem enormes, senão centímetros. */
function guessUnit(numbers) {
  if (numbers.length === 0) return 'cm'
  const max = Math.max(...numbers)
  if (max <= 5 && numbers.some((n) => !Number.isInteger(n))) return 'm'
  if (max > 500) return 'mm'
  return 'cm'
}

/**
 * Tipo de móvel pelas palavras do texto, do mais específico para o mais
 * geral. Devolve o id do modelo do catálogo, ou null.
 */
const KEYWORDS = [
  ['nightstand', /mesa de cabeceira|cabeceira|nightstand|bedside/],
  ['coffee-table', /mesa de centro|mesa de apoio|coffee table|side table/],
  ['office-chair', /cadeira de escritorio|cadeira giratoria|office chair|desk chair/],
  ['desk', /secretaria|escrivaninha|\bdesk\b/],
  ['sofa-corner', /sofa de canto|chaise|sofa em l|corner sofa|sectional/],
  ['sofa-2', /sofa.{0,20}2 lugares|2 lugares|2-seat|2 seat|loveseat/],
  ['sofa-3', /sofa|couch|settee/],
  ['armchair', /poltrona|cadeirao|armchair/],
  ['bed-king', /\bking\b/],
  ['bed-single', /cama de solteiro|solteiro|single bed/],
  ['bed-double', /cama|\bbed\b/],
  ['round-table', /mesa redonda|round table/],
  ['dining-table', /mesa|table/],
  ['dining-chair', /cadeira|banco|chair|stool/],
  ['wardrobe', /roupeiro|guarda-roupa|guarda roupa|armario|wardrobe/],
  ['bookshelf', /estante|prateleira|bookcase|bookshelf|shelving/],
  ['tv-unit', /movel de tv|movel tv|aparador|tv bench|tv unit|sideboard/],
  ['dresser', /comoda|dresser|chest of drawers/],
  ['floor-lamp', /candeeiro de pe|floor lamp/],
  ['pendant-lamp', /candeeiro suspenso|candeeiro de teto|pendant/],
  ['rug', /tapete|carpete|\brug\b/],
  ['plant', /planta|vaso|\bplant\b/],
]

export function guessCatalogId(text, { round = false } = {}) {
  const t = normalizeProductText(text)
  for (const [id, pattern] of KEYWORDS) {
    if (!pattern.test(t)) continue
    if (round && id === 'dining-table') return 'round-table'
    return id
  }
  return null
}

/** Nome do produto: a primeira linha com palavras que não é só medidas. */
export function guessProductName(text, maxLength = 60) {
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const clean = line.replace(/\s+/g, ' ').trim()
    if (!clean) continue
    const letters = (clean.match(/\p{L}/gu) ?? []).length
    const digits = (clean.match(/\d/g) ?? []).length
    if (letters >= 3 && letters > digits && !/^(largura|profundidade|altura|comprimento|medidas|dimens|width|depth|height)/i.test(clean)) {
      return clean.slice(0, maxLength)
    }
  }
  return null
}
