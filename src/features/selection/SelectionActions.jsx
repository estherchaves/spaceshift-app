import { Copy, Lock, LockOpen, RotateCw, Ruler, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Button, IconButton } from '@/components/ui'
import { formatLength } from '@/core/units/units.js'
import { RoomSizeDialog } from '@/features/inspector/RoomSizeDialog.jsx'
import { clearSelection, deleteSelected, duplicateSelected, rotateSelected, toggleLockSelected } from '@/store/commands.js'
import { useProjectStore } from '@/store/projectStore.js'
import { selectRoom, useSelectedItem, useSelectedOpening } from '@/store/selectors.js'
import './SelectionActions.css'

const LOCKED_REASON = 'Desbloqueie o móvel para o alterar'

/**
 * Barra flutuante sobre a vista com as ações do que está selecionado.
 * No telemóvel o painel Propriedades fica noutro separador e não há tecla
 * Delete, por isso é aqui que se roda, duplica e elimina sem sair da vista.
 * Sem nada selecionado, mostra as medidas da divisão e deixa mudá-las.
 */
export function SelectionActions({ hidden = false }) {
  const item = useSelectedItem()
  const opening = useSelectedOpening()
  if (hidden) return null
  if (!item && !opening) return <RoomActions />

  if (opening) {
    const label = opening.type === 'window' ? 'janela' : 'porta'
    return (
      <div className="selection-actions" role="toolbar" aria-label={`Ações da ${label}`}>
        <span className="selection-actions__name">{label === 'janela' ? 'Janela' : 'Porta'}</span>
        <IconButton icon={Trash2} label={`Eliminar ${label}`} shortcut="Delete" size="sm" className="selection-actions__delete" onClick={deleteSelected} />
        <IconButton icon={X} label="Fechar" shortcut="Esc" size="sm" tooltipAlign="end" onClick={clearSelection} />
      </div>
    )
  }

  const locked = Boolean(item.locked)
  return (
    <div className="selection-actions" role="toolbar" aria-label={`Ações de ${item.name}`}>
      <span className="selection-actions__name">{item.name}</span>
      <IconButton icon={RotateCw} label="Rodar" shortcut="R" size="sm" disabled={locked} disabledReason={LOCKED_REASON} onClick={() => rotateSelected(1)} />
      <IconButton icon={Copy} label="Duplicar" shortcut="Ctrl+D" size="sm" onClick={duplicateSelected} />
      <IconButton
        icon={locked ? LockOpen : Lock}
        label={locked ? 'Desbloquear' : 'Bloquear'}
        shortcut="L"
        size="sm"
        aria-pressed={locked}
        onClick={toggleLockSelected}
      />
      <IconButton
        icon={Trash2}
        label="Eliminar"
        shortcut="Delete"
        size="sm"
        disabled={locked}
        disabledReason={LOCKED_REASON}
        className="selection-actions__delete"
        onClick={deleteSelected}
      />
      <IconButton icon={X} label="Fechar" shortcut="Esc" size="sm" tooltipAlign="end" onClick={clearSelection} />
    </div>
  )
}

function RoomActions() {
  const room = useProjectStore(selectRoom)
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="selection-actions selection-actions--room" role="toolbar" aria-label="Divisão">
        <span className="selection-actions__name">
          Divisão <span className="selection-actions__size">{formatLength(room.width)} × {formatLength(room.depth)}</span>
        </span>
        <Button size="sm" variant="ghost" icon={Ruler} onClick={() => setOpen(true)}>
          Alterar medidas
        </Button>
      </div>
      <RoomSizeDialog open={open} onClose={() => setOpen(false)} />
    </>
  )
}
