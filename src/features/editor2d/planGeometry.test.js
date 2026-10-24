import { describe, expect, it } from 'vitest'
import { createRoom } from '@/core/model'
import { worldToScreen } from '@/core/coordinates/viewport.js'
import { fitRoom, gridLines, MIN_GRID_SPACING_PX, scaleBarLength } from './planGeometry.js'

describe('planGeometry', () => {
  const room = createRoom({ width: 5, depth: 4, wallThickness: 0.15 })

  it('enquadra a divisão com paredes no centro, mantendo a proporção', () => {
    const size = { width: 900, height: 600 }
    const vp = fitRoom(room, size, 60)
    const a = worldToScreen(vp, { x: -0.15, z: -0.15 })
    const b = worldToScreen(vp, { x: 5.15, z: 4.15 })
    expect((a.x + b.x) / 2).toBeCloseTo(450)
    expect((a.y + b.y) / 2).toBeCloseTo(300)
    expect(b.y - a.y).toBeCloseTo(480) // limitado pela altura: 600 − 2×60
    expect((b.x - a.x) / (b.y - a.y)).toBeCloseTo(5.3 / 4.3)
  })

  it('gera linhas interiores e marca os metros inteiros', () => {
    const lines = gridLines(room, 0.5, 100)
    const xs = lines.filter((l) => l.axis === 'x')
    expect(xs.map((l) => l.value)).toEqual([0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5])
    expect(xs.filter((l) => l.major).map((l) => l.value)).toEqual([1, 2, 3, 4])
    expect(lines.filter((l) => l.axis === 'z')).toHaveLength(7)
  })

  it('omite linhas menores quando ficariam demasiado juntas', () => {
    const scale = (MIN_GRID_SPACING_PX - 1) / 0.1 // 10 cm < 8 px
    const lines = gridLines(room, 0.1, scale)
    expect(lines.every((l) => l.major)).toBe(true)
    expect(gridLines(room, 0.1, 2)).toEqual([]) // nem os metros cabem
  })

  it('não acumula erros de vírgula flutuante', () => {
    const lines = gridLines(createRoom({ width: 1, depth: 1 }), 0.1, 200)
    expect(lines.filter((l) => l.axis === 'x').map((l) => l.value)).toEqual([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9])
  })

  it('escolhe um comprimento legível para a barra de escala', () => {
    expect(scaleBarLength(100)).toBe(0.5)
    expect(scaleBarLength(40)).toBe(2)
    expect(scaleBarLength(1)).toBe(10)
  })
})
