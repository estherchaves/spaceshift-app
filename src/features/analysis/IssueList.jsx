import { CircleX, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui'
import { applyIssueFix, focusIssue } from '@/store/commands.js'
import { useEditorStore } from '@/store/editorStore.js'
import './Analysis.css'

const SEVERITY = {
  error: { icon: CircleX, label: 'Erro' },
  warning: { icon: TriangleAlert, label: 'Aviso' },
}

/**
 * Lista de problemas. Clicar num problema seleciona o móvel e realça o
 * marcador nas vistas; quando há correção automática aparece um botão.
 */
export function IssueList({ issues, compact = false, lockedIds = new Set() }) {
  const focusedId = useEditorStore((state) => state.focusedIssueId)
  return (
    <ul className="issue-list" data-compact={compact || undefined}>
      {issues.map((issue) => {
        const { icon: Icon, label } = SEVERITY[issue.severity]
        const fixLocked = issue.fix && lockedIds.has(issue.fix.itemId)
        return (
          <li key={issue.id} className="issue" data-severity={issue.severity} data-focused={issue.id === focusedId || undefined}>
            <button type="button" className="issue__main" onClick={() => focusIssue(issue)} aria-describedby={`${issue.id}-hint`}>
              <Icon className="issue__icon" size={15} strokeWidth={2} aria-label={label} />
              <span className="issue__text">
                <span className="issue__title">{issue.title}</span>
                <span className="issue__message">{issue.message}</span>
                <span className="issue__hint" id={`${issue.id}-hint`}>
                  {issue.hint}
                </span>
              </span>
            </button>
            {issue.fix && (
              <Button
                size="sm"
                variant="secondary"
                className="issue__fix"
                disabled={fixLocked}
                disabledReason="Desbloqueie o móvel para o mover"
                onClick={() => applyIssueFix(issue)}
              >
                Trazer para dentro
              </Button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
