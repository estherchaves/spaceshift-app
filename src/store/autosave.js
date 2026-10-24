import { useProjectStore } from './projectStore.js'
import { notify } from './toastStore.js'

/*
 * Gravação automática. Cada alteração ao documento agenda uma gravação
 * `delay` ms depois da última (várias alterações seguidas dão uma só
 * escrita). `flush()` grava já: usado pelo botão Guardar, por Ctrl+S, ao
 * voltar à lista de projetos e quando a página é escondida ou fechada.
 */

export const AUTOSAVE_DELAY = 800

let active = null

/** Grava já o projeto aberto (botão Guardar, Ctrl+S, voltar à lista). */
export function saveNow() {
  return active ? active.flush() : Promise.resolve(true)
}

/**
 * @param {{repository: import('@/services/persistence/ProjectRepository.js').ProjectRepository, delay?: number, store?: typeof useProjectStore}} options
 * @returns {{flush: () => Promise<boolean>, stop: () => void}}
 */
export function startAutosave({ repository, delay = AUTOSAVE_DELAY, store = useProjectStore }) {
  let timer = null
  let running = null

  const save = async () => {
    clearTimeout(timer)
    timer = null
    // Uma gravação de cada vez; se houver outra a decorrer, espera por ela.
    if (running) await running
    const state = store.getState()
    if (!state.dirty) return true
    const project = state.project
    state.markSaving()
    running = repository
      .save(project)
      .then(({ savedAt }) => {
        store.getState().markSaved(project, savedAt)
        return true
      })
      .catch((error) => {
        const message = error?.message ?? 'Não foi possível guardar o projeto.'
        // Só avisa na primeira falha seguida, para não repetir a cada alteração.
        if (store.getState().saveStatus !== 'error') notify(message, { tone: 'error' })
        store.getState().markSaveFailed(message)
        return false
      })
      .finally(() => {
        running = null
      })
    const ok = await running
    // Alterações feitas durante a gravação ficam agendadas.
    if (ok && store.getState().dirty) schedule()
    return ok
  }

  const schedule = () => {
    clearTimeout(timer)
    timer = setTimeout(save, delay)
  }

  const unsubscribe = store.subscribe((state, previous) => {
    if (state.project !== previous.project && state.dirty) schedule()
  })

  const handle = {
    flush: save,
    stop: () => {
      clearTimeout(timer)
      unsubscribe()
      if (active === handle) active = null
    },
  }
  active = handle
  return handle
}
