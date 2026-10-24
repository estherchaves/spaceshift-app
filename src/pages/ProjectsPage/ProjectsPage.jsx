import { Download, HardDrive, Plus, Sparkles, Upload } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { promptInstall, usePwaStore } from '@/app/pwaStore.js'
import { editorPath, navigate } from '@/app/router.js'
import { Logo } from '@/components/brand/Logo.jsx'
import { Button, ConfirmDialog, SearchField, Select } from '@/components/ui'
import { NameDialog } from '@/features/projects/NameDialog.jsx'
import { NewProjectDialog } from '@/features/projects/NewProjectDialog.jsx'
import { ProjectCard } from '@/features/projects/ProjectCard.jsx'
import {
  createExample,
  createNewProject,
  deleteStoredProject,
  duplicateStoredProject,
  importProjectFile,
  loadStoredProject,
  renameStoredProject,
} from '@/features/projects/projectActions.js'
import { useProjects } from '@/features/projects/useProjects.js'
import { exportProjectJson } from '@/services/export/projectFile.js'
import { notify } from '@/store/toastStore.js'
import './ProjectsPage.css'

const SORT_OPTIONS = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'name', label: 'Nome (A–Z)' },
]

const collator = new Intl.Collator('pt-PT', { sensitivity: 'base' })
const normalize = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Lista de projetos guardados neste browser: criar, abrir, mudar o nome,
 * duplicar, exportar, importar e eliminar (com confirmação).
 */
