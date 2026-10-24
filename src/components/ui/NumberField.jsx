import { useId, useState } from 'react'
import { clamp } from '@/core/units/units.js'
import { formatLocaleNumber, parseLocaleNumber } from './parseNumber.js'
import './NumberField.css'

/**
 * Campo numérico com unidade, pensado para medidas exatas.
 *  - Aceita "2,5" ou "2.5".
 *  - Confirma com Enter ou ao sair do campo; Escape repõe o valor.
 *  - Setas ↑/↓ somam/subtraem `step` (Shift = ×10).
 *  - Valores fora de [min, max] são ajustados ao limite.
 * O valor só chega ao exterior por `onCommit`, para que cada edição
 * conte como uma única alteração (importante para o Undo/Redo).
 */
export function NumberField({
  label,
  value,
  onCommit,
  min = -Infinity,
  max = Infinity,
  step = 1,
  precision = 2,
  unit,
  disabled = false,
  hideLabel = false,
  id: idProp,
}) {
  const autoId = useId()
  const id = idProp ?? autoId
  const [draft, setDraft] = useState(null) // null = sem edição em curso
  const [invalid, setInvalid] = useState(false)
  const display = draft ?? formatLocaleNumber(value, precision)

  const commit = (next) => {
    const factor = 10 ** precision
    const rounded = Math.round(clamp(next, min, max) * factor) / factor
    setDraft(null)
    setInvalid(false)
    if (rounded !== value) onCommit(rounded)
  }

  const commitDraft = () => {
    if (draft === null) return
    const parsed = parseLocaleNumber(draft)
    if (parsed === null) {
      setDraft(null)
      setInvalid(false)
      return
    }
    commit(parsed)
  }

  const onKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitDraft()
    } else if (event.key === 'Escape') {
      setDraft(null)
      setInvalid(false)
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      const base = parseLocaleNumber(display) ?? value
      const delta = (event.key === 'ArrowUp' ? 1 : -1) * step * (event.shiftKey ? 10 : 1)
      commit(base + delta)
    }
  }

  return (
    <div className={`number-field${hideLabel ? ' number-field--compact' : ''}`}>
      <label htmlFor={id} className={hideLabel ? 'visually-hidden' : 'number-field__label'}>
        {label}
      </label>
      <div className="number-field__control" data-invalid={invalid || undefined}>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          value={display}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          onChange={(event) => {
            setDraft(event.target.value)
            setInvalid(parseLocaleNumber(event.target.value) === null)
          }}
          onBlur={commitDraft}
          onKeyDown={onKeyDown}
        />
        {unit && (
          <span className="number-field__unit" aria-hidden="true">
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}
