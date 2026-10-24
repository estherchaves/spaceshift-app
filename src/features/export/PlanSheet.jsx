import { analyzeLayout, scoreLayout } from '@/core/analysis'
import { ROOM_TYPES } from '@/core/model'
import { formatArea, formatCentimetres, formatLength } from '@/core/units/units.js'
import { getItemPrice, getItemProfile } from '@/data/catalog/furniture.js'
import { StaticPlan } from '@/features/editor2d/StaticPlan.jsx'
import { SHEET } from './sheetLayout.js'

/*
 * Folha exportada como imagem: planta à escala com cotas e barra de
 * escala, resumo da disposição e lista de móveis com medidas. É um SVG
 * autónomo (cores em atributos, estilos dos símbolos embutidos).
 */

const FONT = "'Inter Variable', 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
const INK = '#1d1f22'
const MUTED = '#64666a'
const SUBTLE = '#8c8d90'
const LINE = '#e2e0da'
const MAX_ROWS = 16

const euros = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const dateFormat = new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })

/** `date` vem de fora: a folha é pura e o mesmo projeto dá sempre a mesma imagem. */
export function PlanSheet({ project, layout, styles = '', date }) {
  const { room, settings } = project
  const items = layout.items
  const analysis = analyzeLayout(room, items, settings, { getProfile: getItemProfile })
  const { metrics } = scoreLayout(room, items, analysis, { getProfile: getItemProfile, getPrice: getItemPrice })
  const errorRegions = analysis.errors.flatMap((issue) => (issue.marker?.kind === 'region' && issue.type !== 'ceiling' ? issue.marker.polygons : []))

  const { width, height, margin, sidebar } = SHEET
  const planBox = { x: margin, y: 150, width: width - sidebar - margin * 2, height: height - 150 - margin }
  const sideX = width - sidebar
  const subtitle = `${layout.name} · ${ROOM_TYPES[room.type]?.label ?? 'Divisão'} · ${dateFormat.format(date)}`
  const rows = items.slice(0, MAX_ROWS)

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`} fontFamily={FONT}>
      <style>{styles}</style>
      <rect width={width} height={height} fill="#ffffff" />
      <rect x={planBox.x - 16} y={planBox.y - 16} width={planBox.width + 32} height={planBox.height + 16} rx={12} fill="#f3f2ef" />

      {/* Cabeçalho */}
      <g transform={`translate(${margin} ${margin})`}>
        <rect width={28} height={28} rx={6.5} fill="#26282c" />
        <rect x={5.5} y={5.5} width={17} height={17} rx={1.5} fill="none" stroke="#f6f5f2" strokeWidth={1.6} opacity={0.55} />
        <rect x={10} y={10} width={9.5} height={9.5} rx={1.2} fill="#a27c4f" />
        <text x={40} y={20} fontSize={17} fontWeight={600} fill={INK} letterSpacing="-0.2">
          Space<tspan fill="#a27c4f">Shift</tspan>
        </text>
      </g>
      <text x={margin} y={118} fontSize={30} fontWeight={600} fill={INK} letterSpacing="-0.5">
        {project.name}
      </text>
      <text x={width - margin} y={118} fontSize={15} fill={MUTED} textAnchor="end">
        {subtitle}
      </text>

      {/* Planta */}
      <g transform={`translate(${planBox.x} ${planBox.y})`}>
        <StaticPlan room={room} items={items} width={planBox.width} height={planBox.height} padding={70} errorRegions={errorRegions}>
          {(viewport) => <PlanAnnotations room={room} viewport={viewport} height={planBox.height} />}
        </StaticPlan>
      </g>

      {/* Resumo */}
      <g transform={`translate(${sideX} ${planBox.y})`}>
        <SectionTitle y={0}>Resumo</SectionTitle>
        {[
          ['Divisão', `${formatLength(room.width)} × ${formatLength(room.depth)}`],
          ['Área', formatArea(metrics.roomArea)],
          ['Área livre', `${formatArea(metrics.freeArea)} (${Math.round(metrics.freeRatio * 100)}%)`],
          ['Passagem mínima', formatCentimetres(settings.circulationMin)],
          ['Análise', problemsLabel(metrics)],
          ['Custo indicativo', metrics.itemCount ? euros.format(metrics.cost) : '—'],
        ].map(([label, value], i) => (
          <g key={label} transform={`translate(0 ${36 + i * 30})`}>
            <text fontSize={14} fill={MUTED}>
              {label}
            </text>
            <text x={sidebar - margin} fontSize={14} fill={INK} fontWeight={500} textAnchor="end">
              {value}
            </text>
          </g>
        ))}

        <SectionTitle y={250}>{`Móveis (${items.length})`}</SectionTitle>
        {rows.map((item, i) => (
          <g key={item.id} transform={`translate(0 ${286 + i * 27})`}>
            <rect y={-10} width={10} height={10} rx={2} fill={item.color} stroke="rgba(0,0,0,0.15)" />
            <text x={20} fontSize={13} fill={INK}>
              {truncate(item.name, 30)}
            </text>
            <text x={sidebar - margin} fontSize={13} fill={MUTED} textAnchor="end">
              {formatCentimetres(item.dimensions.width).replace(' cm', '')} × {formatCentimetres(item.dimensions.depth)}
            </text>
          </g>
        ))}
        {items.length > MAX_ROWS && (
          <text y={286 + MAX_ROWS * 27} fontSize={13} fill={SUBTLE}>
            e mais {items.length - MAX_ROWS}…
          </text>
        )}
        {items.length === 0 && (
          <text y={286} fontSize={13} fill={SUBTLE}>
            Sem móveis nesta disposição.
          </text>
        )}
      </g>

      <text x={width - margin} y={height - 24} fontSize={11} fill={SUBTLE} textAnchor="end">
        Medidas interiores em metros. As folgas são orientações de conforto, não verificação de conformidade legal.
      </text>
    </svg>
  )
}

function SectionTitle({ y, children }) {
  return (
    <g transform={`translate(0 ${y})`}>
      <text fontSize={12} fontWeight={600} fill={SUBTLE} letterSpacing="1.2">
        {String(children).toUpperCase()}
      </text>
      <line x1={0} x2={SHEET.sidebar - SHEET.margin} y1={12} y2={12} stroke={LINE} />
    </g>
  )
}

/** Cotas da divisão e barra de escala, por fora das paredes. */
function PlanAnnotations({ room, viewport, height }) {
  const t = room.wallThickness
  const x0 = viewport.offsetX
  const x1 = viewport.offsetX + room.width * viewport.scale
  const y0 = viewport.offsetY
  const y1 = viewport.offsetY + room.depth * viewport.scale
  const top = viewport.offsetY - t * viewport.scale - 26
  const left = viewport.offsetX - t * viewport.scale - 26
  const bar = [0.5, 1, 2, 5].find((m) => m * viewport.scale >= 80) ?? 5
  const tick = 6
  return (
    <g stroke={MUTED} fill={MUTED} fontSize={14}>
      <line x1={x0} x2={x1} y1={top} y2={top} />
      <line x1={x0 - tick} x2={x0 + tick} y1={top + tick} y2={top - tick} />
      <line x1={x1 - tick} x2={x1 + tick} y1={top + tick} y2={top - tick} />
      <text x={(x0 + x1) / 2} y={top - 9} textAnchor="middle" stroke="none" fill={INK} fontWeight={500}>
        {formatLength(room.width)}
      </text>
      <line x1={left} x2={left} y1={y0} y2={y1} />
      <line x1={left - tick} x2={left + tick} y1={y0 + tick} y2={y0 - tick} />
      <line x1={left - tick} x2={left + tick} y1={y1 + tick} y2={y1 - tick} />
      <text
        x={left - 9}
        y={(y0 + y1) / 2}
        textAnchor="middle"
        stroke="none"
        fill={INK}
        fontWeight={500}
        transform={`rotate(-90 ${left - 9} ${(y0 + y1) / 2})`}
      >
        {formatLength(room.depth)}
      </text>
      <g transform={`translate(24 ${height - 26})`} stroke="none">
        <rect width={bar * viewport.scale} height={4} fill="#26282c" />
        <rect width={(bar * viewport.scale) / 2} height={4} fill="#a27c4f" />
        <text x={bar * viewport.scale + 8} y={5} fontSize={12} fill={MUTED}>
          {formatLength(bar).replace(',00', '')}
        </text>
      </g>
    </g>
  )
}

function problemsLabel({ errors, warnings }) {
  if (!errors && !warnings) return 'Sem problemas'
  const parts = []
  if (errors) parts.push(`${errors} ${errors === 1 ? 'erro' : 'erros'}`)
  if (warnings) parts.push(`${warnings} ${warnings === 1 ? 'aviso' : 'avisos'}`)
  return parts.join(' · ')
}

function truncate(text, max) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}
