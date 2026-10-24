import { Plus } from 'lucide-react'
import { IconButton } from '@/components/ui'
import { FURNITURE_CATEGORIES } from '@/core/model'
import { addCatalogItem } from '@/store/commands.js'
import { useEditorStore } from '@/store/editorStore.js'
import { CATALOG_DRAG_TYPE } from '@/features/editor2d/PlanView.jsx'
import { CatalogPreview } from './CatalogPreview.jsx'

const price = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const cm = (m) => Math.round(m * 100)

/**
 * Cartão de um móvel do catálogo. Pode ser arrastado para a planta
 * (posição exata) ou adicionado com o botão + (procura um espaço livre
 * perto do centro). Em ambos os casos o móvel fica selecionado.
 */
export function CatalogCard({ entry }) {
  const setCatalogDrag = useEditorStore((state) => state.setCatalogDrag)
  const { width, depth, height } = entry.dimensions

  return (
    <article
      className="catalog-card"
      aria-label={entry.name}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData(CATALOG_DRAG_TYPE, entry.id)
        event.dataTransfer.setData('text/plain', entry.name)
        event.dataTransfer.effectAllowed = 'copy'
        setCatalogDrag(entry.id)
      }}
      onDragEnd={() => setCatalogDrag(null)}
    >
      <span className="catalog-card__preview" aria-hidden="true">
        <CatalogPreview entry={entry} />
      </span>
      <span className="catalog-card__body">
        <span className="catalog-card__name">{entry.name}</span>
        <span className="catalog-card__dims" title="Comprimento × largura × altura">
          {cm(width)} × {cm(depth)} × {cm(height)} cm
        </span>
        <span className="catalog-card__meta">
          <span>{FURNITURE_CATEGORIES[entry.category].label}</span>
          {entry.price != null && <span className="catalog-card__price">{price.format(entry.price)}</span>}
        </span>
      </span>
      <IconButton
        icon={Plus}
        label={`Adicionar ${entry.name}`}
        size="sm"
        tooltipPlacement="top"
        tooltipAlign="end"
        className="catalog-card__add"
        onClick={() => addCatalogItem(entry.id)}
      />
    </article>
  )
}
