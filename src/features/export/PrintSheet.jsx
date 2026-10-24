import { analyzeLayout, scoreLayout } from '@/core/analysis'
import { worldToScreen } from '@/core/coordinates/viewport.js'
import { ROOM_TYPES } from '@/core/model'
import { formatArea, formatCentimetres, formatLength } from '@/core/units/units.js'
import { getItemPrice, getItemProfile } from '@/data/catalog/furniture.js'
import { StaticPlan } from '@/features/editor2d/StaticPlan.jsx'
import { PlanAnnotations } from './PlanSheet.jsx'
import { problemsLabel } from './sheetLayout.js'
import './PrintSheet.css'

/*
 * Ficha do projeto para imprimir (A4 ao alto): resumo da divisão, planta
 * à escala com os móveis numerados, lista de móveis com medidas e preço
 * e os avisos da análise. É HTML normal, para o browser paginar a tabela.
 */

const PLAN = { width: 760, height: 350 }
const LABEL_GAP = 20
const euros = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const dateFormat = new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })
const cm = (metres) => formatCentimetres(metres).replace(' cm', '')

export function PrintSheet({ project, layout, date }) {
  const { room, settings } = project
  const items = layout.items
  const analysis = analyzeLayout(room, items, settings, { getProfile: getItemProfile })
  const { score, grade, metrics } = scoreLayout(room, items, analysis, { getProfile: getItemProfile, getPrice: getItemPrice })
  const issues = [...analysis.errors, ...analysis.warnings]
  const errorRegions = analysis.errors.flatMap((issue) => (issue.marker?.kind === 'region' && issue.type !== 'ceiling' ? issue.marker.polygons : []))

  return (
    <article className="print-sheet" lang="pt-PT">
      <header className="print-sheet__header">
        <p className="print-sheet__brand">
          Space<span>Shift</span>
        </p>
        <h1 className="print-sheet__title">{project.name}</h1>
        <p className="print-sheet__subtitle">
          {ROOM_TYPES[room.type]?.label ?? 'Divisão'} · disposição «{layout.name}» · {dateFormat.format(date)}
        </p>
      </header>

      <dl className="print-sheet__summary">
        <Fact label="Divisão" value={`${formatLength(room.width)} × ${formatLength(room.depth)}`} />
        <Fact label="Pé-direito" value={formatLength(room.wallHeight)} />
        <Fact label="Área" value={formatArea(metrics.roomArea)} />
        <Fact label="Área livre" value={`${formatArea(metrics.freeArea)} (${Math.round(metrics.freeRatio * 100)}%)`} />
        <Fact label="Passagem mínima" value={formatCentimetres(settings.circulationMin)} />
        <Fact label="Pontuação" value={`${score}/100 · ${grade.label}`} />
        <Fact label="Análise" value={problemsLabel(metrics)} />
        <Fact label="Custo indicativo" value={items.length ? euros.format(metrics.cost) : '—'} />
      </dl>

      <figure className="print-sheet__plan">
        <StaticPlan
          room={room}
          items={items}
          width={PLAN.width}
          height={PLAN.height}
          padding={56}
          errorRegions={errorRegions}
          title={`Planta de ${project.name}`}
        >
          {(viewport) => (
            <>
              <PlanAnnotations room={room} viewport={viewport} height={PLAN.height} />
              <ItemNumbers items={items} viewport={viewport} />
            </>
          )}
        </StaticPlan>
        <figcaption>Planta à escala vista de cima. Os números correspondem à lista de móveis.</figcaption>
      </figure>

      <section className="print-sheet__section">
        <h2>Móveis ({items.length})</h2>
        {items.length === 0 ? (
          <p className="print-sheet__empty">Sem móveis nesta disposição.</p>
        ) : (
          <table className="print-sheet__table">
            <thead>
              <tr>
                <th scope="col">N.º</th>
                <th scope="col">Móvel</th>
                <th scope="col" className="num">
                  Comp. × larg. × alt. (cm)
                </th>
                <th scope="col" className="num">
                  Rotação
                </th>
                <th scope="col">Notas</th>
                <th scope="col" className="num">
                  Preço
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const price = getItemPrice(item)
                return (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td>
                      <span className="print-sheet__swatch" style={{ background: item.color }} aria-hidden="true" />
                      {item.name}
                    </td>
                    <td className="num">
                      {cm(item.dimensions.width)} × {cm(item.dimensions.depth)} × {cm(item.dimensions.height)}
                    </td>
                    <td className="num">{Math.round(item.rotation)}°</td>
                    <td>{itemNotes(item)}</td>
                    <td className="num">{price === null ? '—' : euros.format(price)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colSpan={5}>
                  Total indicativo{metrics.unpriced ? ` (${metrics.unpriced} sem preço)` : ''}
                </th>
                <td className="num">{euros.format(metrics.cost)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </section>

      <section className="print-sheet__section">
        <h2>Análise</h2>
        {issues.length === 0 ? (
          <p className="print-sheet__empty">Sem problemas: tudo cabe e as passagens têm a largura mínima.</p>
        ) : (
          <ul className="print-sheet__issues">
            {issues.map((issue) => (
              <li key={issue.id} data-severity={issue.severity}>
                <strong>{issue.title}.</strong> {issue.message}
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="print-sheet__footer">
        Medidas interiores. As folgas são orientações de conforto, não verificação de conformidade legal. Preços indicativos do
        catálogo.
      </footer>
    </article>
  )
}

function Fact({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

/**
 * Círculos numerados no centro de cada móvel, iguais aos da tabela. Um
 * número que cairia em cima de outro (tapete sob a mesa) desloca-se para o lado.
 */
function ItemNumbers({ items, viewport }) {
  const placed = []
  for (const item of items) {
    const p = worldToScreen(viewport, item.position)
    let x = p.x
    while (placed.some((q) => Math.hypot(q.x - x, q.y - p.y) < LABEL_GAP)) x += LABEL_GAP
    placed.push({ x, y: p.y })
  }
  return (
    <g fontSize={11} fontWeight={600} textAnchor="middle">
      {items.map((item, index) => (
        <g key={item.id} transform={`translate(${placed[index].x.toFixed(1)} ${placed[index].y.toFixed(1)})`}>
          <circle r={9} fill="#ffffff" stroke="#26282c" strokeWidth={1.2} />
          <text y={4} fill="#1d1f22">
            {index + 1}
          </text>
        </g>
      ))}
    </g>
  )
}

function itemNotes(item) {
  const notes = []
  if (item.elevation) notes.push(`a ${formatLength(item.elevation)} do chão`)
  if (item.locked) notes.push('bloqueado')
  return notes.join(' · ')
}
