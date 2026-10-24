import { useId } from 'react'
import { FINISHES } from '@/data/catalog/finishes.js'

/** Acabamentos disponíveis para o modelo (radio group com amostra de cor). */
export function FinishPicker({ finishes, value, onChange, disabled }) {
  const labelId = useId()
  return (
    <div className="finish-picker">
      <span id={labelId} className="finish-picker__label">
        Acabamento
      </span>
      <div className="finish-picker__options" role="radiogroup" aria-labelledby={labelId}>
        {finishes.map((key) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={value === key}
            aria-disabled={disabled || undefined}
            className="finish-chip"
            onClick={() => !disabled && onChange(key)}
          >
            <span className="finish-chip__swatch" style={{ background: FINISHES[key].color }} aria-hidden="true" />
            {FINISHES[key].label}
          </button>
        ))}
      </div>
    </div>
  )
}
