import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FURNITURE_CATALOG } from '@/data/catalog/furniture.js'
import { PlanSymbol } from './PlanSymbol.jsx'

function draw(props) {
  const { container } = render(
    <svg>
      <PlanSymbol {...props} />
    </svg>,
  )
  return container.querySelector('.plan-symbol')
}

const attributesOf = (root) =>
  [...root.querySelectorAll('*')].flatMap((el) => [...el.attributes].map((a) => `${el.tagName}.${a.name}=${a.value}`))

describe('símbolos de planta', () => {
  it.each(FURNITURE_CATALOG.map((e) => [e.id, e]))('%s tem um desenho próprio e válido', (_id, entry) => {
    const scale = 80 // px/m
    const symbol = draw({
      kind: entry.plan2d,
      w: entry.dimensions.width * scale,
      h: entry.dimensions.depth * scale,
      widthM: entry.dimensions.width,
      color: entry.color,
    })
    expect(symbol).toHaveAttribute('data-kind', entry.plan2d)
    // Mais do que um retângulo simples: o símbolo tem detalhe reconhecível.
    expect(symbol.querySelectorAll('rect, path, ellipse, circle, line').length).toBeGreaterThan(1)
    const attrs = attributesOf(symbol)
    expect(attrs.filter((a) => /NaN|Infinity/.test(a))).toEqual([])
    expect(attrs.filter((a) => /\.(width|height|rx|ry|r)=-/.test(a))).toEqual([])
  })

  it('continua válido com tamanhos muito pequenos (zoom afastado)', () => {
    const invalid = {}
    for (const kind of new Set(FURNITURE_CATALOG.map((e) => e.plan2d))) {
      const attrs = attributesOf(draw({ kind, w: 2, h: 1.5, widthM: 0.5, color: '#888888' }))
      const bad = attrs.filter((a) => /NaN|Infinity|\.(width|height|rx|ry|r)=-/.test(a))
      if (bad.length) invalid[kind] = bad
    }
    expect(invalid).toEqual({})
  })

  it('o número de almofadas do sofá acompanha o comprimento real', () => {
    const dividers = (widthM) =>
      draw({ kind: 'sofa', w: widthM * 50, h: 45, widthM, color: '#999999' }).querySelectorAll('line').length
    expect(dividers(2.8)).toBeGreaterThan(dividers(1.4))
  })

  it('tipos desconhecidos usam um retângulo simples', () => {
    const symbol = draw({ kind: 'nave', w: 40, h: 20, widthM: 1, color: '#999999' })
    expect(symbol.querySelectorAll('rect')).toHaveLength(1)
  })
})
