import { useMemo } from 'react'
import { ROOM_TYPES } from '@/core/model'
import { getFootprint } from '@/core/geometry'
import { formatLength } from '@/core/units/units.js'
import { useElementSize } from '@/hooks/useElementSize.js'
import { selectActiveItems, selectRoom, selectSettings } from '@/store/selectors.js'
import { useProjectStore } from '@/store/projectStore.js'
import { fitRoom, gridLines, scaleBarLength, toScreen } from './planGeometry.js'
import './PlanView.css'

/**
 * Planta 2D à escala, desenhada em SVG a partir do modelo (metros).
 * O enquadramento é recalculado quando a janela ou a divisão mudam, por
 * isso as proporções são sempre as reais. Zoom, deslocação e manipulação
 * de móveis são adicionados na Fase 3.
 */
export function PlanView() {
  const [containerRef, size] = useElementSize()
  const room = useProjectStore(selectRoom)
  const settings = useProjectStore(selectSettings)
  const items = useProjectStore(selectActiveItems)

  const ready = size.width > 0 && size.height > 0
  const viewport = useMemo(() => (ready ? fitRoom(room, size) : null), [ready, room, size])

  return (
    <div ref={containerRef} className="plan-view">
      {viewport && <PlanSvg room={room} settings={settings} items={items} viewport={viewport} size={size} />}
    </div>
  )
}

function PlanSvg({ room, settings, items, viewport, size }) {
  const { scale } = viewport
  const t = room.wallThickness
  const inner = { a: toScreen(viewport, 0, 0), b: toScreen(viewport, room.width, room.depth) }
  const outer = { a: toScreen(viewport, -t, -t), b: toScreen(viewport, room.width + t, room.depth + t) }
  const lines = gridLines(room, settings.gridSize, scale)
  const barMetres = scaleBarLength(scale)
  const label = `Planta da divisão: ${ROOM_TYPES[room.type].label}, ${formatLength(room.width)} por ${formatLength(room.depth)}`

  return (
    <svg
      className="plan-svg"
      width={size.width}
      height={size.height}
      viewBox={`0 0 ${size.width} ${size.height}`}
      role="img"
      aria-label={label}
      data-scale={scale.toFixed(3)}
    >
      {/* Chão */}
      <rect
        className="plan-floor-base"
        x={inner.a.x}
        y={inner.a.y}
        width={inner.b.x - inner.a.x}
        height={inner.b.y - inner.a.y}
      />
      <rect
        data-testid="plan-floor"
        x={inner.a.x}
        y={inner.a.y}
        width={inner.b.x - inner.a.x}
        height={inner.b.y - inner.a.y}
        fill={room.floorColor}
        opacity={0.28}
      />

      {/* Grelha */}
      <g className="plan-grid" aria-hidden="true">
        {lines.map((line) => {
          const p = line.axis === 'x' ? toScreen(viewport, line.value, 0) : toScreen(viewport, 0, line.value)
          return line.axis === 'x' ? (
            <line key={`x${line.value}`} data-major={line.major || undefined} x1={p.x} x2={p.x} y1={inner.a.y} y2={inner.b.y} />
          ) : (
            <line key={`z${line.value}`} data-major={line.major || undefined} x1={inner.a.x} x2={inner.b.x} y1={p.y} y2={p.y} />
          )
        })}
      </g>

      {/* Móveis (representação simples; símbolos detalhados na Fase 4) */}
      <g className="plan-items">
        {items.map((item) => {
          const points = getFootprint(item)
            .map((corner) => toScreen(viewport, corner.x, corner.z))
            .map((p) => `${p.x},${p.y}`)
            .join(' ')
          return <polygon key={item.id} points={points} fill={item.color} />
        })}
      </g>

      {/* Paredes: retângulo exterior menos o interior */}
      <path
        className="plan-walls"
        fillRule="evenodd"
        d={`M${outer.a.x},${outer.a.y}H${outer.b.x}V${outer.b.y}H${outer.a.x}Z M${inner.a.x},${inner.a.y}V${inner.b.y}H${inner.b.x}V${inner.a.y}Z`}
      />

      {/* Cotas interiores */}
      <Dimension
        orientation="horizontal"
        from={inner.a.x}
        to={inner.b.x}
        at={outer.a.y - 22}
        label={formatLength(room.width)}
        name="Comprimento"
      />
      <Dimension
        orientation="vertical"
        from={inner.a.y}
        to={inner.b.y}
        at={outer.a.x - 22}
        label={formatLength(room.depth)}
        name="Largura"
      />

      {/* Barra de escala */}
      <g className="plan-scale" transform={`translate(20 ${size.height - 22})`} aria-hidden="true">
        <rect x={0} y={-3} width={barMetres * scale} height={3} />
        <rect x={0} y={-3} width={(barMetres * scale) / 2} height={3} className="plan-scale__half" />
        <text x={barMetres * scale + 6} y={0}>
          {formatLength(barMetres).replace(',00', '')}
        </text>
      </g>
    </svg>
  )
}

const TICK = 5

function Dimension({ orientation, from, to, at, label, name }) {
  const mid = (from + to) / 2
  if (orientation === 'horizontal') {
    return (
      <g className="plan-dimension" data-testid={`dimension-${name}`}>
        <line x1={from} x2={to} y1={at} y2={at} />
        <line x1={from - TICK} x2={from + TICK} y1={at + TICK} y2={at - TICK} className="plan-dimension__tick" />
        <line x1={to - TICK} x2={to + TICK} y1={at + TICK} y2={at - TICK} className="plan-dimension__tick" />
        <text x={mid} y={at - 7} textAnchor="middle">
          {label}
        </text>
      </g>
    )
  }
  return (
    <g className="plan-dimension" data-testid={`dimension-${name}`}>
      <line x1={at} x2={at} y1={from} y2={to} />
      <line x1={at - TICK} x2={at + TICK} y1={from + TICK} y2={from - TICK} className="plan-dimension__tick" />
      <line x1={at - TICK} x2={at + TICK} y1={to + TICK} y2={to - TICK} className="plan-dimension__tick" />
      <text x={at - 7} y={mid} textAnchor="middle" transform={`rotate(-90 ${at - 7} ${mid})`}>
        {label}
      </text>
    </g>
  )
}
