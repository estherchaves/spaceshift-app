import { Search, X } from 'lucide-react'
import { useId } from 'react'
import './SearchField.css'

export function SearchField({ label, value, onChange, placeholder }) {
  const id = useId()
  return (
    <div className="search-field">
      <label htmlFor={id} className="visually-hidden">
        {label}
      </label>
      <Search size={14} strokeWidth={1.75} className="search-field__icon" aria-hidden="true" />
      <input
        id={id}
        type="search"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => event.key === 'Escape' && onChange('')}
      />
      {value && (
        <button type="button" className="search-field__clear" aria-label="Limpar pesquisa" onClick={() => onChange('')}>
          <X size={12} strokeWidth={2} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