export function ProjectsPage() {
  const { status, projects, error, reload, persistent } = useProjects()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recent')
  const [dialog, setDialog] = useState(null) // { type: 'new'|'rename'|'delete', summary? }
  const [busy, setBusy] = useState(false)
  const fileInput = useRef(null)
  const names = projects.map((project) => project.name)

  const visible = useMemo(() => {
    const q = normalize(query.trim())
    const list = q ? projects.filter((project) => normalize(project.name).includes(q)) : projects
    return sort === 'name' ? [...list].sort((a, b) => collator.compare(a.name, b.name)) : list
  }, [projects, query, sort])

  /** Corre uma ação com feedback: erros aparecem como notificação. */
  const run = async (action) => {
    setBusy(true)
    try {
      return await action()
    } catch (err) {
      notify(err?.message ?? 'Algo correu mal.', { tone: 'error' })
      return null
    } finally {
      setBusy(false)
    }
  }

  const open = (summary) => navigate(editorPath(summary.id))

  const create = (values) =>
    run(async () => {
      const project = await createNewProject(values)
      setDialog(null)
      navigate(editorPath(project.id))
    })

  const openExample = () =>
    run(async () => {
      const project = await createExample(names)
      navigate(editorPath(project.id))
    })

  const rename = (summary, name) =>
    run(async () => {
      await renameStoredProject(summary.id, name)
      setDialog(null)
      reload()
    })

  const duplicate = (summary) =>
    run(async () => {
      const copy = await duplicateStoredProject(summary.id, names)
      reload()
      notify(`Criada a cópia «${copy.name}».`, { tone: 'success' })
    })

  const exportJson = (summary) =>
    run(async () => {
      const result = await loadStoredProject(summary.id)
      if (!result.ok) throw new Error(result.error.message)
      const fileName = exportProjectJson(result.project)
      notify(`Exportado como ${fileName}.`, { tone: 'success' })
    })

  const remove = (summary) =>
    run(async () => {
      await deleteStoredProject(summary.id)
      setDialog(null)
      reload()
      notify(`«${summary.name}» foi eliminado.`)
    })

  const importFile = (file) =>
    run(async () => {
      const result = await importProjectFile(file, projects)
      if (!result.ok) {
        notify(`Não foi possível importar: ${result.error.message}`, { tone: 'error' })
        return
      }
      reload()
      notify(result.copied ? `Importado como cópia: «${result.project.name}».` : `Importado «${result.project.name}».`, {
        tone: 'success',
        action: { label: 'Abrir', onClick: () => navigate(editorPath(result.project.id)) },
      })
    })

  const empty = status === 'ready' && projects.length === 0
  const canInstall = usePwaStore((state) => Boolean(state.installPrompt) && !state.installed)

  return (
    <div className="projects-page">
      <header className="projects-header">
        <Logo />
        <div className="projects-header__actions">
          {canInstall && (
            <Button
              icon={Download}
              className="projects-header__import"
              aria-label="Instalar o SpaceShift como app"
              title="Instalar como app: abre em janela própria e funciona sem internet"
              onClick={promptInstall}
            >
              Instalar app
            </Button>
          )}
          <Button icon={Upload} onClick={() => fileInput.current?.click()} className="projects-header__import" aria-label="Importar projeto (JSON)">
            Importar
          </Button>
          <Button variant="primary" icon={Plus} onClick={() => setDialog({ type: 'new' })}>
            Novo projeto
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            className="visually-hidden"
            tabIndex={-1}
            aria-label="Importar projeto (ficheiro JSON)"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) importFile(file)
            }}
          />
        </div>
      </header>

      <main className="projects-main">
        <div className="projects-intro">
          <div>
            <h1 className="projects-title">Projetos</h1>
            <p className="projects-subtitle">
              <HardDrive size={13} strokeWidth={1.75} aria-hidden="true" />
              {persistent ? 'Guardados neste browser' : 'O browser não permite guardar: os projetos perdem-se ao fechar a página'}
              {status === 'ready' && projects.length > 0 && ` · ${projects.length} ${projects.length === 1 ? 'projeto' : 'projetos'}`}
            </p>
          </div>
          {projects.length > 1 && (
            <div className="projects-tools">
              <SearchField label="Procurar projetos" value={query} onChange={setQuery} placeholder="Procurar projetos" />
              <Select label="Ordenar" hideLabel value={sort} onChange={setSort} options={SORT_OPTIONS} />
            </div>
          )}
        </div>

        {status === 'error' && <p className="projects-error">{error}</p>}

        {empty && (
          <section className="projects-empty" aria-labelledby="projects-empty-title">
            <div className="projects-empty__art" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <h2 id="projects-empty-title">Comece pela sua primeira divisão</h2>
            <p>
              Desenhe a divisão à escala, coloque móveis com as medidas reais e veja logo se cabem e se ainda se passa à
              vontade. Tudo fica guardado neste browser.
            </p>
            <div className="projects-empty__actions">
              <Button variant="primary" icon={Plus} onClick={() => setDialog({ type: 'new' })}>
                Criar projeto
              </Button>
              <Button icon={Sparkles} onClick={openExample} disabled={busy}>
                Abrir projeto de exemplo
              </Button>
            </div>
          </section>
        )}

        {status === 'ready' && projects.length > 0 && (
          <>
            <div className="projects-grid">
              {!query && (
                <button type="button" className="project-new" onClick={() => setDialog({ type: 'new' })}>
                  <span className="project-new__icon">
                    <Plus size={18} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <span className="project-new__label">Novo projeto</span>
                  <span className="project-new__hint">Sala, quarto, escritório…</span>
                </button>
              )}
              {visible.map((summary) => (
                <ProjectCard
                  key={summary.id}
                  summary={summary}
                  onOpen={open}
                  onRename={(s) => setDialog({ type: 'rename', summary: s })}
                  onDuplicate={duplicate}
                  onExport={exportJson}
                  onDelete={(s) => setDialog({ type: 'delete', summary: s })}
                />
              ))}
            </div>
            {visible.length === 0 && <p className="projects-none">Nenhum projeto com «{query}».</p>}
          </>
        )}
      </main>

      <NewProjectDialog open={dialog?.type === 'new'} busy={busy} onCreate={create} onCancel={() => setDialog(null)} />
      <NameDialog
        open={dialog?.type === 'rename'}
        title="Mudar o nome do projeto"
        label="Nome do projeto"
        initialName={dialog?.summary?.name ?? ''}
        onConfirm={(name) => rename(dialog.summary, name)}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog?.type === 'delete'}
        danger
        busy={busy}
        title={dialog?.summary?.broken ? 'Eliminar projeto danificado?' : `Eliminar «${dialog?.summary?.name}»?`}
        description="O projeto e todas as suas disposições são apagados deste browser. Esta ação não pode ser anulada; se quiser guardar uma cópia, exporte-o primeiro."
        confirmLabel="Eliminar projeto"
        onConfirm={() => remove(dialog.summary)}
        onCancel={() => setDialog(null)}
      />
    </div>
  )
}
