import { useState } from 'react'
import { Button, Dialog, FieldGrid, NumberField, TextField } from '@/components/ui'
import { LIMITS, ROOM_TYPES } from '@/core/model'
import { formatArea, formatLength } from '@/core/units/units.js'
import { ROOM_TYPE_ICONS } from './roomTypeIcons.js'
import './NewProjectDialog.css'

/**
 * Novo projeto: nome, tipo de divisão e medidas. Escolher o tipo propõe
 * medidas habituais, até o utilizador mexer nelas. A pré-visualização
 * mostra as proporções reais da divisão.
 */
export function NewProjectDialog({ open, onCreate, onCancel, busy = false }) {
  return open ? <NewProjectForm onCreate={onCreate} onCancel={onCancel} busy={busy} /> : null
}

function NewProjectForm({ onCreate, onCancel, busy }) {
  const [name, setName] = useState('')
  const [roomType, setRoomType] = useState('living')
  const [size, setSize] = useState({ width: ROOM_TYPES.living.width, depth: ROOM_TYPES.living.depth })
  const [sizeTouched, setSizeTouched] = useState(false)

  const chooseType = (type) => {
    setRoomType(type)
    if (!sizeTouched) setSize({ width: ROOM_TYPES[type].width, depth: ROOM_TYPES[type].depth })
  }
  const setDimension = (key, value) => {
    setSizeTouched(true)
    setSize((current) => ({ ...current, [key]: value }))
  }
  const submit = (event) => {
    event.preventDefault()
    if (busy) return
    onCreate({ name: name.trim() || ROOM_TYPES[roomType].label, roomType, ...size })
  }

  const longest = Math.max(size.width, size.depth)
  const preview = { width: (size.width / longest) * 96, height: (size.depth / longest) * 96 }

  return (
    <Dialog
      open
      title="Novo projeto"
      description="Escolha a divisão e as medidas interiores. Pode mudar tudo depois no editor."
      onClose={onCancel}
      size="lg"
      footer={
        <>
          <Button onClick={onCancel}>Cancelar</Button>
          <Button variant="primary" type="submit" form="new-project-form" disabled={busy}>
            Criar projeto
          </Button>
        </>
      }
    >
      <form id="new-project-form" className="new-project" onSubmit={submit} noValidate>
        <TextField
          label="Nome do projeto"
          value={name}
          placeholder={ROOM_TYPES[roomType].label}
          maxLength={LIMITS.projectName.maxLength}
          autoFocus
          onChange={setName}
        />
        <fieldset className="new-project__types">
          <legend className="new-project__legend">Tipo de divisão</legend>
          <div className="new-project__type-grid">
            {Object.entries(ROOM_TYPES).map(([value, { label }]) => {
              const Icon = ROOM_TYPE_ICONS[value]
              return (
                <label key={value} className="room-type" data-checked={roomType === value || undefined}>
                  <input type="radio" name="room-type" value={value} checked={roomType === value} onChange={() => chooseType(value)} />
                  <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
                  <span>{label}</span>
                </label>
              )
            })}
          </div>
        </fieldset>
        <div className="new-project__size">
          <div className="new-project__fields">
            <FieldGrid>
              <NumberField
                label="Comprimento"
                unit="m"
                value={size.width}
                min={LIMITS.room.min}
                max={LIMITS.room.max}
                step={0.1}
                onCommit={(value) => setDimension('width', value)}
              />
              <NumberField
                label="Largura"
                unit="m"
                value={size.depth}
                min={LIMITS.room.min}
                max={LIMITS.room.max}
                step={0.1}
                onCommit={(value) => setDimension('depth', value)}
              />
            </FieldGrid>
            <p className="new-project__area">
              Área: <strong>{formatArea(size.width * size.depth)}</strong>
            </p>
          </div>
          <div className="new-project__preview" aria-hidden="true">
            <div className="new-project__room" style={{ width: preview.width, height: preview.height }}>
              <span className="new-project__dim new-project__dim--x">{formatLength(size.width)}</span>
              <span className="new-project__dim new-project__dim--z">{formatLength(size.depth)}</span>
            </div>
          </div>
        </div>
      </form>
    </Dialog>
  )
}
