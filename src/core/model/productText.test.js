import { describe, expect, it } from 'vitest'
import { guessCatalogId, guessProductName, parseProductDimensions } from './productText.js'

const dims = (text) => parseProductDimensions(text).dimensions

describe('parseProductDimensions', () => {
  it.each([
    ['L 220 x P 95 x A 85 cm', { width: 2.2, depth: 0.95, height: 0.85 }],
    ['220x95x85 cm', { width: 2.2, depth: 0.95, height: 0.85 }],
    ['220 × 95 × 85', { width: 2.2, depth: 0.95, height: 0.85 }],
    ['Largura: 2,2 m  Profundidade: 95 cm  Altura: 85cm', { width: 2.2, depth: 0.95, height: 0.85 }],
    ['Width: 220 cm\nDepth: 95 cm\nHeight: 85 cm', { width: 2.2, depth: 0.95, height: 0.85 }],
    ['W 2200 x D 950 x H 850 mm', { width: 2.2, depth: 0.95, height: 0.85 }],
    ['AxLxP: 85 x 220 x 95 cm', { width: 2.2, depth: 0.95, height: 0.85 }],
    ['C x L x A: 285 x 198 x 83 cm', { width: 2.85, depth: 1.98, height: 0.83 }],
    ['Comprimento 200 cm, Largura 90 cm, Altura 75 cm', { width: 2, depth: 0.9, height: 0.75 }],
    ['2,20 x 0,95 x 0,85', { width: 2.2, depth: 0.95, height: 0.85 }],
  ])('%s', (text, expected) => {
    expect(dims(text)).toEqual(expected)
  })

  it('peças redondas: o diâmetro dá o comprimento e a largura', () => {
    const r = parseProductDimensions('Mesa redonda Ø 110 cm, altura 75 cm')
    expect(r.round).toBe(true)
    expect(r.dimensions).toEqual({ width: 1.1, depth: 1.1, height: 0.75 })
  })

  it('só duas medidas: falta a altura, mas chega para criar o móvel', () => {
    const r = parseProductDimensions('Cama 160 x 200 cm')
    expect(r.ok).toBe(true)
    expect(r.missing).toEqual(['height'])
  })

  it('texto sem medidas não serve', () => {
    expect(parseProductDimensions('Sofá muito confortável').ok).toBe(false)
  })

  it('ignora números que fazem parte do nome', () => {
    const text = 'Sofá KIVIK 3 lugares\nLargura: 228 cm\nProfundidade: 95 cm\nAltura: 83 cm'
    expect(dims(text)).toEqual({ width: 2.28, depth: 0.95, height: 0.83 })
  })
})

describe('guessCatalogId e guessProductName', () => {
  it.each([
    ['Sofá KIVIK 3 lugares', 'sofa-3'],
    ['Sofá de canto com chaise longue', 'sofa-corner'],
    ['Mesa de centro em carvalho', 'coffee-table'],
    ['Mesa de cabeceira MALM', 'nightstand'],
    ['Cama de casal 160x200', 'bed-double'],
    ['Roupeiro PAX', 'wardrobe'],
    ['Cómoda com 6 gavetas', 'dresser'],
    ['Coisa sem nome', null],
  ])('%s → %s', (text, id) => {
    expect(guessCatalogId(text)).toBe(id)
  })

  it('mesa com diâmetro é a mesa redonda', () => {
    expect(guessCatalogId('Mesa de jantar', { round: true })).toBe('round-table')
  })

  it('o nome é a primeira linha com palavras', () => {
    expect(guessProductName('\nSofá KIVIK 3 lugares\nLargura: 228 cm')).toBe('Sofá KIVIK 3 lugares')
    expect(guessProductName('220 x 95 x 85 cm')).toBeNull()
    expect(guessProductName('Largura: 228 cm')).toBeNull()
    expect(guessProductName('Mesa redonda NORDEN Ø 120 cm, altura 74 cm')).toBe('Mesa redonda NORDEN')
    expect(guessProductName('Cama de casal 160x200')).toBe('Cama de casal')
    expect(guessProductName('Sofá 3 lugares - L 220 x P 95 x A 85 cm')).toBe('Sofá 3 lugares')
  })
})
