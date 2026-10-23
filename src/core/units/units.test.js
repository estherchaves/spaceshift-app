import { describe, expect, it } from 'vitest'
import { clamp, cmToM, formatArea, formatCentimetres, formatLength, mToCm, roundToMm } from './units.js'

describe('units', () => {
  it('arredonda ao milímetro e elimina erros de vírgula flutuante', () => {
    expect(roundToMm(0.1 + 0.2)).toBe(0.3)
    expect(roundToMm(1.23456)).toBe(1.235)
  })

  it('converte centímetros e metros nos dois sentidos', () => {
    expect(cmToM(180)).toBe(1.8)
    expect(mToCm(1.8)).toBe(180)
    expect(mToCm(cmToM(73.5))).toBe(73.5)
  })

  it('limita valores a um intervalo', () => {
    expect(clamp(5, 0, 3)).toBe(3)
    expect(clamp(-1, 0, 3)).toBe(0)
    expect(clamp(2, 0, 3)).toBe(2)
  })

  it('formata medidas em português de Portugal', () => {
    expect(formatLength(3.5)).toBe('3,50 m')
    expect(formatArea(12.25)).toBe('12,25 m²')
    expect(formatCentimetres(1.8)).toBe('180 cm')
  })
})
