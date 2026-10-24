import { CircleAlert, CircleCheck } from 'lucide-react'
import { useMemo } from 'react'
import { formatArea, formatLength } from '@/core/units/units.js'
import { computeLayoutMetrics, selectActiveItems, selectRoom, selectSettings } from '@/store/selectors.js'
import { useProjectStore } from '@/store/projectStore.js'
import './EditorStatusBar.css'

const percent = new Intl.NumberFormat('pt-PT', { style: 'percent', maximumFractionDigits: 0 })

export function EditorStatusBar() {
  const room = useProjectStore(selectRoom)
  const items = useProjectStore(selectActiveItems)
  const settings = useProjectStore(selectSettings)
  const metrics = useMemo(() => computeLayoutMetrics(room, items), [room, items])
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
        <span className="statusbar__conflicts" data-state={metrics.conflicts > 0 ? 'error' : 'ok'}>
          {metrics.conflicts > 0 ? (
            <CircleAlert size={13} strokeWidth={2} aria-hidden="true" />
          ) : (
            <CircleCheck size={13} strokeWidth={2} aria-hidden="true" />
          )}
          {metrics.conflicts === 0
            ? 'Sem conflitos'
            : `${metrics.conflicts} ${metrics.conflicts === 1 ? 'conflito' : 'conflitos'}`}
        </span>
        <span className="statusbar__optional statusbar__muted">
          Grelha {Math.round(settings.gridSize * 100)} cm · Snap {settings.snapToGrid ? 'ativo' : 'desligado'}
        </span>
      </div>
    </footer>
  )
}

function Metric({ label, value, className = '' }) {
  return (
    <div className={`statusbar__metric ${className}`.trim()}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
