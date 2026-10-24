import { ArrowLeft, TriangleAlert } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { navigate, projectsPath } from '@/app/router.js'
import { Logo } from '@/components/brand/Logo.jsx'
import { Button } from '@/components/ui'
import { loadStoredProject } from '@/features/projects/projectActions.js'
import { resetEditorStore } from '@/store/editorStore.js'
import { useProjectStore } from '@/store/projectStore.js'
import './EditorRoute.css'

/*
 * O editor (planta, painéis, análise) vem num ficheiro à parte: a lista de
 * projetos abre mais depressa e o código do editor descarrega-se ao mesmo
 * tempo que o projeto é lido.
 */
let editorModule = null
const loadEditorPage = () => (editorModule ??= import('./EditorPage.jsx'))
const EditorPage = lazy(() => loadEditorPage().then((module) => ({ default: module.EditorPage })))

/**
 * Abre um projeto guardado e mostra o editor. Um projeto inexistente ou
 * com dados danificados mostra o motivo e um caminho de volta, sem
 * bloquear a aplicação.
 */
export function EditorRoute({ projectId }) {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    loadEditorPage()
    loadStoredProject(projectId).then((result) => {
      if (cancelled) return
      if (!result.ok) {
        setState({ status: 'error', error: result.error })
        return
      }
      resetEditorStore()
      useProjectStore.getState().loadProject(result.project, { savedAt: result.project.updatedAt })
      setState({ status: 'ready' })
    })
    return () => {
      cancelled = true
    }
  }, [projectId])

  const loading = (
    <div className="editor-route" role="status">
      <Logo />
      <p className="editor-route__text">A abrir o projeto…</p>
    </div>
  )
  if (state.status === 'ready') {
    return (
      <Suspense fallback={loading}>
        <EditorPage />
      </Suspense>
    )
  }
  if (state.status === 'loading') return loading
  return (
    <div className="editor-route">
      <span className="editor-route__icon">
        <TriangleAlert size={20} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <h1 className="editor-route__title">
        {state.error.code === 'not-found' ? 'Projeto não encontrado' : 'Não foi possível abrir o projeto'}
      </h1>
      <p className="editor-route__text">{state.error.message}</p>
      {state.error.details?.length > 0 && (
        <ul className="editor-route__details">
          {state.error.details.slice(0, 5).map((detail) => (
            <li key={detail.path}>
              <code>{detail.path}</code> {detail.message}
            </li>
          ))}
        </ul>
      )}
      <Button variant="primary" icon={ArrowLeft} onClick={() => navigate(projectsPath())}>
        Voltar aos projetos
      </Button>
    </div>
  )
}
