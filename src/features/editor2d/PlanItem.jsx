import { memo } from 'react'
import { worldToScreen } from '@/core/coordinates/viewport.js'
import { getLocalOutline } from '@/core/geometry/shapes.js'
import { formatCentimetres } from '@/core/units/units.js'
import { getCatalogEntry } from '@/data/catalog/furniture.js'
import { PlanSymbol } from './symbols/PlanSymbol.jsx'

/**
 * Um móvel na planta: símbolo de planta do seu tipo, desenhado no
 * referencial local (centro na origem) e depois transladado e rodado,
 * para que a rotação nunca deforme o desenho.
 * `plan-item__body` (por baixo) é a pegada real e recebe os cliques (um
 * canto vazio do sofá de canto ou da mesa redonda não seleciona o móvel);
 * `plan-item__outline` (por cima) segue a forma real (retângulo, elipse ou
 * L) e mostra o estado da análise (erro ou aviso) e o foco do teclado.
 */
export const PlanItem = memo(function PlanItem({ item, viewport, selected, status, shape = 'rect', onSelect }) {
  const c = worldToScreen(viewport, item.position)
  const w = item.dimensions.width * viewport.scale
  const h = item.dimensions.depth * viewport.scale
  const kind = getCatalogEntry(item.catalogId)?.plan2d ?? 'box'
  const size = `${formatCentimetres(item.dimensions.width)} × ${formatCentimetres(item.dimensions.depth)}`
  const badge = Math.min(14, Math.max(9, Math.min(w, h) * 0.4))
  const conflict = status === 'error'
  const outline = shapePath(item.dimensions, shape, viewport.scale)

  return (
    <g
      className="plan-item"
      data-item-id={item.id}
      data-kind={kind}
      data-selected={selected || undefined}
      data-conflict={conflict || undefined}
      data-warning={status === 'warning' || undefined}
      data-locked={item.locked || undefined}
      transform={`translate(${c.x} ${c.y}) rotate(${item.rotation})`}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
      aria-label={`${item.name}, ${size}${item.locked ? ', bloqueado' : ''}${conflict ? ', em conflito' : status === 'warning' ? ', com aviso' : ''}`}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(item.id)
        }
      }}
      onFocus={() => onSelect(item.id)}
    >
      <path className="plan-item__body" d={outline} />
      <PlanSymbol kind={kind} w={w} h={h} widthM={item.dimensions.width} color={item.color} />
      <path className="plan-item__outline" d={outline} />
      {item.locked && (
        // O cadeado fica sempre direito, seja qual for a rotação do móvel.
        <g className="plan-item__lock" transform={`rotate(${-item.rotation})`} data-testid="lock-badge">
          <circle r={badge / 2 + 3} />
          <g transform={`translate(${-badge / 2} ${-badge / 2})`}>
            <svg width={badge} height={badge} viewBox="0 0 24 24" aria-hidden="true">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          </g>
        </g>
      )}
    </g>
  )
})

/** Contorno da forma real no referencial local, em píxeis. */
function shapePath(dimensions, shape, scale) {
  const points = getLocalOutline(dimensions, shape)
  return points.map((p, i) => `${i ? 'L' : 'M'}${(p.x * scale).toFixed(1)},${(p.z * scale).toFixed(1)}`).join('') + 'Z'
}
