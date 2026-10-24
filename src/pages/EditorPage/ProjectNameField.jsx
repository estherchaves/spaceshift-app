import { Pencil } from 'lucide-react'
import { useRef, useState } from 'react'
import './ProjectNameField.css'

/**
 * Nome do projeto editável no sítio: clicar abre um campo de texto,
 * Enter ou sair confirma, Escape cancela.
 */
export function ProjectNameField({ name, onRename }) {
  const [draft, setDraft] = useState(null)
  const cancelled = useRef(false)

  if (draft === null) {
    return (
      <button
        type="button"
        className="project-name"
        onClick={() => {
          cancelled.current = false
          setDraft(name)
        }}
        aria-label={`Nome do projeto: ${name}. Clique para alterar.`}
      >
        <span className="project-name__text">{name}</span>
        <Pencil size={12} strokeWidth={1.75} aria-hidden="true" className="project-name__icon" />
      </button>
    )
  }

  const finish = () => {
    if (!cancelled.current) onRename(draft)
    setDraft(null)
  }

  return (
    <input
      className="project-name project-name--editing"
      aria-label="Nome do projeto"
      value={draft}
      maxLength={80}
      autoFocus
      onFocus={(event) => event.target.select()}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={finish}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
        if (event.key === 'Escape') {
          cancelled.current = true
          event.currentTarget.blur()
        }
      }}
    />
  )
}
