import { FURNITURE_CATEGORIES } from '@/core/model'
import { CATEGORY_ICONS } from './categoryIcons.js'

const price = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const cm = (m) => Math.round(m * 100)

/**
 * Cartão de um móvel do catálogo. Nesta fase é informativo; na Fase 3
 * passa a poder ser arrastado ou adicionado à planta.
 */
export function CatalogCard({ entry }) {
  const Icon = CATEGORY_ICONS[entry.category]
  const { width, depth, height } = entry.dimensions
  return (
    <article className="catalog-card" aria-label={entry.name}>
      <span className="catalog-card__preview" style={{ '--item-color': entry.color }} aria-hidden="true">
        <Icon size={20} strokeWidth={1.5} />
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
    </article>
  )
}
