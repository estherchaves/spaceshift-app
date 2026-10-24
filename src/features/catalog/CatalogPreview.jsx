import { PlanSymbol } from '@/features/editor2d/symbols/PlanSymbol.jsx'

const BOX = 44 // px
const PADDING = 5
const MAX_SCALE = 30 // px/m: evita que objetos pequenos (candeeiros) pareçam enormes

/**
 * Pré-visualização do móvel no catálogo, com o mesmo símbolo que aparece
 * na planta. As proporções são as reais; a escala é ajustada ao cartão.
 */
export function CatalogPreview({ entry }) {
  const { width, depth } = entry.dimensions
  const scale = Math.min((BOX - PADDING * 2) / Math.max(width, depth), MAX_SCALE)
  return (
    <svg className="catalog-preview" width={BOX} height={BOX} viewBox={`${-BOX / 2} ${-BOX / 2} ${BOX} ${BOX}`} aria-hidden="true">
      <PlanSymbol kind={entry.plan2d} w={width * scale} h={depth * scale} widthM={width} color={entry.color} />
    </svg>
  )
}
