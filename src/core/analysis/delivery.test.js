import { describe, expect, it } from 'vitest'
import { checkDelivery, checkRouteStep, describeCarry, maxTurnLength, rectangleFits } from './delivery.js'

const door = (width, height = 2) => ({ id: 's', type: 'door', width, height })

describe('rectangleFits', () => {
  it('aceita o retângulo direito ou rodado 90°', () => {
    expect(rectangleFits(0.7, 1.8, 0.8, 2)).toBe(0)
    expect(rectangleFits(1.8, 0.7, 0.8, 2)).toBe(90)
  })

  it('encontra a posição inclinada quando direito não cabe', () => {
    // Placa 2,1 × 0,05 num vão 0,8 × 2,0: só cabe na diagonal.
    const angle = rectangleFits(2.1, 0.05, 0.8, 2)
    expect(angle).toBeGreaterThan(0)
    expect(angle).toBeLessThan(90)
  })

  it('recusa o que não cabe de maneira nenhuma', () => {
    expect(rectangleFits(0.9, 0.85, 0.8, 2)).toBeNull()
  })
})

describe('maxTurnLength', () => {
  it('para uma vara (largura zero) dá o mínimo clássico (a^(2/3) + b^(2/3))^(3/2)', () => {
    const expected = (1 ** (2 / 3) + 1 ** (2 / 3)) ** 1.5
    expect(maxTurnLength(1, 1, 0)).toBeCloseTo(expected, 4)
  })

  it('com corredores iguais a, largura w: 2(a√2 − w)', () => {
    // Em θ = 45°: (a·√2/2·2 − w)/(1/2) = 2(a√2 − w).
    expect(maxTurnLength(0.9, 0.9, 0.5)).toBeCloseTo(2 * (0.9 * Math.SQRT2 - 0.5), 4)
  })

  it('é zero quando a largura não passa no corredor', () => {
    expect(maxTurnLength(0.9, 0.8, 0.85)).toBe(0)
  })
})

describe('checkRouteStep', () => {
  it('um sofá 220 × 95 × 85 não passa numa porta de 80, e falta 5 cm', () => {
    const r = checkRouteStep({ width: 2.2, depth: 0.95, height: 0.85 }, door(0.8))
    expect(r.fits).toBe(false)
    expect(r.margin).toBeCloseTo(-0.05, 2)
  })

  it('o mesmo sofá passa numa porta de 90 com 5 cm de folga, deitado de costas ou direito', () => {
    const r = checkRouteStep({ width: 2.2, depth: 0.95, height: 0.85 }, door(0.9))
    expect(r.fits).toBe(true)
    expect(r.margin).toBeCloseTo(0.05, 2)
  })

  it('uma cama desmontada passa a porta ao alto', () => {
    const r = checkRouteStep({ width: 1.9, depth: 0.3, height: 1.6 }, door(0.8))
    expect(r.fits).toBe(true)
    expect(describeCarry(r.how)).not.toBe('')
  })

  it('a curva do corredor limita o comprimento', () => {
    const corridor = { id: 'c', type: 'corridor', width: 0.9, widthAfter: 0.9, height: 2.4, turn: true }
    // Comprimento máximo com 0,6 de largura: 2(0,9√2 − 0,6) ≈ 1,346 m.
    expect(checkRouteStep({ width: 1.3, depth: 0.6, height: 0.6 }, corridor).fits).toBe(true)
    // 2,2 × 0,85 × 0,95: nenhuma orientação faz a curva.
    expect(checkRouteStep({ width: 2.2, depth: 0.95, height: 0.85 }, corridor).fits).toBe(false)
  })

  it('pôr o móvel ao alto ajuda a fazer a curva quando o teto deixa', () => {
    const corridor = { id: 'c', type: 'corridor', width: 0.9, widthAfter: 0.9, height: 2.4, turn: true }
    const r = checkRouteStep({ width: 2.0, depth: 0.6, height: 0.5 }, corridor)
    expect(r.fits).toBe(true)
    expect(r.how.upKey).toBe('width')
  })
})

describe('checkDelivery', () => {
  it('diz qual é o passo mais apertado', () => {
    const steps = [door(1.2), { id: 'e', type: 'stairs', width: 0.85, height: 2, turn: false }, door(0.8)]
    const r = checkDelivery({ width: 1.6, depth: 0.7, height: 0.75 }, steps)
    expect(r.fits).toBe(true)
    expect(r.tightest).toBe(2)
    expect(r.steps[2].margin).toBeCloseTo(0.1, 2)
  })
})
