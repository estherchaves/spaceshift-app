import { worldToScreen } from '@/core/coordinates/viewport.js'
import { doorLeafEnd, doorSwingPolygon, openingLabels, openingSegment, WALL_LABELS } from '@/core/model'
import { add, scale } from '@/core/geometry/vec2.js'
import { formatCentimetres } from '@/core/units/units.js'

/*
 * Portas e janelas na planta, como nos desenhos de arquitetura: a porta
 * abre um vão na parede e mostra a folha aberta a 90° e o arco que varre;
 * a janela é um vão com duas linhas (o vidro). As cores vão em atributos
 * para o desenho continuar certo fora da página (miniaturas, PNG, ficha).
 * Com `onSelect`, cada abertura recebe cliques e o foco do teclado.
 */

const COLORS = { gap: '#f7f6f3', wall: '#2b2d31', leaf: '#2b2d31', arc: '#6b6d70', glass: '#5b7a8c', glassFill: '#e9f0f4' }

const pointsAttr = (points, viewport) =>
  points
    .map((p) => worldToScreen(viewport, p))
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')

export function OpeningsLayer({ room, viewport, selectedId = null, onSelect = null }) {
  const openings = room.openings ?? []
  if (openings.length === 0) return null
  const labels = openingLabels(openings)
  return (
    <g className="plan-openings">
      {openings.map((opening) => (
        <Opening
          key={opening.id}
          room={room}
          opening={opening}
          viewport={viewport}
          label={labels.get(opening.id)}
          selected={opening.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </g>
  )
}

function Opening({ room, opening, viewport, label, selected, onSelect }) {
  const seg = openingSegment(room, opening)
  const t = room.wallThickness
  const outward = scale(seg.inward, -t)
  const gap = [seg.from, seg.to, add(seg.to, outward), add(seg.from, outward)]
  const isDoor = opening.type === 'door'
  const swing = isDoor ? doorSwingPolygon(room, opening) : null
  const interactive = Boolean(onSelect)
  const description = `${label} na parede ${WALL_LABELS[opening.wall]}, ${formatCentimetres(opening.width)}`

  return (
    <g
      className="plan-opening"
      data-opening-id={interactive ? opening.id : undefined}
      data-type={opening.type}
      data-selected={selected || undefined}
      {...(interactive
        ? {
            tabIndex: 0,
            role: 'button',
            'aria-pressed': selected,
            'aria-label': description,
            onFocus: () => onSelect(opening.id),
            onKeyDown: (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect(opening.id)
              }
            },
          }
        : {})}
    >
      {swing && <polygon className="plan-opening__swing" points={pointsAttr(swing, viewport)} fill="rgb(43 45 49 / 0.04)" stroke="none" />}
      <polygon className="plan-opening__gap" points={pointsAttr(gap, viewport)} fill={isDoor ? COLORS.gap : COLORS.glassFill} stroke={COLORS.wall} strokeWidth={1} />
      {isDoor ? <DoorLeaf room={room} door={opening} seg={seg} viewport={viewport} /> : <WindowGlass seg={seg} t={t} viewport={viewport} />}
      <polygon className="plan-opening__outline" points={pointsAttr(gap, viewport)} fill="none" stroke="none" />
    </g>
  )
}

function DoorLeaf({ room, door, seg, viewport }) {
  const { hinge, end } = doorLeafEnd(room, door)
  const jamb = door.hinge === 'end' ? seg.from : seg.to
  const h = worldToScreen(viewport, hinge)
  const e = worldToScreen(viewport, end)
  const j = worldToScreen(viewport, jamb)
  const r = door.width * viewport.scale
  // Ecrã com y para baixo: produto vetorial positivo = sentido dos ponteiros do relógio.
  const cross = (e.x - h.x) * (j.y - h.y) - (e.y - h.y) * (j.x - h.x)
  return (
    <g>
      <path
        className="plan-opening__arc"
        d={`M${e.x.toFixed(1)},${e.y.toFixed(1)} A${r.toFixed(1)},${r.toFixed(1)} 0 0 ${cross > 0 ? 1 : 0} ${j.x.toFixed(1)},${j.y.toFixed(1)}`}
        fill="none"
        stroke={COLORS.arc}
        strokeWidth={1}
        strokeDasharray="4 3"
      />
      <line className="plan-opening__leaf" x1={h.x} y1={h.y} x2={e.x} y2={e.y} stroke={COLORS.leaf} strokeWidth={2} strokeLinecap="round" />
    </g>
  )
}

function WindowGlass({ seg, t, viewport }) {
  const lines = [1 / 3, 2 / 3].map((f) => {
    const shift = scale(seg.inward, -t * f)
    return [worldToScreen(viewport, add(seg.from, shift)), worldToScreen(viewport, add(seg.to, shift))]
  })
  return (
    <g>
      {lines.map(([a, b], i) => (
        <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={COLORS.glass} strokeWidth={1.25} />
      ))}
    </g>
  )
}
