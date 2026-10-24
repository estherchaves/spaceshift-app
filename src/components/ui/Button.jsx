import { useId } from 'react'
import { Tooltip } from './Tooltip.jsx'
import './Button.css'

/**
 * Botão base. Quando está desativado usamos aria-disabled em vez de
 * `disabled`, para continuar focável e poder explicar o motivo
 * (`disabledReason`) a quem usa teclado ou leitor de ecrã.
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  disabled = false,
  disabledReason,
  showReasonTooltip = true,
  tooltipAlign,
  className = '',
  onClick,
  children,
  type = 'button',
  ...rest
}) {
  const reasonId = useId()
  const handleClick = (event) => {
    if (disabled) {
      event.preventDefault()
      return
    }
    onClick?.(event)
  }
  const button = (
    <button
      type={type}
      className={`btn btn--${variant} btn--${size} ${className}`.trim()}
      aria-disabled={disabled || undefined}
      aria-describedby={disabled && disabledReason ? reasonId : undefined}
      onClick={handleClick}
      {...rest}
    >
      {Icon && <Icon className="btn__icon" size={size === 'sm' ? 14 : 16} strokeWidth={1.75} aria-hidden="true" />}
      {children && <span className="btn__label">{children}</span>}
      {disabled && disabledReason && (
        <span id={reasonId} className="visually-hidden">
          {disabledReason}
        </span>
      )}
    </button>
  )
  return disabled && disabledReason && showReasonTooltip ? <Tooltip content={disabledReason} align={tooltipAlign}>{button}</Tooltip> : button
}

/** Botão só com ícone: o rótulo é obrigatório e aparece como tooltip. */
export function IconButton({ icon, label, shortcut, disabled, disabledReason, tooltipPlacement, tooltipAlign, ...rest }) {
  const tip = disabled && disabledReason ? `${label} · ${disabledReason}` : shortcut ? `${label} (${shortcut})` : label
  return (
    <Tooltip content={tip} placement={tooltipPlacement} align={tooltipAlign}>
      <Button
        variant="ghost"
        icon={icon}
        aria-label={label}
        disabled={disabled}
        disabledReason={disabledReason}
        showReasonTooltip={false}
        className="btn--icon-only"
        {...rest}
      />
    </Tooltip>
  )
}
