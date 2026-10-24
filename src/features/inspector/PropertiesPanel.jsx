import { ArrowLeft } from 'lucide-react'
import { SidePanel } from '@/components/layout'
import { Button } from '@/components/ui'
import { clearSelection } from '@/store/commands.js'
import { useSelectedItem } from '@/store/selectors.js'
import { ItemInspector } from './ItemInspector.jsx'
import { RoomInspector } from './RoomInspector.jsx'

/** Painel direito: propriedades do móvel selecionado ou, sem seleção, da divisão. */
export function PropertiesPanel() {
  const item = useSelectedItem()
  return (
    <SidePanel
      title="Propriedades"
      label="Propriedades"
      meta={
        item ? (
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={clearSelection}>
            Divisão
          </Button>
        ) : (
          'Divisão'
        )
      }
    >
      {item ? <ItemInspector key={item.id} item={item} /> : <RoomInspector />}
    </SidePanel>
  )
}
