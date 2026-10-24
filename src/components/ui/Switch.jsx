import { useId } from 'react'
import './Switch.css'

export function Switch({ label, description, checked, onChange }) {
  const labelId = useId()
  const descriptionId = useId()
  return (
    <div className="switch-field">
      <div className="switch-field__text">
        <span id={labelId} className="switch-field__label">
          {label}
        </span>
        {description && (
          <span id={descriptionId} className="switch-field__description">
            {description}
          </span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={description ? descriptionId : undefined}
        className="switch"
        onClick={() => onChange(!checked)}
      >
        <span className="switch__thumb" />
      </button>
    </div>
  )
}
