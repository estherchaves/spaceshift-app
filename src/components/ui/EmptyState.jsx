import './EmptyState.css'

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="empty-state">
      {Icon && (
        <span className="empty-state__icon">
          <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
        </span>
      )}
      <p className="empty-state__title">{title}</p>
      {children && <p className="empty-state__text">{children}</p>}
      {action}
    </div>
  )
}
