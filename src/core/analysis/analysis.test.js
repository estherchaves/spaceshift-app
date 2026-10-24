import { describe, expect, it } from 'vitest'
import { analyzeLayout, describeLocation } from './index.js'

/*
 * Os perfis (forma e encaixe) normalmente vêm do catálogo; aqui são dados
 * diretamente para o núcleo continuar independente dos dados.
 */
const PROFILES = {
  'round-table': { shape: 'ellipse', role: 'table' },
  'sofa-corner': { shape: 'corner', role: 'seat' },
  sofa: { role: 'seat' },
  'coffee-table': { role: 'coffee-table' },
  'dining-table': { role: 'table' },
  'dining-chair': { role: 'chair' },
}
const getProfile = (item) => PROFILES[item.catalogId] ?? {}

let seq = 0
const item = (catalogId, x, z, width, depth, height = 0.8, extra = {}) => ({
  id: `i${++seq}`,
  catalogId,
  name: extra.name ?? catalogId,
  category: extra.category ?? 'storage',
  position: { x, z },
  dimensions: { width, depth, height },
  rotation: extra.rotation ?? 0,
  elevation: extra.elevation ?? 0,
})
const room = (width = 5, depth = 4, wallHeight = 2.7) => ({ width, depth, wallHeight })
const settings = { circulationMin: 0.9 }
const analyze = (r, items, s = settings) => analyzeLayout(r, items, s, { getProfile })
const types = (result) => result.issues.map((issue) => issue.type)

describe('analyzeLayout: erros geométricos', () => {
  it('uma divisão vazia não tem problemas e tem zona de circulação', () => {
    const result = analyze(room(), [])
    expect(result.issues).toEqual([])
    expect(result.circulation.area).toBeGreaterThan(10)
  })

  it('móvel fora da divisão: diz quanto sai, marca a zona e propõe trazê-lo para dentro', () => {
    const sofa = item('sofa', 4.8, 1, 2, 0.9, 0.8, { name: 'Sofá' })
    const [issue] = analyze(room(), [sofa]).errors
    expect(issue.type).toBe('outside')
    expect(issue.message).toBe('Sofá ultrapassa 80 cm na parede direita.')
    expect(issue.marker.polygons[0].every((p) => p.x >= 5 - 1e-9)).toBe(true)
    expect(issue.fix.delta.x).toBeCloseTo(-0.8)
    const moved = { ...sofa, position: { x: sofa.position.x + issue.fix.delta.x, z: 1 } }
    expect(analyze(room(), [moved]).errors).toEqual([])
  })

  it('móvel maior do que a divisão: sugere rodar quando assim cabe', () => {
    const [issue] = analyze(room(4, 5), [item('wardrobe', 2, 2, 4.5, 0.6, 2, { name: 'Roupeiro' })]).errors
    expect(issue.title).toBe('Não cabe na divisão')
    expect(issue.hint).toBe('Rode-o 90° para caber.')
    expect(issue.fix).toBeNull()
  })

  it('sobreposição: profundidade e zona exata da colisão', () => {
    const a = item('sofa', 1.5, 1, 2, 1, 0.8, { name: 'Sofá' })
    const b = item('table', 2.75, 1, 1, 1, 0.75, { name: 'Mesa' })
    const [issue] = analyze(room(), [a, b]).errors
    expect(issue.type).toBe('overlap')
    expect(issue.message).toBe('Sofá e Mesa sobrepõem-se 25 cm.')
    expect(issue.itemIds).toEqual([a.id, b.id])
    const xs = issue.marker.polygons[0].map((p) => p.x)
    expect(Math.min(...xs)).toBeCloseTo(2.25)
    expect(Math.max(...xs)).toBeCloseTo(2.5)
  })

  it('usa a forma real: o canto vazio da mesa redonda e do sofá de canto não colide', () => {
    const table = item('round-table', 2, 2, 1.1, 1.1, 0.75)
    const plant = item('plant', 2.6, 1.4, 0.3, 0.3, 1.2, { category: 'decor' })
    expect(analyze(room(), [table, plant]).errors).toEqual([])
    const sofa = item('sofa-corner', 2, 1.5, 2.7, 1.65, 0.84)
    const sideTable = item('side', 0.95, 2.07, 0.5, 0.4, 0.5)
    expect(analyze(room(), [sofa, sideTable]).errors).toEqual([])
  })

  it('cadeiras podem entrar debaixo da mesa até 30 cm', () => {
    const table = item('dining-table', 2.5, 2, 1.8, 0.9, 0.75)
    const tucked = item('dining-chair', 2.5, 2.45 + 0.26 - 0.2, 0.46, 0.52, 0.82)
    expect(analyze(room(), [table, tucked]).errors).toEqual([])
    const inside = item('dining-chair', 2.5, 2.2, 0.46, 0.52, 0.82)
    expect(types(analyze(room(), [table, inside]))).toContain('overlap')
  })

  it('considera a altura: o candeeiro suspenso passa por cima da mesa mas não do roupeiro', () => {
    const lamp = item('pendant', 2, 2, 0.5, 0.5, 0.35, { elevation: 1.95, category: 'lighting' })
    const table = item('table', 2, 2, 1.2, 0.8, 0.75)
    expect(analyze(room(), [lamp, table]).errors).toEqual([])
    const wardrobe = item('wardrobe', 2, 2, 1.5, 0.6, 2.2)
    expect(types(analyze(room(), [lamp, wardrobe]))).toContain('overlap')
  })

  it('tapetes não colidem com nada', () => {
    const rug = item('rug', 2, 2, 2, 1.4, 0.01, { category: 'decor' })
    expect(analyze(room(), [rug, item('table', 2, 2, 1, 0.6, 0.4)]).errors).toEqual([])
  })

  it('assinala móveis mais altos do que o teto', () => {
    const [issue] = analyze(room(5, 4, 2.4), [item('wardrobe', 2, 0.3, 1.5, 0.6, 2.5, { name: 'Roupeiro' })]).errors
    expect(issue.type).toBe('ceiling')
    expect(issue.message).toBe('Roupeiro chega a 2,50 m e o pé-direito é 2,40 m.')
  })
})

