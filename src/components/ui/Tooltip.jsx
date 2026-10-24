import './Tooltip.css'

/**
 * Tooltip apenas com CSS: aparece em hover e quando o filho recebe foco
 * pelo teclado. O texto é decorativo para quem vê; a informação acessível
 * deve estar no próprio controlo (aria-label / aria-describedby).
 */
export function Tooltip({ content, placement = 'bottom', align = 'center', children }) {
  if (!content) return children
  return (
    <span className="tooltip" data-placement={placement} data-align={align}>
      {children}
      <span className="tooltip__bubble" aria-hidden="true">
        {content}
      </span>
    </span>
  )
}
