import { describe, expect, it } from 'vitest'
import { analyzeLayout } from '@/core/analysis'
import { createFurnitureItem, createOpening, createProject } from '@/core/model'
import { getCatalogEntry, getItemProfile } from '@/data/catalog/furniture.js'

const base = { ...createProject().room, width: 4, depth: 3.5, openings: [] }
const settings = { circulationMin: 0.9, accessibility: 'none' }
const place = (id, x, z, rotation = 0) => createFurnitureItem(getCatalogEntry(id), { position: { x, z }, rotation })
const analyze = (room, items, extra = {}) => analyzeLayout(room, items, { ...settings, ...extra }, { getProfile: getItemProfile })
const types = (result) => result.issues.map((i) => i.type)

describe('portas', () => {
  const door = createOpening(base, 'door', { wall: 'bottom', preferred: 2, hinge: 'start' })
  const room = { ...base, openings: [door] }

  it('um móvel na área de abertura é um erro, com a zona exata', () => {
    const result = analyze(room, [place('armchair', 1.9, 3.0)])
    const issue = result.errors.find((i) => i.type === 'door-swing')
    expect(issue).toBeDefined()
    expect(issue.openingIds).toEqual([door.id])
    expect(issue.marker.polygons.length).toBeGreaterThan(0)
  })

  it('um tapete ou um candeeiro suspenso não impedem a porta de abrir', () => {
    expect(types(analyze(room, [place('rug', 2, 2.8), place('pendant-lamp', 1.9, 3.0)]))).not.toContain('door-swing')
  })

  it('a abrir para fora, a área dentro da divisão fica livre', () => {
    const outward = { ...room, openings: [{ ...door, swing: 'out' }] }
    expect(types(analyze(outward, [place('armchair', 1.9, 3.0)]))).not.toContain('door-swing')
  })

  it('avisa quando a porta não chega à zona de circulação', () => {
    // Estante e roupeiro fecham a frente da porta (fora da área da folha, que abre para o outro lado).
    const shut = { ...room, openings: [{ ...door, swing: 'out' }] }
    const result = analyze(shut, [place('wardrobe', 2, 2.95), place('bookshelf', 0.75, 3.3)])
    expect(types(result)).toContain('door-access')
  })

  it('com o perfil cadeira de rodas, avisa portas estreitas', () => {
    const narrow = { ...room, openings: [{ ...door, width: 0.7 }] }
    expect(types(analyze(narrow, [], { accessibility: 'wheelchair' }))).toContain('door-width')
    expect(types(analyze(narrow, []))).not.toContain('door-width')
  })
})

describe('janelas', () => {
  const win = createOpening(base, 'window', { wall: 'top', preferred: 2 })
  const room = { ...base, openings: [win] }

  it('um móvel alto encostado tapa a janela; um baixo não', () => {
    expect(types(analyze(room, [place('wardrobe', 2, 0.3)]))).toContain('window')
    expect(types(analyze(room, [place('tv-unit', 2, 0.21)]))).not.toContain('window')
  })
})

describe('acessibilidade', () => {
  it('encontra um círculo livre para rodar numa divisão vazia', () => {
    const result = analyze(base, [], { accessibility: 'wheelchair' })
    expect(result.turning).toMatchObject({ diameter: 1.5 })
    expect(types(result)).not.toContain('turning')
  })

  it('avisa quando não há espaço para rodar', () => {
    const small = { ...base, width: 2.2, depth: 2.2 }
    const result = analyze(small, [place('armchair', 1.1, 1.1)], { accessibility: 'wheelchair' })
    expect(result.turning).toBeNull()
    expect(types(result)).toContain('turning')
  })

  it('o perfil aumenta a passagem mínima usada na análise', () => {
    expect(analyze(base, [], { circulationMin: 0.6, accessibility: 'wheelchair' }).circulation.passage).toBe(0.9)
    expect(analyze(base, [], { circulationMin: 0.6 }).circulation.passage).toBe(0.6)
  })
})