describe('analyzeLayout: avisos de circulação', () => {
  it('passagem estreita entre um móvel e a parede, medida e centrada', () => {
    const sofa = item('sofa', 2.5, 0.4 + 0.45, 2, 0.9, 0.8, { name: 'Sofá' })
    const result = analyze(room(), [sofa])
    const issue = result.warnings.find((w) => w.type === 'passage')
    expect(issue.message).toBe('Passagem de 40 cm entre Sofá e a parede superior. O mínimo sugerido é 90 cm.')
    expect(issue.marker.from.x).toBeCloseTo(2.5)
    expect(issue.marker.to).toEqual({ x: 2.5, z: 0 })
    expect(result.errors).toEqual([])
  })

  it('o limite é configurável', () => {
    const sofa = item('sofa', 2.5, 0.4 + 0.45, 2, 0.9)
    expect(types(analyze(room(), [sofa], { circulationMin: 0.35 }))).not.toContain('passage')
  })

  it('móveis encostados não são uma passagem', () => {
    const a = item('sofa', 1, 2, 2, 0.9)
    const b = item('cabinet', 2.55, 2, 1, 0.5)
    expect(types(analyze(room(), [a, b]))).not.toContain('passage')
  })

  it('passagem estreita entre dois móveis, mas não entre cadeira e mesa', () => {
    const a = item('sofa', 1.5, 2, 2, 0.9, 0.8, { name: 'Sofá' })
    const b = item('shelf', 1.5, 3.05, 2, 0.5, 0.8, { name: 'Estante' })
    const issue = analyze(room(), [a, b]).warnings.find((w) => w.id === `passage:${a.id}:${b.id}`)
    expect(issue.marker.distance).toBeCloseTo(0.35)
    const table = item('dining-table', 2.5, 2, 1.8, 0.9, 0.75)
    const chair = item('dining-chair', 2.5, 2.45 + 0.26 + 0.3, 0.46, 0.52, 0.82)
    expect(analyze(room(), [table, chair]).warnings.filter((w) => w.type === 'passage' && w.itemIds.length === 2)).toEqual([])
  })

  it('a mesa de centro a 40 cm do sofá é intencional, não uma passagem', () => {
    const sofa = item('sofa', 2.5, 1, 2.2, 0.9)
    const coffee = item('coffee-table', 2.5, 1.45 + 0.4 + 0.3, 1.1, 0.6, 0.4)
    expect(analyze(room(), [sofa, coffee]).warnings.filter((w) => w.itemIds.length === 2)).toEqual([])
  })

  it('numera móveis com o mesmo nome nas mensagens', () => {
    const a = item('chair', 1, 0.5 + 0.3, 0.5, 0.5, 0.8, { name: 'Cadeira' })
    const b = item('chair', 3, 0.5 + 0.3, 0.5, 0.5, 0.8, { name: 'Cadeira' })
    const messages = analyze(room(), [a, b]).warnings.map((w) => w.message)
    expect(messages).toContain('Passagem de 55 cm entre Cadeira 1 e a parede superior. O mínimo sugerido é 90 cm.')
    expect(messages).toContain('Passagem de 55 cm entre Cadeira 2 e a parede superior. O mínimo sugerido é 90 cm.')
  })

  it('o acesso aos móveis usa uma passagem secundária de 60 cm', () => {
    // Secretária num nicho com 70 cm de entrada: estreito para corredor, suficiente para lá chegar.
    const r = room(3, 3)
    const wardrobe = item('wardrobe', 1.15, 1.5, 2.3, 0.6, 2.2)
    const desk = item('desk', 0.8, 0.35, 1.4, 0.7, 0.75)
    const result = analyze(r, [wardrobe, desk])
    expect(types(result)).not.toContain('access')
    expect(types(result)).not.toContain('isolated')
    expect(result.warnings.some((w) => w.type === 'passage' && w.itemIds[0] === wardrobe.id)).toBe(true)
  })

  it('recantos sem saída não são passagens', () => {
    // Móvel de TV encostado à parede inferior, a 50 cm da parede esquerda.
    const tv = item('tv', 0.5 + 0.9, 4 - 0.21, 1.8, 0.42, 0.5)
    expect(types(analyze(room(), [tv]))).not.toContain('passage')
    // Dois móveis encostados à mesma parede, com 50 cm entre eles.
    const a = item('cabinet', 1, 0.25, 1, 0.5)
    const b = item('cabinet', 2, 0.25, 0.5, 0.5)
    expect(analyze(room(), [a, b]).warnings.filter((w) => w.itemIds.length === 2)).toEqual([])
  })

  it('uma folga ocupada por outro móvel não é passagem', () => {
    const bed = item('bed', 2, 2, 1.6, 2, 0.5)
    const filler = item('cabinet', 3.025, 2, 0.45, 2, 0.5) // ocupa a folga de 45 cm entre a cama e a parede direita
    const result = analyze(room(3.25, 4), [bed, filler])
    expect(result.warnings.filter((w) => w.id === `passage:${bed.id}:right`)).toEqual([])
  })

  it('zona isolada e móvel sem acesso quando um roupeiro corta a divisão', () => {
    const wardrobe = item('wardrobe', 1.5, 1.5, 3, 0.6, 2.2, { name: 'Roupeiro' })
    const r = room(3.5, 3.4)
    const result = analyze(r, [wardrobe])
    const zone = result.warnings.find((w) => w.type === 'isolated')
    expect(zone.message).toMatch(/junto à parede superior sem uma passagem de 60 cm/)
    expect(zone.marker.runs.every((run) => run.z + run.depth <= 1.2 + 1e-9)).toBe(true)

    const desk = item('desk', 1.5, 0.35, 1.4, 0.7, 0.75, { name: 'Secretária' })
    const blocked = analyze(r, [wardrobe, desk])
    expect(blocked.warnings.find((w) => w.type === 'access')?.itemIds).toEqual([desk.id])
    expect(blocked.itemStatus.get(desk.id)).toBe('warning')
  })

  it('sem nenhuma zona livre com a largura mínima, avisa uma vez', () => {
    const result = analyze(room(1, 1), [item('plant', 0.5, 0.5, 0.3, 0.3, 1.2, { category: 'decor' })])
    expect(types(result)).toEqual(['no-circulation'])
  })

  it('erros têm prioridade sobre avisos no estado de cada móvel', () => {
    const sofa = item('sofa', 4.8, 0.85, 2, 0.9)
    const result = analyze(room(), [sofa])
    expect(result.itemStatus.get(sofa.id)).toBe('error')
    expect(result.issues[0].severity).toBe('error')
  })
})

describe('describeLocation', () => {
  it('descreve a zona da divisão em linguagem simples', () => {
    const r = room(6, 3)
    expect(describeLocation({ x: 0.5, z: 0.5 }, r)).toBe('junto ao canto superior esquerdo')
    expect(describeLocation({ x: 3, z: 2.8 }, r)).toBe('junto à parede inferior')
    expect(describeLocation({ x: 5.5, z: 1.5 }, r)).toBe('junto à parede direita')
    expect(describeLocation({ x: 3, z: 1.5 }, r)).toBe('no centro da divisão')
  })
})
