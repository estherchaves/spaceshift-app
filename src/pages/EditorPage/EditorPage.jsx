import { Library, Map, SlidersHorizontal } from 'lucide-react'
import { AppShell } from '@/components/layout'
import { SegmentedControl } from '@/components/ui'
import { CatalogPanel } from '@/features/catalog/CatalogPanel.jsx'
import { PlanView } from '@/features/editor2d/PlanView.jsx'
import { PropertiesPanel } from '@/features/inspector/PropertiesPanel.jsx'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts.js'
import {
  clearSelection,
  deleteSelected,
  duplicateSelected,
  nudgeSelected,
  rotateSelected,
} from '@/store/commands.js'
import { useEditorStore } from '@/store/editorStore.js'
import { EditorStatusBar } from './EditorStatusBar.jsx'
import { EditorTopBar } from './EditorTopBar.jsx'

const MOBILE_PANELS = [
  { value: 'catalog', label: 'Catálogo', icon: Library },
  { value: 'plan', label: 'Planta', icon: Map },
  { value: 'properties', label: 'Propriedades', icon: SlidersHorizontal },
]

/** Atalhos do editor. Os sem Ctrl/⌘ são ignorados enquanto se escreve num campo. */
const SHORTCUTS = [
  { key: ['Delete', 'Backspace'], handler: () => deleteSelected() },
  { key: 'Escape', handler: () => clearSelection() },
  { key: 'd', ctrl: true, handler: () => duplicateSelected() },
  { key: 'r', shift: false, handler: () => rotateSelected(1) },
  { key: 'r', shift: true, handler: () => rotateSelected(-1) },
  { key: 'ArrowLeft', handler: (e) => nudgeSelected(-1, 0, e.shiftKey) },
  { key: 'ArrowRight', handler: (e) => nudgeSelected(1, 0, e.shiftKey) },
  { key: 'ArrowUp', handler: (e) => nudgeSelected(0, -1, e.shiftKey) },
  { key: 'ArrowDown', handler: (e) => nudgeSelected(0, 1, e.shiftKey) },
]

export function EditorPage() {
  const mobilePanel = useEditorStore((state) => state.mobilePanel)
  const setMobilePanel = useEditorStore((state) => state.setMobilePanel)
  useKeyboardShortcuts(SHORTCUTS)

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
      main={<PlanView />}
      right={<PropertiesPanel />}
      statusBar={<EditorStatusBar />}
    />
  )
}
