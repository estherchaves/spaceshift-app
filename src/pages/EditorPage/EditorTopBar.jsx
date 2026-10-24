import { Box, Download, Redo2, Save, Square, Undo2 } from 'lucide-react'
import { Logo } from '@/components/brand/Logo.jsx'
import { Button, IconButton, SegmentedControl } from '@/components/ui'
import { selectDirty, selectProjectName } from '@/store/selectors.js'
import { useEditorStore } from '@/store/editorStore.js'
import { useProjectStore } from '@/store/projectStore.js'
import { ProjectNameField } from './ProjectNameField.jsx'
import './EditorTopBar.css'

/*
 * Ações que dependem de fases seguintes ficam visíveis mas desativadas,
 * com o motivo acessível em tooltip/aria-describedby. Assim o layout final
 * já está definido e nenhum botão finge fazer algo que ainda não faz.
 */
const PENDING_HISTORY = 'Disponível com o histórico (Fase 7)'
const PENDING_SAVE = 'Disponível com a gravação local (Fase 7)'
const PENDING_EXPORT = 'Disponível com a exportação (Fase 7)'
const PENDING_3D = 'A vista 3D chega na Fase 5'

export function EditorTopBar() {
  const name = useProjectStore(selectProjectName)
  const dirty = useProjectStore(selectDirty)
  const renameProject = useProjectStore((state) => state.renameProject)
  const viewMode = useEditorStore((state) => state.viewMode)
  const setViewMode = useEditorStore((state) => state.setViewMode)

  return (
    <header className="topbar">
      <div className="topbar__start">
        <Logo />
        <span className="topbar__divider" aria-hidden="true" />
        <ProjectNameField name={name} onRename={renameProject} />
        <SaveStatus dirty={dirty} />
      </div>

      <div className="topbar__center">
        <SegmentedControl
          label="Modo de visualização"
          value={viewMode}
          onChange={setViewMode}
          options={[
            { value: '2d', label: '2D', icon: Square },
            { value: '3d', label: '3D', icon: Box, disabled: true, hint: PENDING_3D },
          ]}
        />
      </div>

      <div className="topbar__end">
        <div className="topbar__group" role="group" aria-label="Histórico">
          <IconButton icon={Undo2} label="Anular" shortcut="Ctrl+Z" disabled disabledReason={PENDING_HISTORY} />
          <IconButton icon={Redo2} label="Refazer" shortcut="Ctrl+Shift+Z" disabled disabledReason={PENDING_HISTORY} />
        </div>
        <Button icon={Download} disabled disabledReason={PENDING_EXPORT} tooltipAlign="end" className="topbar__export">
          Exportar
        </Button>
        <Button variant="primary" icon={Save} disabled disabledReason={PENDING_SAVE} tooltipAlign="end" className="topbar__save">
          Guardar
        </Button>
      </div>
    </header>
  )
}

function SaveStatus({ dirty }) {
  return (
    <span className="save-status" data-dirty={dirty || undefined} role="status">
      <span className="save-status__dot" aria-hidden="true" />
      <span className="save-status__text">{dirty ? 'Alterações por guardar' : 'Sem alterações'}</span>
    </span>
  )
}
