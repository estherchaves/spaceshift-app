import { Route, X } from 'lucide-react'
import { IconButton } from '@/components/ui'
import { formatCentimetres, formatLength } from '@/core/units/units.js'
import { toScreen } from './planGeometry.js'

/*
 * Percurso a pé: o caminho mais natural entre dois pontos marcados na
 * planta, com o comprimento e a passagem mais estreita. Segue os móveis
 * em tempo real (também durante um arrasto). Com um perfil de
 * acessibilidade, quem passa é a cadeira de rodas ou o carrinho.
 */

export function WalkLayer({ points, path, viewport }) {
  if (points.length === 0) return null
  const s = (p) => toScreen(viewport, p.x, p.z)
  const line = path?.ok ? path.points.map(s) : null
  const narrow = path?.ok ? path.narrowest : null
  const tight = narrow && narrow.width < path.passage - 0.005
  return (
    <g className="plan-walk" data-testid="walk-layer" aria-hidden="true">
      {line && <polyline className="plan-walk__path" points={line.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} />}
      {narrow && <Narrowest narrow={narrow} tight={tight} viewport={viewport} />}
      {points.map((p, i) => {
        const c = s(path?.ok ? (i === 0 ? path.points[0] : path.points.at(-1)) : p)
        return (
          <g key={i} className="plan-walk__marker" transform={`translate(${c.x.toFixed(1)} ${c.y.toFixed(1)})`}>
            <circle r={10} />
            <text dy="0.35em" textAnchor="middle">
              {i === 0 ? 'A' : 'B'}
            </text>
          </g>
        )
      })}
    </g>
  )
}

function Narrowest({ narrow, tight, viewport }) {
  const a = toScreen(viewport, narrow.from.x, narrow.from.z)
  const b = toScreen(viewport, narrow.to.x, narrow.to.z)
  const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  const label = formatCentimetres(narrow.width)
  const w = label.length * 7 + 12
  return (
    <g className="plan-walk__narrow" data-tight={tight || undefined} data-testid="walk-narrowest">
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
      <circle cx={a.x} cy={a.y} r={2.5} />
      <circle cx={b.x} cy={b.y} r={2.5} />
      <g transform={`translate(${m.x.toFixed(1)} ${m.y.toFixed(1)})`}>
        <rect x={-w / 2} y={-10} width={w} height={20} rx={10} />
        <text dy="0.35em" textAnchor="middle">
          {label}
        </text>
      </g>
    </g>
  )
}

/** Faixa por cima da planta com as instruções e o resultado. */
export function WalkPanel({ points, path, onClose }) {
  let text
  let state = 'info'
  if (points.length === 0) text = 'Clique na planta para marcar o ponto de partida (A).'
  else if (points.length === 1) text = 'Agora clique no destino (B).'
  else if (!path.ok) {
    state = 'fail'
    text = `Não há caminho de A até B com pelo menos ${formatCentimetres(path.body)} de largura.`
  } else {
    const narrow = path.narrowest
    const tight = narrow && narrow.width < path.passage - 0.005
    state = tight ? 'warn' : 'ok'
    text = `${formatLength(path.length)} a pé${narrow ? ` · passagem mais estreita: ${formatCentimetres(narrow.width)}` : ''}${
      tight ? ` (abaixo dos ${formatCentimetres(path.passage)} recomendados)` : ''
    }`
  }
  return (
    <div className="plan-walk-panel" data-state={state} role="status">
      <Route size={16} strokeWidth={1.75} aria-hidden="true" />
      <span>
        <strong>Percurso a pé.</strong> {text}
      </span>
      <IconButton icon={X} size="sm" label="Fechar percurso" shortcut="Esc" tooltipAlign="end" onClick={onClose} />
    </div>
  )
}
