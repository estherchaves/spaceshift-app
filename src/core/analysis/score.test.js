import { describe, expect, it } from 'vitest'
import { createFurnitureItem, createRoom, DEFAULT_SETTINGS } from '@/core/model'
import { FURNITURE_CATALOG, getItemPrice, getItemProfile } from '@/data/catalog/furniture.js'
import { analyzeLayout } from './analyzeLayout.js'
import { compareHighlights, MAX_SCORE_WITH_ERRORS, scoreLayout } from './score.js'

const room = createRoom({ width: 5, depth: 4 })
const entry = (id) => FURNITURE_CATALOG.find((e) => e.id === id)
const item = (id, x, z, rotation = 0) => createFurnitureItem(entry(id), { position: { x, z }, rotation })
const options = { getProfile: getItemProfile, getPrice: getItemPrice }
const score = (items) => scoreLayout(room, items, analyzeLayout(room, items, DEFAULT_SETTINGS, options), options)

describe('pontuação de uma disposição', () => {
  it('a divisão vazia tem 100 pontos', () => {
    const result = score([])
    expect(result.score).toBe(100)
    expect(result.metrics.freeRatio).toBe(1)
    expect(result.metrics.circulationRatio).toBe(1)
    expect(result.metrics.cost).toBe(0)
  })

  it('tapetes e candeeiros suspensos não tiram área livre', () => {
    const result = score([item('rug', 2.5, 2), item('pendant-lamp', 2.5, 2)])
    expect(result.metrics.freeArea).toBeCloseTo(20)
    expect(result.metrics.cost).toBe(entry('rug').price + entry('pendant-lamp').price)
  })

  it('a área livre usa a forma real (mesa redonda)', () => {
    const result = score([item('round-table', 2.5, 2)])
    expect(result.metrics.freeArea).toBeCloseTo(20 - (Math.PI * 1.1 * 1.1) / 4, 3)
  })

  it('cada aviso tira pontos e a passagem mais estreita é a menor cota', () => {
    // Sofá a 40 cm da parede de cima: passagem estreita.
    const result = score([item('sofa-3', 2.5, 0.4 + 0.46)])
    expect(result.metrics.warnings).toBeGreaterThan(0)
    expect(result.metrics.narrowest).toBeCloseTo(0.4, 2)
    expect(result.parts.find((p) => p.key === 'issues').points).toBeLessThan(30)
  })

  it('com erros fica abaixo de 50, mesmo com bons valores', () => {
    const result = score([item('sofa-3', 2.5, 2), item('armchair', 2.5, 2)])
    expect(result.metrics.errors).toBeGreaterThan(0)
    expect(result.score).toBeLessThanOrEqual(MAX_SCORE_WITH_ERRORS)
    expect(result.grade.key).toBe('blocked')
  })

  it('a soma das parcelas explica a pontuação', () => {
    const result = score([item('sofa-3', 2.5, 3.54, 180), item('coffee-table', 2.5, 2.6)])
    expect(result.score).toBe(result.parts.reduce((s, p) => s + p.points, 0))
    expect(result.parts.map((p) => p.max)).toEqual([30, 40, 30])
  })
})

describe('destaques da comparação', () => {
  it('assinala o melhor de cada métrica só quando há um vencedor claro', () => {
    const a = { id: 'a', result: score([item('sofa-2', 2.5, 3.56, 180)]) }
    const b = { id: 'b', result: score([item('sofa-corner', 1.35, 3.175, 180), item('armchair', 4.5, 1)]) }
    const highlights = compareHighlights([a, b])
    expect(highlights.get('a')).toEqual(expect.arrayContaining(['space', 'circulation', 'cost']))
    expect(highlights.get('b')).toEqual([])
    // Empate: ninguém é destacado.
    const tie = compareHighlights([a, { ...a, id: 'c' }])
    expect(tie.get('a')).toEqual([])
    // Uma só disposição: nada a comparar.
    expect(compareHighlights([a]).get('a')).toEqual([])
  })
})
