import { Check } from 'lucide-react'
import { useId } from 'react'
import './ColorField.css'

/**
 * Escolha de cor: amostras sugeridas (radio) + seletor livre nativo.
 * @param {{value: string, label: string}[]} swatches
 */
export function ColorField({ label, description, value, onChange, swatches = [] }) {
  const labelId = useId()
  const customId = useId()
  const isCustom = !swatches.some((s) => s.value.toLowerCase() === value.toLowerCase())
  return (
    <div className="color-field" role="group" aria-labelledby={labelId}>
      <span id={labelId} className="color-field__label">
        {label}
      </span>
      <div className="color-field__swatches">
        {swatches.map((swatch) => {
          const selected = swatch.value.toLowerCase() === value.toLowerCase()
          return (
            <button
              key={swatch.value}
              type="button"
              className="color-field__swatch"
              style={{ '--swatch': swatch.value }}
              aria-label={swatch.label}
              aria-pressed={selected}
              title={swatch.label}
              onClick={() => onChange(swatch.value)}
            >
              {selected && <Check size={12} strokeWidth={2.5} aria-hidden="true" />}
            </button>
          )
        })}
        <label
          htmlFor={customId}
          className="color-field__swatch color-field__custom"
          data-active={isCustom || undefined}
          style={{ '--swatch': value }}
          title="Cor personalizada"
        >
          <span className="visually-hidden">Cor personalizada</span>
          <input id={customId} type="color" value={value} onChange={(event) => onChange(event.target.value)} />
        </label>
      </div>
      {description && <span className="color-field__description">{description}</span>}
    </div>
  )
}
