import { Library, Map, SlidersHorizontal } from 'lucide-react'
import { AppShell } from '@/components/layout'
import { SegmentedControl } from '@/components/ui'
import { CatalogPanel } from '@/features/catalog/CatalogPanel.jsx'
import { ComparisonView } from '@/features/layouts/ComparisonView.jsx'
import { PropertiesPanel } from '@/features/inspector/PropertiesPanel.jsx'
import { isEditableTarget, useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts.js'
import { saveNow } from '@/store/autosave.js'
import {
  clearSelection,
  deleteSelected,
  duplicateSelected,
  nudgeSelected,
  redoChange,
  rotateSelected,
  toggleLockSelected,
  undoChange,
} from '@/store/commands.js'
import { useEditorStore } from '@/store/editorStore.js'
import { EditorStatusBar } from './EditorStatusBar.jsx'
import { EditorWorkspace } from './EditorWorkspace.jsx'
import { EditorTopBar } from './EditorTopBar.jsx'
import { useEditorPersistence } from './useEditorPersistence.js'

const MOBILE_PANELS = [
  { value: 'catalog', label: 'Catálogo', icon: Library },
  { value: 'plan', label: 'Vista', icon: Map },
  { value: 'properties', label: 'Propriedades', icon: SlidersHorizontal },
]

/**
 * Anular/refazer num campo de texto desfaz o texto (comportamento nativo),
 * não o projeto: devolver false deixa o browser tratar a tecla.
 */
const history = (action) => (event) => (isEditableTarget(event.target) ? false : action())

/** Atalhos do editor. Os sem Ctrl/⌘ são ignorados enquanto se escreve num campo. */
const SHORTCUTS = [
  { key: 'z', ctrl: true, shift: false, handler: history(undoChange) },
  { key: 'z', ctrl: true, shift: true, handler: history(redoChange) },
  { key: 'y', ctrl: true, handler: history(redoChange) },
  { key: 's', ctrl: true, handler: () => void saveNow() },
  { key: ['Delete', 'Backspace'], handler: () => deleteSelected() },
  { key: 'Escape', handler: () => clearSelection() },
  { key: 'd', ctrl: true, handler: () => duplicateSelected() },
  { key: 'r', shift: false, handler: () => rotateSelected(1) },
  { key: 'r', shift: true, handler: () => rotateSelected(-1) },
  { key: 'l', handler: () => toggleLockSelected() },
  { key: 'ArrowLeft', handler: (e) => nudgeSelected(-1, 0, e.shiftKey) },
  { key: 'ArrowRight', handler: (e) => nudgeSelected(1, 0, e.shiftKey) },
  { key: 'ArrowUp', handler: (e) => nudgeSelected(0, -1, e.shiftKey) },
  { key: 'ArrowDown', handler: (e) => nudgeSelected(0, 1, e.shiftKey) },
]

export function EditorPage() {
  const mobilePanel = useEditorStore((state) => state.mobilePanel)
  const setMobilePanel = useEditorStore((state) => state.setMobilePanel)
  const compareOpen = useEditorStore((state) => state.compareOpen)
  useKeyboardShortcuts(SHORTCUTS)
  useEditorPersistence()

  return (
    <AppShell
      mobilePanel={mobilePanel}
      topBar={<EditorTopBar />}
      mobileNav={
        <SegmentedControl
          label="Painel visível"
          size="full"
          value={mobilePanel}
          onChange={setMobilePanel}
          options={MOBILE_PANELS}
        />
      }
      left={<CatalogPanel />}
      main={<EditorWorkspace />}
      right={<PropertiesPanel />}
      statusBar={<EditorStatusBar />}
      overlay={compareOpen ? <ComparisonView /> : null}
    />
  )
}
