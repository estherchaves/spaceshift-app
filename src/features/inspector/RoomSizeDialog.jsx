import { useState } from 'react'
import { Button, Dialog, FieldGrid, NumberField } from '@/components/ui'
import { checkInsideRoom } from '@/core/geometry/collision.js'
import { LIMITS } from '@/core/model'
import { formatArea, formatLength } from '@/core/units/units.js'
import { useProjectStore } from '@/store/projectStore.js'
import { selectActiveItems, selectRoom } from '@/store/selectors.js'
import './RoomSizeDialog.css'

/**
 * Medidas da divisão numa janela própria, para se mudarem depois de criada
 * sem procurar no painel Propriedades. As três medidas aplicam-se juntas
 * (um só passo de anular) e avisa-se antes se algum móvel fica de fora.
 */
export function RoomSizeDialog({ open, onClose }) {
  const room = useProjectStore(selectRoom)
  if (!open) return null
  return <RoomSizeForm key={`${room.width}:${room.depth}:${room.wallHeight}`} room={room} onClose={onClose} />
}

function RoomSizeForm({ room, onClose }) {
  const items = useProjectStore(selectActiveItems)
  const updateRoom = useProjectStore((state) => state.updateRoom)
  const [draft, setDraft] = useState({ width: room.width, depth: room.depth, wallHeight: room.wallHeight })
  const set = (key) => (value) => setDraft((d) => ({ ...d, [key]: value }))

  const outside = items.filter((item) => !checkInsideRoom(item, draft).inside)
  const wasOutside = new Set(items.filter((item) => !checkInsideRoom(item, room).inside).map((item) => item.id))
  const newlyOutside = outside.filter((item) => !wasOutside.has(item.id))
  const changed = draft.width !== room.width || draft.depth !== room.depth || draft.wallHeight !== room.wallHeight

  const apply = () => {
    if (changed) updateRoom(draft)
    onClose()
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Medidas da divisão"
      description="Medidas interiores, de parede a parede. Os móveis ficam onde estão; portas e janelas ajustam-se se deixarem de caber."
      size="sm"
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={apply}>
            Aplicar
          </Button>
        </>
      }
    >
      <FieldGrid>
        <NumberField label="Comprimento" unit="m" value={draft.width} min={LIMITS.room.min} max={LIMITS.room.max} step={0.1} onCommit={set('width')} />
        <NumberField label="Largura" unit="m" value={draft.depth} min={LIMITS.room.min} max={LIMITS.room.max} step={0.1} onCommit={set('depth')} />
      </FieldGrid>
      <FieldGrid>
        <NumberField
          label="Altura do teto"
          unit="m"
          value={draft.wallHeight}
          min={LIMITS.wallHeight.min}
          max={LIMITS.wallHeight.max}
          step={0.05}
          onCommit={set('wallHeight')}
        />
      </FieldGrid>
      <p className="room-size__summary" role="status">
        Área: {formatArea(draft.width * draft.depth)}
        {newlyOutside.length > 0 &&
          ` · ${newlyOutside.length === 1 ? `«${newlyOutside[0].name}» fica` : `${newlyOutside.length} móveis ficam`} fora da divisão. Pode arrastá-${newlyOutside.length === 1 ? 'lo' : 'los'} para dentro depois.`}
      </p>
      <p className="room-size__hint">
        Antes: {formatLength(room.width)} × {formatLength(room.depth)}
      </p>
    </Dialog>
  )
}
