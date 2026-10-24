import { memo } from 'react'
import { worldToScreen } from '@/core/coordinates/viewport.js'
import { formatCentimetres } from '@/core/units/units.js'
import { readableAngle } from './planGeometry.js'

const CHAR_WIDTH = 6.2 // largura média (px) de um carácter a 10,5 px

/**
 * Um móvel na planta. É desenhado no seu referencial local (centro na
 * origem) e depois transladado e rodado, por isso o retângulo nunca é
 * deformado pela rotação. Nesta fase é um retângulo com o nome; os
 * símbolos de planta de cada tipo chegam na Fase 4.
 */
export const PlanItem = memo(function PlanItem({ item, viewport, selected, conflict, onSelect }) {
  const c = worldToScreen(viewport, item.position)
  const w = item.dimensions.width * viewport.scale
  const h = item.dimensions.depth * viewport.scale
  const showLabel = w > Math.min(item.name.length * CHAR_WIDTH + 12, 140) && h > 20
  const label = w > item.name.length * CHAR_WIDTH + 12 ? item.name : null
  const size = `${formatCentimetres(item.dimensions.width)} × ${formatCentimetres(item.dimensions.depth)}`

  return (
    <g
      className="plan-item"
      data-item-id={item.id}
      data-selected={selected || undefined}
      data-conflict={conflict || undefined}
      data-locked={item.locked || undefined}
      transform={`translate(${c.x} ${c.y}) rotate(${item.rotation})`}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
      aria-label={`${item.name}, ${size}${conflict ? ', em conflito' : ''}`}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(item.id)
        }
      }}
      onFocus={() => onSelect(item.id)}
    >
      <rect className="plan-item__body" x={-w / 2} y={-h / 2} width={w} height={h} rx={Math.min(3, w / 8)} style={{ '--item-color': item.color }} />
      {/* Linha "frontal": indica para onde o móvel está virado (lado +Z local). */}
      <line className="plan-item__front" x1={-w / 2 + 3} x2={w / 2 - 3} y1={h / 2 - 3} y2={h / 2 - 3} />
      {showLabel && label && (
        <text className="plan-item__label" textAnchor="middle" dominantBaseline="central" transform={`rotate(${readableAngle(item.rotation)})`}>
          {label}
        </text>
      )}
    </g>
  )
})
