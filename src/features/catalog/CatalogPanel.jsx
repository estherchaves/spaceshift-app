import { ClipboardPaste, SearchX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SidePanel } from '@/components/layout'
import { Button, EmptyState, SearchField } from '@/components/ui'
import { FURNITURE_CATEGORIES } from '@/core/model'
import { CatalogCard } from './CatalogCard.jsx'
import { CATEGORY_ICONS } from './categoryIcons.js'
import { FURNITURE_CATALOG } from '@/data/catalog/furniture.js'
import { filterCatalog } from './filterCatalog.js'
import { PasteProductDialog } from './PasteProductDialog.jsx'
import './CatalogPanel.css'

const CATEGORY_FILTERS = [
  { value: 'all', label: 'Todos' },
  ...Object.entries(FURNITURE_CATEGORIES).map(([value, { label }]) => ({ value, label })),
]

export function CatalogPanel() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [pasteOpen, setPasteOpen] = useState(false)
  const results = useMemo(
    () => filterCatalog(FURNITURE_CATALOG, { query, category, categories: FURNITURE_CATEGORIES }),
    [query, category],
  )
  const resultsLabel = `${results.length} ${results.length === 1 ? 'móvel' : 'móveis'}`

  return (
    <SidePanel
      title="Catálogo"
      label="Catálogo de móveis"
      meta={resultsLabel}
      toolbar={
        <>
          <SearchField label="Pesquisar móveis" placeholder="Pesquisar móveis" value={query} onChange={setQuery} />
          <Button size="sm" icon={ClipboardPaste} className="catalog-paste" onClick={() => setPasteOpen(true)}>
            Medidas de uma loja
          </Button>
          <div className="category-filters" role="group" aria-label="Filtrar por categoria">
            {CATEGORY_FILTERS.map((filter) => {
              const Icon = CATEGORY_ICONS[filter.value]
              return (
                <button
                  key={filter.value}
                  type="button"
                  className="category-chip"
                  aria-pressed={category === filter.value}
                  onClick={() => setCategory(filter.value)}
                >
                  <Icon size={13} strokeWidth={1.75} aria-hidden="true" />
                  {filter.label}
                </button>
              )
            })}
          </div>
        </>
      }
    >
      {pasteOpen && <PasteProductDialog open onClose={() => setPasteOpen(false)} />}
      <p className="visually-hidden" role="status">
        {resultsLabel}
      </p>
      {results.length > 0 ? (
        <ul className="catalog-list">
          {results.map((entry) => (
            <li key={entry.id}>
              <CatalogCard entry={entry} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={SearchX}
          title="Nenhum móvel encontrado"
          action={
            <Button
              size="sm"
              onClick={() => {
                setQuery('')
                setCategory('all')
              }}
            >
              Limpar filtros
            </Button>
          }
        >
          Experimente outro termo ou escolha outra categoria.
        </EmptyState>
      )}
    </SidePanel>
  )
}
