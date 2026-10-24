import { ArrowRight, Columns3, Footprints, Maximize2, Trophy, Wallet, X } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Button, IconButton } from '@/components/ui'
import { formatArea, formatCentimetres } from '@/core/units/units.js'
import { StaticPlan } from '@/features/editor2d/StaticPlan.jsx'
import { switchLayout } from '@/store/commands.js'
import { useEditorStore } from '@/store/editorStore.js'
import { useProjectStore } from '@/store/projectStore.js'
import { compareLayouts } from './compareLayouts.js'
import './ComparisonView.css'

const euros = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const percent = new Intl.NumberFormat('pt-PT', { style: 'percent', maximumFractionDigits: 0 })

const HIGHLIGHTS = {
  score: { label: 'Melhor pontuação', icon: Trophy },
  space: { label: 'Mais espaço livre', icon: Maximize2 },
  circulation: { label: 'Melhor circulação', icon: Footprints },
  cost: { label: 'Mais barata', icon: Wallet },
}

/**
 * Comparação lado a lado das disposições do projeto: a mesma divisão,
 * soluções diferentes. Cada cartão mostra a planta (com a zona de
 * circulação e os erros), a pontuação explicada por parcelas e as
 * métricas que a sustentam, com o custo total ao lado.
 */
export function ComparisonView() {
  const project = useProjectStore((state) => state.project)
  const setCompareOpen = useEditorStore((state) => state.setCompareOpen)
  const entries = useMemo(() => compareLayouts(project), [project])
  const close = () => setCompareOpen(false)

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !event.defaultPrevented) close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  return (
    <section className="compare" aria-labelledby="compare-title">
      <header className="compare__header">
        <div className="compare__heading">
          <span className="compare__icon">
            <Columns3 size={16} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div>
            <h2 id="compare-title" className="compare__title">
              Comparar disposições
            </h2>
            <p className="compare__subtitle">
              A mesma divisão, {entries.length} soluções. A pontuação junta espaço livre, circulação e problemas; o custo fica
              ao lado para pesar as duas coisas.
            </p>
          </div>
        </div>
        <IconButton icon={X} label="Voltar ao editor" shortcut="Esc" tooltipAlign="end" onClick={close} />
      </header>

      <div className="compare__grid" data-count={Math.min(entries.length, 4)}>
        {entries.map((entry) => (
          <LayoutCard
            key={entry.id}
            entry={entry}
            room={project.room}
            active={entry.id === project.activeLayoutId}
            onOpen={() => {
              switchLayout(entry.id)
              close()
            }}
          />
        ))}
      </div>

      <p className="compare__note">
        A pontuação é uma orientação: espaço livre até 30 pontos, circulação até 40 (área por onde se passa com{' '}
        {formatCentimetres(project.settings.circulationMin)}, comparada com a divisão vazia) e problemas até 30 (menos 6 por
        aviso e 15 por erro). Com erros, fica abaixo de 50.
      </p>
    </section>
  )
}

function LayoutCard({ entry, room, active, onOpen }) {
  const { layout, analysis, result, highlights } = entry
  const { metrics } = result
  const errorRegions = analysis.errors.flatMap((issue) => (issue.marker?.kind === 'region' && issue.type !== 'ceiling' ? issue.marker.polygons : []))

  return (
    <article className="compare-card" data-active={active || undefined} aria-label={`${layout.name}: ${result.score} pontos`}>
      <header className="compare-card__header">
        <h3 className="compare-card__name">{layout.name}</h3>
        {active && <span className="compare-card__badge">A editar</span>}
      </header>

      <div className="compare-card__plan">
        <StaticPlan
          room={room}
          items={layout.items}
          width={420}
          height={260}
          padding={16}
          errorRegions={errorRegions}
          circulationRuns={analysis.circulation.runs}
          title={`Planta de ${layout.name}`}
        />
      </div>

      <div className="compare-card__score">
        <div className="score-ring" data-grade={result.grade.key} style={{ '--score': result.score }}>
          <span className="score-ring__value">{result.score}</span>
          <span className="score-ring__max">/100</span>
        </div>
        <div className="compare-card__grade">
          <span className="grade-pill" data-grade={result.grade.key}>
            {result.grade.label}
          </span>
          <div className="compare-card__highlights">
            {highlights.map((key) => {
              const { label, icon: Icon } = HIGHLIGHTS[key]
              return (
                <span key={key} className="highlight-chip" data-key={key}>
                  <Icon size={12} strokeWidth={2} aria-hidden="true" />
                  {label}
                </span>
              )
            })}
          </div>
        </div>
      </div>

      <ul className="score-parts" aria-label="Parcelas da pontuação">
        {result.parts.map((part) => (
          <li key={part.key} className="score-part">
            <span className="score-part__label">{part.label}</span>
            <span className="score-part__bar" aria-hidden="true">
              <span style={{ width: `${(part.points / part.max) * 100}%` }} data-full={part.points === part.max || undefined} />
            </span>
            <span className="score-part__value">
              {part.points}/{part.max}
            </span>
          </li>
        ))}
      </ul>

      <dl className="compare-card__metrics">
        <Metric label="Área livre" value={`${formatArea(metrics.freeArea)} · ${percent.format(metrics.freeRatio)}`} best={highlights.includes('space')} />
        <Metric
          label="Circulação"
          value={`${formatArea(metrics.circulationArea)} · ${percent.format(metrics.circulationRatio)} da vazia`}
          best={highlights.includes('circulation')}
        />
        <Metric
          label="Passagem mais estreita"
          value={metrics.narrowest === null ? 'Sem passagens estreitas' : formatCentimetres(metrics.narrowest)}
          tone={metrics.narrowest === null ? 'ok' : 'warning'}
        />
        <Metric
          label="Problemas"
          value={problemsLabel(metrics)}
          tone={metrics.errors ? 'error' : metrics.warnings ? 'warning' : 'ok'}
        />
        <Metric
          label="Custo total"
          value={
            metrics.itemCount === 0
              ? '—'
              : `${euros.format(metrics.cost)}${metrics.unpriced ? ` + ${metrics.unpriced} sem preço` : ''}`
          }
          best={highlights.includes('cost')}
        />
        <Metric label="Móveis" value={String(metrics.itemCount)} />
      </dl>

      <footer className="compare-card__footer">
        <Button variant={active ? 'secondary' : 'primary'} icon={ArrowRight} onClick={onOpen}>
          {active ? 'Continuar a editar' : 'Abrir esta disposição'}
        </Button>
      </footer>
    </article>
  )
}

function Metric({ label, value, best = false, tone }) {
  return (
    <div className="compare-metric" data-best={best || undefined} data-tone={tone}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function problemsLabel({ errors, warnings }) {
  if (!errors && !warnings) return 'Nenhum'
  const parts = []
  if (errors) parts.push(`${errors} ${errors === 1 ? 'erro' : 'erros'}`)
  if (warnings) parts.push(`${warnings} ${warnings === 1 ? 'aviso' : 'avisos'}`)
  return parts.join(' · ')
}
