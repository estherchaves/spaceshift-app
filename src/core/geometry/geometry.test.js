import { describe, expect, it } from 'vitest'
import {
  boundingBox,
  checkInsideRoom,
  footprintArea,
  getFootprint,
  itemsOverlap,
  normalizeDegrees,
  pointInPolygon,
  polygonArea,
  polygonsOverlap,
  rotate,
  snapAngle,
  snapPoint,
  snapToGrid,
} from './index.js'

const item = (x, z, width, depth, rotation = 0) => ({
  position: { x, z },
  dimensions: { width, depth, height: 1 },
  rotation,
})

describe('ângulos e rotação', () => {
  it('normaliza graus para [0, 360)', () => {
    expect(normalizeDegrees(370)).toBe(10)
    expect(normalizeDegrees(-90)).toBe(270)
    expect(normalizeDegrees(360)).toBe(0)
    expect(Object.is(normalizeDegrees(-0), 0)).toBe(true)
  })

  it('ajusta a rotação ao passo definido', () => {
    expect(snapAngle(52, 15)).toBe(45)
    expect(snapAngle(353, 15)).toBe(0)
  })

  it('roda vetores no sentido horário no ecrã (Z para baixo)', () => {
    const r = rotate({ x: 1, z: 0 }, Math.PI / 2)
    expect(r.x).toBeCloseTo(0)
    expect(r.z).toBeCloseTo(1)
  })
})

describe('pegada dos móveis', () => {
  it('sem rotação, os cantos coincidem com o retângulo', () => {
    const corners = getFootprint(item(2, 1, 2, 1))
    expect(corners).toEqual([
      { x: 1, z: 0.5 },
      { x: 3, z: 0.5 },
      { x: 3, z: 1.5 },
      { x: 1, z: 1.5 },
    ])
  })

  it('rodado 90°, troca comprimento e largura na caixa envolvente', () => {
    const box = boundingBox(getFootprint(item(2, 2, 2, 1, 90)))
    expect(box.width).toBeCloseTo(1)
    expect(box.depth).toBeCloseTo(2)
  })

  it('rodado 45°, a caixa envolvente cresce de acordo com a diagonal', () => {
    const box = boundingBox(getFootprint(item(0, 0, 1, 1, 45)))
    expect(box.width).toBeCloseTo(Math.SQRT2)
    expect(box.depth).toBeCloseTo(Math.SQRT2)
  })

  it('a área não depende da rotação', () => {
    for (const rotation of [0, 30, 45, 90, 137]) {
      expect(polygonArea(getFootprint(item(1, 1, 2.2, 0.9, rotation)))).toBeCloseTo(1.98)
    }
    expect(footprintArea(item(0, 0, 2.2, 0.9))).toBeCloseTo(1.98)
  })
})

describe('polígonos', () => {
  it('calcula áreas pela fórmula de Gauss', () => {
    const square = [
      { x: 0, z: 0 },
      { x: 4, z: 0 },
      { x: 4, z: 3 },
      { x: 0, z: 3 },
    ]
    expect(polygonArea(square)).toBe(12)
    expect(polygonArea([...square].reverse())).toBe(12)
    expect(polygonArea([{ x: 0, z: 0 }, { x: 2, z: 0 }, { x: 0, z: 2 }])).toBe(2)
  })

  it('deteta pontos dentro e fora', () => {
    const corners = getFootprint(item(0, 0, 2, 2, 45))
    expect(pointInPolygon({ x: 0, z: 0 }, corners)).toBe(true)
    expect(pointInPolygon({ x: 0.9, z: 0.9 }, corners)).toBe(false) // canto da caixa, fora do losango
  })
})

