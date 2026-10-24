import { CircleCheck, CircleX, TriangleAlert } from 'lucide-react'
import { useMemo } from 'react'
import { formatArea, formatLength } from '@/core/units/units.js'
import { useEditorStore } from '@/store/editorStore.js'
import { computeLayoutMetrics, selectSettings, useDisplayedItems, useDisplayedRoom, useSelectedItem } from '@/store/selectors.js'
import { useProjectStore } from '@/store/projectStore.js'
import './EditorStatusBar.css'

const percent = new Intl.NumberFormat('pt-PT', { style: 'percent', maximumFractionDigits: 0 })

export function EditorStatusBar() {
  const room = useDisplayedRoom()
  const items = useDisplayedItems()
  const selected = useSelectedItem()
  const interaction = useEditorStore((state) => state.interaction)
  const settings = useProjectStore(selectSettings)
  const analysisOpen = useEditorStore((state) => state.analysisOpen)
  const setAnalysisOpen = useEditorStore((state) => state.setAnalysisOpen)
  const metrics = useMemo(() => computeLayoutMetrics(room, items, settings), [room, items, settings])
  const ratio = metrics.roomArea > 0 ? metrics.occupiedArea / metrics.roomArea : 0

  return (
    <footer className="statusbar" aria-label="Estado do projeto">
      <dl className="statusbar__metrics">
        <Metric label="Divisão" value={`${formatLength(room.width)} × ${formatLength(room.depth)}`} />
        <Metric label="Área" value={formatArea(metrics.roomArea)} />
        <Metric
          label="Ocupado"
          value={`${formatArea(metrics.occupiedArea)} · ${percent.format(ratio)}`}
          className="statusbar__optional"
        />
        <Metric label="Móveis" value={String(metrics.itemCount)} className="statusbar__optional" />
      </dl>
      <div className="statusbar__end">
        <button
          type="button"
          className="statusbar__analysis"
          data-state={metrics.errors > 0 ? 'error' : metrics.warnings > 0 ? 'warning' : 'ok'}
          aria-expanded={analysisOpen}
          aria-label={`Análise: ${analysisLabel(metrics)}. ${analysisOpen ? 'Fechar' : 'Abrir'} painel de análise.`}
          onClick={() => {
            setAnalysisOpen(!analysisOpen)
            useEditorStore.getState().setMobilePanel('plan')
          }}
        >
          {metrics.errors === 0 && metrics.warnings === 0 ? (
            <span className="statusbar__count" data-severity="ok">
              <CircleCheck size={13} strokeWidth={2} aria-hidden="true" />
              Sem problemas
            </span>
          ) : (
            <>
              {metrics.errors > 0 && (
                <span className="statusbar__count" data-severity="error">
                  <CircleX size={13} strokeWidth={2} aria-hidden="true" />
                  {metrics.errors} {metrics.errors === 1 ? 'erro' : 'erros'}
                </span>
              )}
              {metrics.warnings > 0 && (
                <span className="statusbar__count" data-severity="warning">
                  <TriangleAlert size={13} strokeWidth={2} aria-hidden="true" />
                  {metrics.warnings} {metrics.warnings === 1 ? 'aviso' : 'avisos'}
                </span>
              )}
            </>
          )}
        </button>
        <span className="statusbar__optional statusbar__state" role="status">
          {editorState(interaction, selected)}
        </span>
        <span className="statusbar__optional statusbar__muted">
          Grelha {Math.round(settings.gridSize * 100)} cm · Snap {settings.snapToGrid ? 'ativo' : 'desligado'}
        </span>
      </div>
    </footer>
  )
}

function analysisLabel({ errors, warnings }) {
  if (!errors && !warnings) return 'sem problemas'
  return `${errors} ${errors === 1 ? 'erro' : 'erros'} e ${warnings} ${warnings === 1 ? 'aviso' : 'avisos'}`
}

const INTERACTION_LABELS = {
  move: 'A mover',
  rotate: 'A rodar',
  resize: 'A redimensionar',
  pan: 'A deslocar a vista',
}

function editorState(interaction, selected) {
  if (interaction) return INTERACTION_LABELS[interaction.type] ?? 'A editar'
  if (selected) return `${selected.name}${selected.locked ? ' (bloqueado)' : ''} · ${Math.round(selected.rotation)}°`
  return 'Pronto'
}

function Metric({ label, value, className = '' }) {
  return (
    <div className={`statusbar__metric ${className}`.trim()}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
