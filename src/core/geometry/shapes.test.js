import { describe, expect, it } from 'vitest'
import {
  clipByHalfPlane,
  getItemShape,
  getLocalOutline,
  intersectConvex,
  polygonArea,
  polygonsDistance,
  polygonsOverlap,
  shapeArea,
  shapeBounds,
} from './index.js'

const item = (x, z, width, depth, rotation = 0) => ({
  position: { x, z },
  dimensions: { width, depth, height: 0.75 },
  rotation,
})
const overlaps = (a, b) => a.some((pa) => b.some((pb) => polygonsOverlap(pa, pb).overlapping))
const square = (x0, z0, x1, z1) => [
  { x: x0, z: z0 },
  { x: x1, z: z0 },
  { x: x1, z: z1 },
  { x: x0, z: z1 },
]

describe('formas reais das pegadas', () => {
  it('a mesa redonda é uma elipse inscrita, com a área certa', () => {
    const [polygon] = getItemShape(item(0, 0, 1.1, 1.1), 'ellipse')
    expect(polygonArea(polygon)).toBeCloseTo((Math.PI / 4) * 1.21, 2)
    expect(shapeArea({ width: 1.1, depth: 1.1 }, 'ellipse')).toBeCloseTo((Math.PI / 4) * 1.21)
    const box = shapeBounds([polygon])
    expect(box.width).toBeCloseTo(1.1, 3)
  })

  it('um objeto no canto vazio de uma mesa redonda não colide', () => {
    const table = getItemShape(item(1, 1, 1.1, 1.1), 'ellipse')
    // Planta de 30 × 30 cm encostada ao canto da caixa da mesa, fora do círculo.
    const plant = getItemShape(item(1.6, 0.4, 0.3, 0.3))
    expect(overlaps(getItemShape(item(1, 1, 1.1, 1.1)), plant)).toBe(true) // o retângulo dava falso positivo
    expect(overlaps(table, plant)).toBe(false)
  })

  it('o sofá de canto é um L: o canto sem chaise está livre', () => {
    const sofa = item(2, 1, 2.7, 1.65)
    const shape = getItemShape(sofa, 'corner')
    expect(shape).toHaveLength(2)
    // Mesa de apoio no canto inferior esquerdo da caixa, onde não há sofá.
    const sideTable = getItemShape(item(0.65 + 0.3, 1.825 - 0.25, 0.5, 0.4))
    expect(overlaps(getItemShape(sofa), sideTable)).toBe(true)
    expect(overlaps(shape, sideTable)).toBe(false)
    // Mas na chaise (lado direito) colide.
    expect(overlaps(shape, getItemShape(item(3.2, 1.6, 0.4, 0.4)))).toBe(true)
  })

  it('a forma roda com o móvel', () => {
    const sofa = item(2, 2, 2.7, 1.65, 90)
    const box = shapeBounds(getItemShape(sofa, 'corner'))
    expect(box.width).toBeCloseTo(1.65)
    expect(box.depth).toBeCloseTo(2.7)
  })

  it('o contorno do L tem 6 vértices e a mesma área das duas partes', () => {
    const dims = { width: 2.7, depth: 1.65 }
    const outline = getLocalOutline(dims, 'corner')
    expect(outline).toHaveLength(6)
    expect(polygonArea(outline)).toBeCloseTo(shapeArea(dims, 'corner'))
  })
})

describe('distâncias e recortes', () => {
  it('mede a passagem entre arestas paralelas e centra a cota', () => {
    const a = square(0, 0, 2, 1)
    const b = square(0.5, 1.6, 1.5, 2.2)
    const gap = polygonsDistance(a, b)
    expect(gap.distance).toBeCloseTo(0.6)
    expect(gap.from).toEqual({ x: 1, z: 1 })
    expect(gap.to.z).toBeCloseTo(1.6)
  })

  it('mede a distância entre cantos de móveis rodados', () => {
    const a = getItemShape(item(0, 0, 1, 1, 45))[0]
    const b = square(1.2, -0.5, 2, 0.5)
    expect(polygonsDistance(a, b).distance).toBeCloseTo(1.2 - Math.SQRT1_2)
  })

  it('recorta a zona exata de uma sobreposição', () => {
    const region = intersectConvex(square(0, 0, 2, 1), square(1.5, 0.5, 3, 2))
    expect(polygonArea(region)).toBeCloseTo(0.25)
    expect(intersectConvex(square(0, 0, 1, 1), square(2, 2, 3, 3))).toEqual([])
  })

  it('recorta a parte de um móvel que sai por uma parede', () => {
    const outside = clipByHalfPlane(square(-0.3, 0, 0.7, 1), (p) => -p.x)
    expect(polygonArea(outside)).toBeCloseTo(0.3)
  })
})
