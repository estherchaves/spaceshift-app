import { describe, expect, it } from 'vitest'
import { FLOOR_MATERIALS } from '@/core/model'
import { drawFloorPattern, floorPattern, seededRandom } from './floorPattern.js'

/** Contexto 2D falso que só regista os retângulos desenhados. */
function recordingContext() {
  const calls = []
  return {
    calls,
    fillStyle: '',
    fillRect(x, y, w, h) {
      calls.push({ x, y, w, h, fill: this.fillStyle })
    },
  }
}

describe('floorPattern', () => {
  it('cada material do pavimento tem um padrão', () => {
    const kinds = Object.keys(FLOOR_MATERIALS).map((m) => floorPattern(m, '#c9a77c').kind)
    expect(kinds).toEqual(['planks', 'planks', 'concrete', 'tiles', 'carpet'])
  })

  it('as tábuas preenchem todas as fiadas, sem buracos', () => {
    const { planks, tileSize } = floorPattern('oak', '#c9a77c')
    const rows = Map.groupBy(planks, (p) => p.z)
    expect(rows.size).toBe(Math.round(tileSize / 0.18))
    for (const row of rows.values()) {
      const sorted = row.toSorted((a, b) => a.x - b.x)
      expect(sorted[0].x).toBeLessThanOrEqual(0)
      expect(sorted.at(-1).x + sorted.at(-1).length).toBeGreaterThanOrEqual(tileSize)
      for (let i = 1; i < sorted.length; i++) expect(sorted[i].x).toBeCloseTo(sorted[i - 1].x + sorted[i - 1].length)
    }
  })

  it('é determinístico: o mesmo chão em todas as sessões', () => {
    expect(floorPattern('walnut', '#7a5a43')).toEqual(floorPattern('walnut', '#7a5a43'))
    const a = seededRandom(42)
    const b = seededRandom(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('desenha a cor do pavimento como base e só cores hex válidas', () => {
    for (const material of Object.keys(FLOOR_MATERIALS)) {
      const ctx = recordingContext()
      drawFloorPattern(ctx, floorPattern(material, '#a59e94'), 256)
      expect(ctx.calls[0]).toEqual({ x: 0, y: 0, w: 256, h: 256, fill: '#a59e94' })
      expect(ctx.calls.every((c) => /^#[0-9a-f]{6}$/.test(c.fill))).toBe(true)
    }
  })
})
