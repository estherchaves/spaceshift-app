import { ChevronDown } from 'lucide-react'
import { useId } from 'react'
import './Select.css'

/** Select nativo (acessível e com bom suporte móvel) com estilo próprio. */
export function Select({ label, value, onChange, options, hideLabel = false, id: idProp }) {
  const autoId = useId()
  const id = idProp ?? autoId
  return (
    <div className="select-field">
      <label htmlFor={id} className={hideLabel ? 'visually-hidden' : 'select-field__label'}>
        {label}
      </label>
      <div className="select-field__control">
        <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown size={14} strokeWidth={1.75} aria-hidden="true" className="select-field__chevron" />
      </div>
    </div>
  )
}
