import { useRef } from 'react'
import { Tooltip } from './Tooltip.jsx'
import './SegmentedControl.css'

/**
 * Grupo de opções exclusivas (ex.: 2D / 3D). Segue o padrão ARIA
 * radiogroup: setas esquerda/direita mudam de opção.
 * Opções desativadas podem ter um `hint` a explicar porquê.
 */
export function SegmentedControl({ label, value, onChange, options, size = 'md' }) {
  const refs = useRef([])
  const enabled = options.filter((o) => !o.disabled)

  const onKeyDown = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    event.preventDefault()
    const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1
    const current = enabled.findIndex((o) => o.value === value)
    const next = enabled[(current + direction + enabled.length) % enabled.length]
    onChange(next.value)
    refs.current[options.indexOf(next)]?.focus()
  }

  return (
    <div role="radiogroup" aria-label={label} className={`segmented segmented--${size}`} onKeyDown={onKeyDown}>
      {options.map((option, index) => {
        const Icon = option.icon
        const checked = option.value === value
        const button = (
          <button
            key={option.value}
            ref={(node) => (refs.current[index] = node)}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-disabled={option.disabled || undefined}
            aria-label={option.hint ? `${option.label} (${option.hint})` : undefined}
            tabIndex={checked ? 0 : -1}
            className="segmented__option"
            onClick={() => !option.disabled && onChange(option.value)}
          >
            {Icon && <Icon size={14} strokeWidth={1.75} aria-hidden="true" />}
            <span>{option.label}</span>
          </button>
        )
        return option.disabled && option.hint ? (
          <Tooltip key={option.value} content={option.hint}>
            {button}
          </Tooltip>
        ) : (
          button
        )
      })}
    </div>
  )
}