describe('colisões (SAT)', () => {
  it('deteta sobreposição simples e a profundidade', () => {
    const result = itemsOverlap(item(1, 1, 2, 1), item(2.5, 1, 2, 1))
    expect(result.overlapping).toBe(true)
    expect(result.depth).toBeCloseTo(0.5)
  })

  it('móveis encostados não colidem', () => {
    expect(itemsOverlap(item(1, 1, 2, 1), item(3, 1, 2, 1)).overlapping).toBe(false)
  })

  it('móveis afastados não colidem', () => {
    expect(itemsOverlap(item(1, 1, 1, 1), item(5, 5, 1, 1)).overlapping).toBe(false)
  })

  it('não se limita a comparar centros: deteta colisão de objetos rodados', () => {
    // Um retângulo comprido rodado 45° chega ao outro, apesar dos centros afastados.
    const longTable = item(0, 0, 3, 0.4, 45)
    const chair = item(0.9, 0.9, 0.4, 0.4)
    expect(itemsOverlap(longTable, chair).overlapping).toBe(true)
  })

  it('evita falsos positivos que um teste de caixas alinhadas daria', () => {
    // As caixas envolventes sobrepõem-se, mas os retângulos rodados não.
    const a = item(0, 0, 3, 0.2, 45)
    const b = item(1, -1, 0.4, 0.4)
    const boxA = boundingBox(getFootprint(a))
    expect(boxA.maxX > 0.8 && boxA.minZ < -0.8).toBe(true)
    expect(itemsOverlap(a, b).overlapping).toBe(false)
  })

  it('funciona com quaisquer polígonos convexos', () => {
    const triangle = [{ x: 0, z: 0 }, { x: 2, z: 0 }, { x: 0, z: 2 }]
    const square = [{ x: 0.8, z: 0.8 }, { x: 2, z: 0.8 }, { x: 2, z: 2 }, { x: 0.8, z: 2 }]
    expect(polygonsOverlap(triangle, square).overlapping).toBe(true)
    const far = square.map((p) => ({ x: p.x + 0.5, z: p.z + 0.5 }))
    expect(polygonsOverlap(triangle, far).overlapping).toBe(false)
  })
})

describe('limites da divisão', () => {
  const room = { width: 4, depth: 3 }

  it('aceita um móvel dentro da divisão e encostado às paredes', () => {
    expect(checkInsideRoom(item(1, 0.5, 2, 1), room).inside).toBe(true)
  })

  it('indica quanto o móvel ultrapassa cada parede', () => {
    const { inside, overflow } = checkInsideRoom(item(3.8, 2.9, 1, 0.6), room)
    expect(inside).toBe(false)
    expect(overflow.right).toBeCloseTo(0.3)
    expect(overflow.bottom).toBeCloseTo(0.2)
    expect(overflow.left).toBe(0)
    expect(overflow.top).toBe(0)
  })

  it('considera a rotação: um móvel que cabe direito pode não caber rodado', () => {
    const sofa = item(0.5, 1.5, 2.4, 0.9)
    expect(checkInsideRoom({ ...sofa, position: { x: 1.3, z: 1.5 } }, room).inside).toBe(true)
    expect(checkInsideRoom({ ...sofa, position: { x: 0.5, z: 1.5 }, rotation: 90 }, room).inside).toBe(true)
    expect(checkInsideRoom({ ...sofa, position: { x: 0.5, z: 1.5 }, rotation: 45 }, room).inside).toBe(false)
  })
})

describe('snap à grelha', () => {
  it('ajusta ao passo da grelha sem erros de arredondamento', () => {
    expect(snapToGrid(1.234, 0.1)).toBe(1.2)
    expect(snapToGrid(0.25, 0.5)).toBe(0.5)
    expect(snapPoint({ x: 0.33, z: 0.77 }, 0.25)).toEqual({ x: 0.25, z: 0.75 })
  })

  it('com o snap desligado, apenas arredonda ao milímetro', () => {
    expect(snapPoint({ x: 0.33333, z: 0.77777 }, 0.25, false)).toEqual({ x: 0.333, z: 0.778 })
  })
})
