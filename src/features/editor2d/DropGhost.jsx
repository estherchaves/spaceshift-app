import { getFootprint } from '@/core/geometry'
import { worldToScreen } from '@/core/coordinates/viewport.js'

/** Pré-visualização do móvel a ser arrastado do catálogo para a planta. */
export function DropGhost({ entry, position, viewport }) {
  const points = getFootprint({ position, dimensions: entry.dimensions, rotation: 0 })
    .map((p) => worldToScreen(viewport, p))
    .map((p) => `${p.x},${p.y}`)
    .join(' ')
  return <polygon className="plan-drop-ghost" points={points} style={{ '--item-color': entry.color }} />
}
