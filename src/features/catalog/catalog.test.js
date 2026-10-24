import { describe, expect, it } from 'vitest'
import { FURNITURE_CATEGORIES, LIMITS } from '@/core/model'
import { FURNITURE_CATALOG, getCatalogEntry } from './data/furniture.js'
import { FINISHES } from './data/finishes.js'
import { filterCatalog, normalizeSearch } from './filterCatalog.js'

describe('dados do catálogo', () => {
  it('tem pelo menos 15 móveis e todas as categorias representadas', () => {
    expect(FURNITURE_CATALOG.length).toBeGreaterThanOrEqual(15)
    const represented = new Set(FURNITURE_CATALOG.map((e) => e.category))
    expect([...represented].sort()).toEqual(Object.keys(FURNITURE_CATEGORIES).sort())
  })

  it('identificadores únicos', () => {
    const ids = FURNITURE_CATALOG.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(FURNITURE_CATALOG.map((e) => [e.id, e]))('%s tem dados coerentes', (_id, entry) => {
    expect(entry.name.length).toBeGreaterThan(2)
    expect(FURNITURE_CATEGORIES).toHaveProperty(entry.category)
    expect(entry.color).toMatch(/^#[0-9a-f]{6}$/i)
    expect(entry.plan2d).toBeTruthy()
    expect(entry.model3d).toBeTruthy()
    entry.finishes.forEach((finish) => expect(FINISHES).toHaveProperty(finish))
    const { width, depth, height } = entry.dimensions
    expect(Math.min(width, depth)).toBeGreaterThanOrEqual(LIMITS.item.min)
    expect(height).toBeGreaterThanOrEqual(0.01)
    expect(Math.max(width, depth, height)).toBeLessThanOrEqual(LIMITS.item.max)
    // Medidas por omissão dentro dos limites de redimensionamento (min = max quando fixas).
    const { min, max } = entry.resizable ?? { min: entry.dimensions, max: entry.dimensions }
    for (const key of ['width', 'depth', 'height']) {
      expect(entry.dimensions[key]).toBeGreaterThanOrEqual(min[key])
      expect(entry.dimensions[key]).toBeLessThanOrEqual(max[key])
    }
    expect(entry.price === null || entry.price > 0).toBe(true)
  })

  it('encontra entradas pelo id', () => {
    expect(getCatalogEntry('sofa-3').name).toBe('Sofá de 3 lugares')
    expect(getCatalogEntry('nao-existe')).toBeNull()
  })
})

describe('filtros do catálogo', () => {
  const options = { categories: FURNITURE_CATEGORIES }

  it('ignora acentos e maiúsculas', () => {
    expect(normalizeSearch('  Cómoda ')).toBe('comoda')
    expect(filterCatalog(FURNITURE_CATALOG, { ...options, query: 'COMODA' }).map((e) => e.id)).toEqual(['dresser'])
  })

  it('filtra por categoria', () => {
    const beds = filterCatalog(FURNITURE_CATALOG, { ...options, category: 'beds' })
    expect(beds.length).toBe(3)
    expect(beds.every((e) => e.category === 'beds')).toBe(true)
  })

  it('combina categoria e texto, procurando também no nome da categoria', () => {
    expect(filterCatalog(FURNITURE_CATALOG, { ...options, query: 'iluminação' }).length).toBe(2)
    expect(filterCatalog(FURNITURE_CATALOG, { ...options, query: 'mesa', category: 'tables' }).length).toBe(5)
    expect(filterCatalog(FURNITURE_CATALOG, { ...options, query: 'mesa', category: 'beds' })).toEqual([])
  })
})
