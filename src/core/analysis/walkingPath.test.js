import { describe, expect, it } from 'vitest'
import { findWalkingPath, rayDistance } from './walkingPath.js'

const room = { width: 4, depth: 3 }
const box = (x0, z0, x1, z1) => [[{ x: x0, z: z0 }, { x: x1, z: z0 }, { x: x1, z: z1 }, { x: x0, z: z1 }]]

describe('rayDistance', () => {
  it('mede até à parede e até ao móvel mais próximo', () => {
    expect(rayDistance(room, [], { x: 1, z: 1 }, { x: 1, z: 0 })).toBeCloseTo(3)
    expect(rayDistance(room, [box(2, 0, 3, 3)], { x: 1, z: 1 }, { x: 1, z: 0 })).toBeCloseTo(1)
  })
})

describe('findWalkingPath', () => {
  it('numa divisão vazia vai a direito', () => {
    const r = findWalkingPath(room, [], { x: 0.5, z: 1.5 }, { x: 3.5, z: 1.5 })
    expect(r.ok).toBe(true)
    expect(r.points).toHaveLength(2)
    expect(r.length).toBeCloseTo(3, 5)
    expect(r.narrowest.width).toBeCloseTo(3, 2)
  })

  it('contorna um móvel e mede a passagem mais estreita', () => {
    // Parede de móveis a meio com uma abertura de 70 cm em baixo.
    const wall = box(1.9, 0, 2.1, 2.3)
    const r = findWalkingPath(room, [wall], { x: 0.5, z: 0.5 }, { x: 3.5, z: 0.5 })
    expect(r.ok).toBe(true)
    expect(r.length).toBeGreaterThan(3.5)
    expect(r.narrowest.width).toBeCloseTo(0.7, 1)
    expect(r.narrowest.point.x).toBeGreaterThan(1.8)
    expect(r.narrowest.point.x).toBeLessThan(2.2)
  })

  it('não encontra caminho quando a passagem é mais estreita do que uma pessoa', () => {
    const wall = box(1.9, 0, 2.1, 2.7)
    const r = findWalkingPath(room, [wall], { x: 0.5, z: 0.5 }, { x: 3.5, z: 0.5 })
    expect(r).toEqual({ ok: false, reason: 'no-path' })
  })

  it('um ponto dentro de um móvel passa para o sítio livre mais próximo', () => {
    const r = findWalkingPath(room, [box(0, 0, 1, 1)], { x: 0.5, z: 0.5 }, { x: 3.5, z: 2.5 })
    expect(r.ok).toBe(true)
    const p = r.points[0]
    expect(p.x > 1 || p.z > 1).toBe(true)
  })

  it('com uma cadeira de rodas (90 cm) a passagem de 70 cm deixa de servir', () => {
    const wall = box(1.9, 0, 2.1, 2.3)
    expect(findWalkingPath(room, [wall], { x: 0.5, z: 0.5 }, { x: 3.5, z: 0.5 }, { body: 0.9 }).ok).toBe(false)
  })
})
