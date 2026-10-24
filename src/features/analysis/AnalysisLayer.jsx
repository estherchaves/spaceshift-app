import { worldToScreen } from '@/core/coordinates/viewport.js'
import { formatCentimetres } from '@/core/units/units.js'
import { isIssueVisible, polygonsPath, runsPath } from './markerPaths.js'
import './Analysis.css'

/*
 * Marcadores da análise na planta (SVG). Recebem geometria em metros e
 * convertem com o viewport, como o resto da planta:
 *  - region: zona exata de uma colisão ou parte fora da divisão (tracejado vermelho)
 *  - gap:    cota da passagem estreita (âmbar) com a largura medida
 *  - zone:   zona livre isolada (âmbar, translúcida)
 * O problema realçado no painel aparece mais forte e os outros esbatem.
 * Os erros veem-se sempre. Os avisos só com o painel de análise aberto ou
 * quando envolvem o móvel selecionado (por exemplo, durante um arrasto),
 * para a planta não ficar cheia de cotas enquanto se trabalha.
 */

export function AnalysisDefs() {
  return (
    <defs>
      <pattern id="hatch-error" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="6" height="6" fill="rgb(184 66 58 / 0.18)" />
        <line x1="0" y1="0" x2="0" y2="6" stroke="#b8423a" strokeWidth="2" />
      </pattern>
      <pattern id="hatch-warning" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
        <rect width="8" height="8" fill="rgb(168 112 15 / 0.1)" />
        <line x1="0" y1="0" x2="0" y2="8" stroke="#a8700f" strokeWidth="1.2" strokeOpacity="0.55" />
      </pattern>
    </defs>
  )
}

export function AnalysisLayer({ issues, viewport, focusedId, selectedId, panelOpen }) {
  const visibility = { focusedId, selectedId, panelOpen }
  return (
    <g className="analysis-layer" data-has-focus={focusedId && issues.some((i) => i.id === focusedId) ? true : undefined}>
      {issues.map((issue) => {
        const marker = issue.marker
        if (!marker || issue.type === 'access' || issue.type === 'ceiling') return null
        if (!isIssueVisible(issue, visibility)) return null
        const common = {
          'data-issue-id': issue.id,
          'data-severity': issue.severity,
          'data-focused': issue.id === focusedId || undefined,
        }
        if (marker.kind === 'region') {
          return <path key={issue.id} {...common} className="analysis-region" d={polygonsPath(viewport, marker.polygons)} />
        }
        if (marker.kind === 'zone') {
          return <path key={issue.id} {...common} className="analysis-zone" d={runsPath(viewport, marker.runs)} />
        }
        if (marker.kind === 'gap') return <GapMarker key={issue.id} {...common} marker={marker} viewport={viewport} />
        return null
      })}
    </g>
  )
}

function GapMarker({ marker, viewport, ...rest }) {
  const a = worldToScreen(viewport, marker.from)
  const b = worldToScreen(viewport, marker.to)
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
  const n = { x: -(b.y - a.y) / len, y: (b.x - a.x) / len }
  const tick = 5
  const label = formatCentimetres(marker.distance)
  const labelWidth = label.length * 6.4 + 10
  return (
    <g className="analysis-gap" {...rest}>
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
      <line x1={a.x - n.x * tick} y1={a.y - n.y * tick} x2={a.x + n.x * tick} y2={a.y + n.y * tick} />
      <line x1={b.x - n.x * tick} y1={b.y - n.y * tick} x2={b.x + n.x * tick} y2={b.y + n.y * tick} />
      <g transform={`translate(${mid.x.toFixed(1)} ${mid.y.toFixed(1)})`}>
        <rect x={-labelWidth / 2} y={-9} width={labelWidth} height={18} rx={9} />
        <text textAnchor="middle" dy="0.35em">
          {label}
        </text>
      </g>
    </g>
  )
}

/** Zona de circulação principal (onde cabe uma pessoa com a passagem mínima). */
export function CirculationLayer({ circulation, viewport }) {
  if (!circulation.runs.length) return null
  return <path className="analysis-circulation" data-testid="circulation-zone" d={runsPath(viewport, circulation.runs)} />
}
