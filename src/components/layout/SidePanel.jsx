import './SidePanel.css'

export function SidePanel({ title, label, meta, toolbar, children }) {
  return (
    <aside className="side-panel" aria-label={label ?? title}>
      <div className="side-panel__header">
        <h2 className="side-panel__title">{title}</h2>
        {meta && <span className="side-panel__meta">{meta}</span>}
      </div>
      {toolbar && <div className="side-panel__toolbar">{toolbar}</div>}
      <div className="side-panel__body scroll-area">{children}</div>
    </aside>
  )
}
