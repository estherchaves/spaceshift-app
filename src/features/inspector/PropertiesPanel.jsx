import { ArrowLeft } from 'lucide-react'
import { SidePanel } from '@/components/layout'
import { Button } from '@/components/ui'
import { clearSelection } from '@/store/commands.js'
import { useSelectedItem, useSelectedOpening } from '@/store/selectors.js'
import { ItemInspector } from './ItemInspector.jsx'
import { OpeningInspector } from './OpeningInspector.jsx'
import { RoomInspector } from './RoomInspector.jsx'

/** Painel direito: propriedades do móvel ou da porta/janela selecionada ou, sem seleção, da divisão. */
export function PropertiesPanel() {
  const item = useSelectedItem()
  const opening = useSelectedOpening()
  const selected = item ?? opening
  return (
    <SidePanel
      title="Propriedades"
      label="Propriedades"
      meta={
        selected ? (
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={clearSelection}>
            Divisão
          </Button>
        ) : (
          'Divisão'
        )
      }
    >
      {item ? (
        <ItemInspector key={item.id} item={item} />
      ) : opening ? (
        <OpeningInspector key={opening.id} opening={opening} />
      ) : (
        <RoomInspector />
      )}
    </SidePanel>
  )
}
