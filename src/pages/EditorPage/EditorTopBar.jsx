import { ArrowLeft, Box, Check, CircleAlert, Download, FileJson, Image, LoaderCircle, Printer, Redo2, Save, Undo2 } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { Logo } from '@/components/brand/Logo.jsx'
import { Button, IconButton, Menu, SegmentedControl } from '@/components/ui'
import { redoLabel, undoLabel } from '@/core/history'
import { hasSceneCapture, subscribeSceneCapture } from '@/features/scene3d/sceneCapture.js'
import { saveNow } from '@/store/autosave.js'
import { redoChange, undoChange } from '@/store/commands.js'
import { selectProjectName } from '@/store/selectors.js'
import { useEditorStore } from '@/store/editorStore.js'
import { useProjectStore } from '@/store/projectStore.js'
import { formatClock } from '@/utils/time.js'
import { backToProjects, exportImage, exportJson, printSheet } from './editorActions.js'
import { ProjectNameField } from './ProjectNameField.jsx'
import { VIEW_MODE_OPTIONS } from './viewModes.js'
import './EditorTopBar.css'

export function EditorTopBar() {
  const name = useProjectStore(selectProjectName)
  const renameProject = useProjectStore((state) => state.renameProject)
  const undoName = useProjectStore((state) => undoLabel(state.history))
  const redoName = useProjectStore((state) => redoLabel(state.history))
  const viewMode = useEditorStore((state) => state.viewMode)
  const setViewMode = useEditorStore((state) => state.setViewMode)
  const sceneReady = useSyncExternalStore(subscribeSceneCapture, hasSceneCapture)

  return (
    <header className="topbar">
      <div className="topbar__start">
        <IconButton icon={ArrowLeft} label="Os meus projetos" tooltipAlign="start" onClick={backToProjects} className="topbar__back" />
        <Logo />
        <span className="topbar__divider" aria-hidden="true" />
        <h1 className="topbar__title">
          <ProjectNameField name={name} onRename={renameProject} />
        </h1>
        <SaveStatus />
      </div>

      <div className="topbar__center">
        <SegmentedControl
          label="Modo de visualização"
          value={viewMode}
          onChange={setViewMode}
          options={VIEW_MODE_OPTIONS}
        />
      </div>

      <div className="topbar__end">
        <div className="topbar__group" role="group" aria-label="Histórico">
          <IconButton
            icon={Undo2}
            label={undoName ? `Anular: ${undoName}` : 'Anular'}
            shortcut="Ctrl+Z"
            disabled={!undoName}
            disabledReason="Nada para anular"
            onClick={undoChange}
          />
          <IconButton
            icon={Redo2}
            label={redoName ? `Refazer: ${redoName}` : 'Refazer'}
            shortcut="Ctrl+Shift+Z"
            disabled={!redoName}
            disabledReason="Nada para refazer"
            onClick={redoChange}
          />
        </div>
        <Menu
          label="Exportar"
          trigger={(props) => (
            <Button icon={Download} className="topbar__export" aria-label="Exportar" {...props}>
              Exportar
            </Button>
          )}
          items={[
            { label: 'Planta em imagem (PNG)', icon: Image, onSelect: () => exportImage('plan') },
            {
              label: 'Vista 3D em imagem (PNG)',
              icon: Box,
              disabled: !sceneReady,
              hint: sceneReady ? undefined : 'abra a vista 3D',
              onSelect: () => exportImage('3d'),
            },
            { label: 'Ficha para imprimir ou PDF', icon: Printer, onSelect: printSheet },
            'separator',
            { label: 'Projeto completo (JSON)', icon: FileJson, onSelect: exportJson },
          ]}
        />
        <SaveButton />
      </div>
    </header>
  )
}

function SaveButton() {
  const status = useProjectStore((state) => state.saveStatus)
  const saved = status === 'saved'
  return (
    <Button
      variant="primary"
      icon={Save}
      className="topbar__save"
      disabled={saved}
      disabledReason="Tudo guardado"
      tooltipAlign="end"
      aria-label="Guardar (Ctrl+S)"
      onClick={() => saveNow()}
    >
      Guardar
    </Button>
  )
}

const STATUS = {
  saved: { icon: Check, text: (at) => (at ? `Guardado às ${formatClock(at)}` : 'Guardado') },
  unsaved: { icon: null, text: () => 'Alterações por guardar' },
  saving: { icon: LoaderCircle, text: () => 'A guardar…' },
  error: { icon: CircleAlert, text: () => 'Erro ao guardar' },
}

/** Indicador de gravação: guardado (com a hora), por guardar, a guardar ou erro. */
function SaveStatus() {
  const status = useProjectStore((state) => state.saveStatus)
  const lastSavedAt = useProjectStore((state) => state.lastSavedAt)
  const error = useProjectStore((state) => state.saveError)
  const { icon: Icon, text } = STATUS[status]
  return (
    <span className="save-status" data-status={status} role="status" title={status === 'error' ? error : undefined}>
      {Icon ? <Icon size={12} strokeWidth={2.25} aria-hidden="true" className="save-status__icon" /> : <span className="save-status__dot" aria-hidden="true" />}
      <span className="save-status__text">{text(lastSavedAt)}</span>
    </span>
  )
}
