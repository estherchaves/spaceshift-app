import { describe, expect, it } from 'vitest'
import { checkInsideRoom, getFootprint, itemsOverlap, boundingBox } from '../geometry'
import {
  availableHandles,
  findFreePosition,
  moveItem,
  resizeFromHandle,
  rotationFromPointer,
  snapItemPosition,
  toLocal,
  toWorld,
} from './index.js'

const make = (x, z, width, depth, rotation = 0, extra = {}) => ({
  position: { x, z },
  dimensions: { width, depth, height: 0.8 },
  rotation,
  elevation: 0,
  ...extra,
})
const bounds = { min: { width: 0.5, depth: 0.5, height: 0.5 }, max: { width: 3, depth: 2, height: 1 } }

describe('mover com snap', () => {
  it('alinha as arestas do móvel à grelha (não o centro)', () => {
    const sofa = make(0, 0, 2.2, 0.92)
    const p = snapItemPosition(sofa, { x: 1.43, z: 0.77 }, 0.1)
    const box = boundingBox(getFootprint({ ...sofa, position: p }))
    expect(box.minX).toBeCloseTo(0.3)
    expect(box.minZ).toBeCloseTo(0.3)
  })

  it('encosta à parede quando o móvel chega perto de x = 0', () => {
    const sofa = make(0, 0, 2.2, 0.92)
    const p = moveItem(sofa, { x: 1.2, z: 1 }, { x: -0.13, z: 0 }, { gridSize: 0.1, snap: true })
    expect(boundingBox(getFootprint({ ...sofa, position: p })).minX).toBeCloseTo(0)
  })

  it('funciona com móveis rodados', () => {
    const bed = make(0, 0, 1.6, 2, 90)
    const p = snapItemPosition(bed, { x: 1.04, z: 1.37 }, 0.25)
    const box = boundingBox(getFootprint({ ...bed, position: p }))
    expect(box.minX / 0.25).toBeCloseTo(Math.round(box.minX / 0.25))
    expect(box.minZ / 0.25).toBeCloseTo(Math.round(box.minZ / 0.25))
  })

  it('sem snap só arredonda ao milímetro', () => {
    expect(moveItem(make(0, 0, 1, 1), { x: 1, z: 1 }, { x: 0.12345, z: -0.0001 }, { gridSize: 0.1, snap: false })).toEqual({
      x: 1.123,
      z: 1,
    })
  })
})

describe('rodar com o ponteiro', () => {
  const c = { x: 2, z: 2 }
  it('0° com o ponteiro por cima, 90° à direita (sentido horário)', () => {
    expect(rotationFromPointer(c, { x: 2, z: 1 })).toBe(0)
    expect(rotationFromPointer(c, { x: 3, z: 2 })).toBe(90)
    expect(rotationFromPointer(c, { x: 2, z: 3 })).toBe(180)
    expect(rotationFromPointer(c, { x: 1, z: 2 })).toBe(270)
  })

  it('ajusta ao passo de rotação, ou ao grau com rotação livre', () => {
    const p = { x: 2 + Math.sin((37 * Math.PI) / 180), z: 2 - Math.cos((37 * Math.PI) / 180) }
    expect(rotationFromPointer(c, p, { step: 15 })).toBe(30)
    expect(rotationFromPointer(c, p, { free: true })).toBe(37)
  })
})

describe('redimensionar com pegas', () => {
  it('conversão local ↔ mundo é reversível', () => {
    const item = make(2, 1, 2, 1, 30)
    const local = toLocal(item, { x: 2.7, z: 1.4 })
    const back = toWorld(item, local)
    expect(back.x).toBeCloseTo(2.7)
    expect(back.z).toBeCloseTo(1.4)
  })

  it('a pega direita aumenta o comprimento e mantém a aresta esquerda fixa', () => {
    const item = make(2, 1, 2, 1)
    const r = resizeFromHandle(item, { sx: 1, sz: 0 }, { x: 3.5, z: 1.3 }, { bounds, gridSize: 0.1, snap: true })
    expect(r.dimensions.width).toBe(2.5)
    expect(r.dimensions.depth).toBe(1)
    expect(r.position).toEqual({ x: 2.25, z: 1 })
    expect(r.position.x - r.dimensions.width / 2).toBeCloseTo(1) // aresta esquerda não se mexeu
  })

  it('o canto altera as duas medidas e respeita os limites', () => {
    const item = make(2, 1, 2, 1)
    const r = resizeFromHandle(item, { sx: -1, sz: 1 }, { x: -5, z: 1.2 }, { bounds, gridSize: 0.1, snap: true })
    expect(r.dimensions.width).toBe(3) // máximo
    expect(r.dimensions.depth).toBe(0.7)
    expect(r.position.x + r.dimensions.width / 2).toBeCloseTo(3) // aresta direita fixa
    expect(r.position.z - r.dimensions.depth / 2).toBeCloseTo(0.5) // aresta de cima fixa
  })

  it('funciona com o móvel rodado 90°', () => {
    const item = make(2, 2, 2, 1, 90) // eixo X local aponta para +Z do mundo
    const r = resizeFromHandle(item, { sx: 1, sz: 0 }, { x: 2, z: 3.4 }, { bounds, gridSize: 0.1, snap: true })
    expect(r.dimensions.width).toBe(2.4)
    expect(r.position.x).toBeCloseTo(2)
    expect(r.position.z).toBeCloseTo(2.2)
  })

  it('só mostra pegas nos eixos redimensionáveis', () => {
    expect(availableHandles(bounds)).toHaveLength(8)
    const widthOnly = { min: { width: 1, depth: 0.5, height: 1 }, max: { width: 2, depth: 0.5, height: 1 } }
    expect(availableHandles(widthOnly).map((h) => h.id)).toEqual(['e', 'w'])
    const fixed = { min: { width: 1, depth: 1, height: 1 }, max: { width: 1, depth: 1, height: 1 } }
    expect(availableHandles(fixed)).toEqual([])
  })
})

describe('procurar espaço livre', () => {
  const room = { width: 4, depth: 3 }

  it('usa a posição preferida quando está livre', () => {
    expect(findFreePosition(room, [], make(0, 0, 1, 1), { x: 2, z: 1.5 })).toEqual({ x: 2, z: 1.5 })
  })

  it('encontra a posição livre mais próxima, dentro da divisão e sem sobreposições', () => {
    const blocker = make(2, 1.5, 2, 1.5)
    const chair = make(0, 0, 0.5, 0.5)
    const p = findFreePosition(room, [blocker], chair, { x: 2, z: 1.5 })
    const placed = { ...chair, position: p }
    expect(checkInsideRoom(placed, room).inside).toBe(true)
    expect(itemsOverlap(placed, blocker).overlapping).toBe(false)
    expect(Math.hypot(p.x - 2, p.z - 1.5)).toBeLessThan(1.2)
  })

  it('tapetes e objetos suspensos ficam na posição pedida', () => {
    const rug = { ...make(0, 0, 2, 1.4), dimensions: { width: 2, depth: 1.4, height: 0.01 } }
    expect(findFreePosition(room, [make(2, 1.5, 1, 1)], rug, { x: 2, z: 1.5 })).toEqual({ x: 2, z: 1.5 })
  })

  it('sem espaço devolve a posição preferida', () => {
    const huge = make(2, 1.5, 4, 3)
    expect(findFreePosition(room, [huge], make(0, 0, 1, 1), { x: 2, z: 1.5 })).toEqual({ x: 2, z: 1.5 })
  })
})
