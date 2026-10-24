import { SidePanel } from '@/components/layout'
import { RoomInspector } from './RoomInspector.jsx'

/**
 * Painel direito. Sem seleção mostra as propriedades da divisão;
 * as propriedades de cada móvel são adicionadas na Fase 4.
 */
export function PropertiesPanel() {
  return (
    <SidePanel title="Propriedades" label="Propriedades" meta="Divisão">
      <RoomInspector />
    </SidePanel>
  )
}
