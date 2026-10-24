import { ChevronDown } from 'lucide-react'
import { useId, useState } from 'react'
import './PanelSection.css'

/** Secção recolhível de um painel lateral. */
export function PanelSection({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  const contentId = useId()
  return (
    <section className="panel-section" data-open={open || undefined}>
      <h3 className="panel-section__heading">
        <button type="button" aria-expanded={open} aria-controls={contentId} onClick={() => setOpen(!open)}>
          <span>{title}</span>
          <ChevronDown size={14} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </h3>
      <div id={contentId} className="panel-section__content" hidden={!open}>
        {children}
      </div>
    </section>
  )
}

/** Linha de campos lado a lado (ex.: comprimento e largura). */
export function FieldGrid({ columns = 2, children }) {
  return (
    <div className="field-grid" style={{ '--columns': columns }}>
      {children}
    </div>
  )
}
