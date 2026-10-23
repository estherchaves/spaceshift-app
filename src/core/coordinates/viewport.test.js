import { describe, expect, it } from 'vitest'
import {
  createViewport,
  fitRect,
  MAX_SCALE,
  metresToPixels,
  panBy,
  pixelsToMetres,
  screenToWorld,
  worldToScreen,
  zoomAt,
} from './viewport.js'

describe('viewport: conversão metros ↔ píxeis', () => {
  const vp = createViewport({ scale: 50, offsetX: 20, offsetY: 10 })

  it('converte distâncias', () => {
    expect(metresToPixels(vp, 2)).toBe(100)
    expect(pixelsToMetres(vp, 25)).toBe(0.5)
  })

  it('converte pontos do mundo para o ecrã e volta', () => {
    expect(worldToScreen(vp, { x: 1, z: 2 })).toEqual({ x: 70, y: 110 })
    expect(screenToWorld(vp, { x: 70, y: 110 })).toEqual({ x: 1, z: 2 })
  })

  it('a conversão é reversível para pontos arbitrários', () => {
    const point = { x: 3.217, z: -1.5 }
    const back = screenToWorld(vp, worldToScreen(vp, point))
    expect(back.x).toBeCloseTo(point.x, 10)
    expect(back.z).toBeCloseTo(point.z, 10)
  })

  it('deslocar não altera a escala', () => {
    const moved = panBy(vp, 5, -5)
    expect(moved).toEqual({ scale: 50, offsetX: 25, offsetY: 5 })
  })

  it('limita a escala aos valores permitidos', () => {
    expect(createViewport({ scale: 99999 }).scale).toBe(MAX_SCALE)
  })
})

describe('viewport: zoom', () => {
  it('mantém fixo o ponto sob o cursor', () => {
    const vp = createViewport({ scale: 100, offsetX: 40, offsetY: 30 })
    const cursor = { x: 240, y: 180 }
    const before = screenToWorld(vp, cursor)
    const zoomed = zoomAt(vp, cursor, 2)
    expect(zoomed.scale).toBe(200)
    const after = screenToWorld(zoomed, cursor)
    expect(after.x).toBeCloseTo(before.x, 10)
    expect(after.z).toBeCloseTo(before.z, 10)
  })

  it('não altera nada quando já está no limite', () => {
    const vp = createViewport({ scale: MAX_SCALE })
    expect(zoomAt(vp, { x: 0, y: 0 }, 2)).toBe(vp)
  })
})

describe('viewport: enquadrar divisão', () => {
  it('centra e mantém as proporções independentemente da janela', () => {
    const room = { x: 0, z: 0, width: 5, depth: 4 }
    const vp = fitRect(room, { width: 1000, height: 600 }, 50)
    // limitado pela altura: (600 - 100) / 4 = 125 px/m
    expect(vp.scale).toBe(125)
    const topLeft = worldToScreen(vp, { x: 0, z: 0 })
    const bottomRight = worldToScreen(vp, { x: 5, z: 4 })
    expect((topLeft.x + bottomRight.x) / 2).toBe(500)
    expect((topLeft.y + bottomRight.y) / 2).toBe(300)
    // a razão largura/altura no ecrã é igual à real
    expect((bottomRight.x - topLeft.x) / (bottomRight.y - topLeft.y)).toBeCloseTo(5 / 4)
  })
})
