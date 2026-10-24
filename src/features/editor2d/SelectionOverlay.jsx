import { worldToScreen } from '@/core/coordinates/viewport.js'
import { availableHandles } from '@/core/editing'
import { formatCentimetres } from '@/core/units/units.js'
import { readableAngle, resizeCursor } from './planGeometry.js'

const HANDLE = 8
const ROTATE_OFFSET = 26
/**
 * Contorno, pegas e cotas do móvel selecionado. Fica numa camada acima
 * das paredes para as pegas estarem sempre acessíveis.
 */
export function SelectionOverlay({ item, viewport, bounds, interacting }) {
  const c = worldToScreen(viewport, item.position)
  const w = item.dimensions.width * viewport.scale
  const h = item.dimensions.depth * viewport.scale
  const handles = item.locked ? [] : availableHandles(bounds)
  const flip = readableAngle(item.rotation)
  const flipSide = readableAngle(item.rotation + 90)

  return (
    <g className="plan-selection" transform={`translate(${c.x} ${c.y}) rotate(${item.rotation})`} data-interacting={interacting || undefined}>
      <rect className="plan-selection__outline" x={-w / 2} y={-h / 2} width={w} height={h} />

      {/* Cotas do móvel: comprimento por baixo, largura à direita */}
      <g className="plan-selection__dim" transform={`translate(0 ${h / 2 + 14}) rotate(${flip})`}>
        <DimLabel text={formatCentimetres(item.dimensions.width)} testId="selection-width" />
      </g>
      <g className="plan-selection__dim" transform={`translate(${w / 2 + 14} 0) rotate(${90 + flipSide})`}>
        <DimLabel text={formatCentimetres(item.dimensions.depth)} testId="selection-depth" />
      </g>

      {!item.locked && (
        <>
          <line className="plan-selection__stem" x1={0} x2={0} y1={-h / 2} y2={-h / 2 - ROTATE_OFFSET} />
          <circle
            className="plan-selection__rotate"
            data-handle="rotate"
            cx={0}
            cy={-h / 2 - ROTATE_OFFSET}
            r={6.5}
            aria-label="Rodar"
          >
            <title>Rodar (Shift: rotação livre)</title>
          </circle>
        </>
      )}

      {handles.map((handle) => (
        <rect
          key={handle.id}
          className="plan-selection__handle"
          data-handle={`resize:${handle.id}`}
          data-sx={handle.sx}
          data-sz={handle.sz}
          x={(handle.sx * w) / 2 - HANDLE / 2}
          y={(handle.sz * h) / 2 - HANDLE / 2}
          width={HANDLE}
          height={HANDLE}
          style={{ cursor: resizeCursor(handle.id, item.rotation) }}
        >
          <title>Redimensionar</title>
        </rect>
      ))}
    </g>
  )
}

function DimLabel({ text, testId }) {
  const width = text.length * 6.4 + 10
  return (
    <g data-testid={testId}>
      <rect x={-width / 2} y={-8} width={width} height={16} rx={4} />
      <text textAnchor="middle" dominantBaseline="central">
        {text}
      </text>
    </g>
  )
}
