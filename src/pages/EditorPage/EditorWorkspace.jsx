import { SegmentedControl } from '@/components/ui'
import { PlanView } from '@/features/editor2d/PlanView.jsx'
import { SceneView } from '@/features/scene3d/SceneView.jsx'
import { useEditorStore } from '@/store/editorStore.js'
import { VIEW_MODE_OPTIONS } from './viewModes.js'
import './EditorWorkspace.css'

/**
 * Área central: planta, cena 3D ou as duas (modo dividido: lado a lado em
 * desktop, uma por cima da outra em ecrãs estreitos). Em ecrãs estreitos a
 * barra de topo esconde o seletor de modo, por isso ele aparece aqui.
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
    </div>
  )
}
