import { describe, expect, it } from 'vitest'
import { FURNITURE_CATALOG } from '@/data/catalog/furniture.js'
import { buildFurnitureParts, MODEL_KEYS } from './furnitureModels.js'
import { materialFor, mixHex } from './materials.js'

const TOLERANCE = 0.002 // 2 mm

/** Caixa envolvente aproximada de uma peça (considera a rotação em y). */
function partBounds(part) {
  const [x, y, z] = part.position
  let [sx, sy, sz] = part.size
  const ry = part.rotation?.[1] ?? 0
  if (ry) {
    const c = Math.abs(Math.cos(ry))
    const s = Math.abs(Math.sin(ry))
    ;[sx, sz] = [sx * c + sz * s, sx * s + sz * c]
  }
  return { minX: x - sx / 2, maxX: x + sx / 2, minY: y - sy / 2, maxY: y + sy / 2, minZ: z - sz / 2, maxZ: z + sz / 2 }
}

function outOfBounds(parts, { width, depth, height }) {
  return parts
    .map((part, index) => ({ index, part, b: partBounds(part) }))
    .filter(
      ({ b }) =>
        b.minX < -width / 2 - TOLERANCE ||
        b.maxX > width / 2 + TOLERANCE ||
        b.minZ < -depth / 2 - TOLERANCE ||
        b.maxZ > depth / 2 + TOLERANCE ||
        b.minY < -TOLERANCE ||
        b.maxY > height + TOLERANCE,
    )
    .map(({ index, part }) => `${index}:${part.role}`)
}

describe('modelos 3D', () => {
  it('existe um modelo para cada móvel do catálogo', () => {
    const missing = FURNITURE_CATALOG.filter((e) => !MODEL_KEYS.includes(e.model3d)).map((e) => e.id)
    expect(missing).toEqual([])
  })

  it.each(FURNITURE_CATALOG.map((e) => [e.id, e]))('%s: todas as peças cabem nas medidas e são válidas', (_id, entry) => {
    const parts = buildFurnitureParts(entry.model3d, entry.dimensions)
    expect(parts.length).toBeGreaterThan(entry.model3d === 'rug' ? 0 : 2)
    expect(outOfBounds(parts, entry.dimensions)).toEqual([])
    const values = parts.flatMap((p) => [...p.position, ...p.size])
    expect(values.every(Number.isFinite)).toBe(true)
    expect(parts.every((p) => p.size.every((v) => v > 0))).toBe(true)
  })

  it.each(
    FURNITURE_CATALOG.filter((e) => e.resizable).map((e) => [e.id, e]),
  )('%s: continua coerente nos limites de redimensionamento', (_id, entry) => {
    for (const dims of [entry.resizable.min, entry.resizable.max]) {
      expect(outOfBounds(buildFurnitureParts(entry.model3d, dims), dims)).toEqual([])
    }
  })

  it('assenta no chão: a peça mais baixa toca em y = 0', () => {
    const lowest = FURNITURE_CATALOG.map((entry) => {
      const minY = Math.min(...buildFurnitureParts(entry.model3d, entry.dimensions).map((p) => partBounds(p).minY))
      return [entry.id, Math.round(minY * 100) / 100]
    })
    expect(lowest.filter(([, y]) => y !== 0)).toEqual([])
  })

  it('o número de almofadas acompanha o comprimento do sofá', () => {
    const cushions = (width) => buildFurnitureParts('sofa', { width, depth: 0.9, height: 0.85 }).filter((p) => p.role === 'soft').length
    expect(cushions(2.8)).toBeGreaterThan(cushions(1.5))
  })

  it('tipos desconhecidos são uma caixa com as medidas do móvel', () => {
    expect(buildFurnitureParts('nave', { width: 1, depth: 2, height: 3 })).toEqual([
      { shape: 'box', position: [0, 1.5, 0], size: [1, 3, 2], role: 'main' },
    ])
  })
})

describe('materiais', () => {
  it('mistura cores', () => {
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080')
    expect(mixHex('#336699', '#336699', 0.3)).toBe('#336699')
  })

  it('o acabamento muda a superfície', () => {
    const velvet = materialFor('main', { color: '#55655a', finish: 'velvet' })
    const brass = materialFor('main', { color: '#b5915a', finish: 'brass' })
    expect(velvet.roughness).toBeGreaterThan(brass.roughness)
    expect(brass.metalness).toBeGreaterThan(0.5)
    expect(materialFor('main', { color: '#cfdcdc', finish: 'glass' }).transparent).toBe(true)
    expect(materialFor('shade', { color: '#000000', finish: null }).emissive).toBeTruthy()
  })
})
