import { Library, Map, SlidersHorizontal } from 'lucide-react'
import { AppShell } from '@/components/layout'
import { SegmentedControl } from '@/components/ui'
import { CatalogPanel } from '@/features/catalog/CatalogPanel.jsx'
import { PlanView } from '@/features/editor2d/PlanView.jsx'
import { PropertiesPanel } from '@/features/inspector/PropertiesPanel.jsx'
import { useEditorStore } from '@/store/editorStore.js'
import { EditorStatusBar } from './EditorStatusBar.jsx'
import { EditorTopBar } from './EditorTopBar.jsx'

const MOBILE_PANELS = [
  { value: 'catalog', label: 'Catálogo', icon: Library },
  { value: 'plan', label: 'Planta', icon: Map },
  { value: 'properties', label: 'Propriedades', icon: SlidersHorizontal },
]

export function EditorPage() {
  const mobilePanel = useEditorStore((state) => state.mobilePanel)
  const setMobilePanel = useEditorStore((state) => state.setMobilePanel)

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
