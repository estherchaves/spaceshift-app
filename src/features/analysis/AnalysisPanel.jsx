import { CircleCheck, X } from 'lucide-react'
import { useMemo } from 'react'
import { IconButton, NumberField, Switch } from '@/components/ui'
import { LIMITS } from '@/core/model'
import { formatArea } from '@/core/units/units.js'
import { useEditorStore } from '@/store/editorStore.js'
import { useProjectStore } from '@/store/projectStore.js'
import { selectSettings, useDisplayedItems, useLayoutAnalysis } from '@/store/selectors.js'
import { IssueList } from './IssueList.jsx'
import './Analysis.css'

/**
 * Painel de análise: erros geométricos e avisos de circulação, separados,
 * com a passagem mínima configurável e a opção de ver a zona de
 * circulação na planta. Abre a partir da barra inferior.
 */
export function AnalysisPanel() {
  const open = useEditorStore((state) => state.analysisOpen)
  const setOpen = useEditorStore((state) => state.setAnalysisOpen)
  const showCirculation = useEditorStore((state) => state.showCirculation)
  const setShowCirculation = useEditorStore((state) => state.setShowCirculation)
  const settings = useProjectStore(selectSettings)
  const updateSettings = useProjectStore((state) => state.updateSettings)
  const analysis = useLayoutAnalysis()
  const items = useDisplayedItems()
  const lockedIds = useMemo(() => new Set(items.filter((item) => item.locked).map((item) => item.id)), [items])

  if (!open) return null
  const { errors, warnings, circulation } = analysis

  return (
    <section className="analysis-panel" aria-label="Análise da disposição">
      <header className="analysis-panel__header">
        <div>
          <h2 className="analysis-panel__title">Análise da disposição</h2>
          <p className="analysis-panel__summary">
            <span data-severity="error">{plural(errors.length, 'erro', 'erros')}</span>
            <span data-severity="warning">{plural(warnings.length, 'aviso', 'avisos')}</span>
          </p>
        </div>
        <IconButton icon={X} label="Fechar análise" size="sm" tooltipAlign="end" onClick={() => setOpen(false)} />
      </header>

      <div className="analysis-panel__settings">
        <NumberField
          label="Passagem mínima"
          unit="m"
          value={settings.circulationMin}
          min={LIMITS.circulationMin.min}
          max={LIMITS.circulationMin.max}
          step={0.05}
          onCommit={(circulationMin) => updateSettings({ circulationMin })}
        />
        <Switch
          label="Mostrar zona de circulação"
          description={`Onde cabe uma passagem de ${Math.round(settings.circulationMin * 100)} cm: ${formatArea(circulation.area)}.`}
          checked={showCirculation}
          onChange={setShowCirculation}
        />
      </div>

      <div className="analysis-panel__body">
        {errors.length === 0 && warnings.length === 0 ? (
          <p className="analysis-panel__ok">
            <CircleCheck size={16} strokeWidth={2} aria-hidden="true" />
            Tudo cabe: sem colisões nem passagens estreitas.
          </p>
        ) : (
          <>
            {errors.length > 0 && (
              <div className="analysis-panel__group">
                <h3>Erros · geometria</h3>
                <IssueList issues={errors} lockedIds={lockedIds} />
              </div>
            )}
            {warnings.length > 0 && (
              <div className="analysis-panel__group">
                <h3>Avisos · circulação</h3>
                <IssueList issues={warnings} lockedIds={lockedIds} />
              </div>
            )}
          </>
        )}
      </div>

      <p className="analysis-panel__note">
        Os avisos de circulação são orientações de conforto, não uma garantia de conformidade legal.
      </p>
    </section>
  )
}

function plural(count, one, many) {
  return `${count} ${count === 1 ? one : many}`
}
