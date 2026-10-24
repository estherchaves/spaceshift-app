import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getActiveLayout } from '@/core/model'
import { createExampleProject } from '@/data/examples/exampleProject.js'
import { PrintSheet } from './PrintSheet.jsx'
import { printProjectSheet } from './printSheet.jsx'

const date = new Date(2026, 9, 24)

describe('PrintSheet', () => {
  it('mostra o resumo, a planta e a lista de móveis numerada da disposição ativa', () => {
    const project = createExampleProject()
    const layout = getActiveLayout(project)
    render(<PrintSheet project={project} layout={layout} date={date} />)
    expect(screen.getByRole('heading', { level: 1, name: project.name })).toBeInTheDocument()
    expect(screen.getByText(/24 de outubro de 2026/)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: `Planta de ${project.name}` })).toBeInTheDocument()
    const rows = within(screen.getByRole('table')).getAllByRole('row')
    // cabeçalho + um por móvel + total
    expect(rows).toHaveLength(layout.items.length + 2)
    expect(within(rows[1]).getByText(layout.items[0].name)).toBeInTheDocument()
    expect(within(rows.at(-1)).getByText(/Total indicativo/)).toBeInTheDocument()
  })

  it('sem móveis diz que a disposição está vazia', () => {
    const project = createExampleProject()
    const layout = { ...getActiveLayout(project), items: [] }
    render(<PrintSheet project={project} layout={layout} date={date} />)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByText('Sem móveis nesta disposição.')).toBeInTheDocument()
  })
})

describe('printProjectSheet', () => {
  afterEach(() => window.dispatchEvent(new Event('afterprint')))

  it('monta a ficha, imprime e remove-a quando a impressão fecha', () => {
    const print = vi.fn(() => {
      expect(document.querySelector('.print-root .print-sheet')).not.toBeNull()
    })
    printProjectSheet(createExampleProject(), { date, print })
    expect(print).toHaveBeenCalledTimes(1)
    window.dispatchEvent(new Event('afterprint'))
    expect(document.querySelector('.print-root')).toBeNull()
  })
})
