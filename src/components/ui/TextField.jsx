import { useId } from 'react'
import './TextField.css'

/** Campo de texto simples com etiqueta e mensagem de erro opcional. */
export function TextField({ label, value, onChange, error, maxLength, placeholder, autoFocus = false, id: idProp, ...rest }) {
  const autoId = useId()
  const id = idProp ?? autoId
  const errorId = useId()
  return (
    <div className="text-field">
      <label htmlFor={id} className="text-field__label">
        {label}
      </label>
      <input
        id={id}
        className="text-field__input"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete="off"
        data-autofocus={autoFocus || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        {...rest}
      />
      {error && (
        <span id={errorId} className="text-field__error">
          {error}
        </span>
      )}
    </div>
  )
}
