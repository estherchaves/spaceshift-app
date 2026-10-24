import { SegmentedControl } from '@/components/ui'
import { AnalysisPanel } from '@/features/analysis/AnalysisPanel.jsx'
import { LayoutBar } from '@/features/layouts/LayoutBar.jsx'
import { PlanView } from '@/features/editor2d/PlanView.jsx'
import { SceneView } from '@/features/scene3d/SceneView.jsx'
import { useEditorStore } from '@/store/editorStore.js'
import { VIEW_MODE_OPTIONS } from './viewModes.js'
import './EditorWorkspace.css'

/**
 * Área central: planta, cena 3D ou as duas (modo dividido: lado a lado em
 * desktop, uma por cima da outra em ecrãs estreitos). Em ecrãs estreitos a
 * barra de topo esconde o seletor de modo, por isso ele aparece aqui.
 * O painel de análise ocupa uma coluna à direita em ecrãs largos e fica
 * por baixo da vista em ecrãs estreitos; nos dois casos as vistas
 * reenquadram-se e nada fica tapado. Em ecrãs médios flutua por cima.
 */
export function EditorWorkspace() {
  const viewMode = useEditorStore((state) => state.viewMode)
  const setViewMode = useEditorStore((state) => state.setViewMode)
  return (
    <div className="workspace" data-view={viewMode}>
      <div className="workspace__switch">
        <SegmentedControl
          label="Modo de visualização (ecrã estreito)"
          size="full"
          value={viewMode}
          onChange={setViewMode}
          options={VIEW_MODE_OPTIONS}
        />
      </div>
      <LayoutBar />
      <div className="workspace__main">
      <div className="workspace__panes">
        {viewMode !== '3d' && (
          <div className="workspace__pane">
            <PlanView />
          </div>
        )}
        {viewMode !== '2d' && (
          <div className="workspace__pane">
            <SceneView />
          </div>
        )}
      </div>
      <AnalysisPanel />
      </div>
    </div>
  )
}
