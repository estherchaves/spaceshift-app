import { create } from 'zustand'
import {
  applyRoomPatch,
  applySettingsPatch,
  createProject,
  sanitizeProjectName,
} from '@/core/model'

/**
 * Store do documento: o projeto que é guardado, exportado e partilhado
 * pelas vistas 2D e 3D. Todas as alterações passam por estas ações, que
 * usam as funções puras de core/model para garantir um estado válido.
 *
 * `dirty` indica alterações ainda não guardadas (a gravação chega na Fase 7).
 */
function createInitialProject() {
  return createProject({ name: 'Sala de estar', roomType: 'living' })
}

export const useProjectStore = create((set) => {
  /** Aplica uma alteração ao projeto e marca-o como modificado. */
  const change = (recipe) =>
    set((state) => {
      const next = recipe(state.project)
      if (next === state.project) return state
      return { project: { ...next, updatedAt: new Date().toISOString() }, dirty: true }
    })

  return {
    project: createInitialProject(),
    dirty: false,

    renameProject: (name) =>
      change((project) => {
        const clean = sanitizeProjectName(name)
        return clean && clean !== project.name ? { ...project, name: clean } : project
      }),

    updateRoom: (patch) =>
      change((project) => {
        const room = applyRoomPatch(project.room, patch)
        return shallowEqual(room, project.room) ? project : { ...project, room }
      }),

    updateSettings: (patch) =>
      change((project) => {
        const settings = applySettingsPatch(project.settings, patch)
        return shallowEqual(settings, project.settings) ? project : { ...project, settings }
      }),

    /** Substitui o projeto (abrir, importar). O projeto já vem validado. */
    loadProject: (project) => set({ project, dirty: false }),
  }
})

export function resetProjectStore() {
  useProjectStore.setState({ project: createInitialProject(), dirty: false })
}

function shallowEqual(a, b) {
  const keys = Object.keys(a)
  return keys.length === Object.keys(b).length && keys.every((key) => Object.is(a[key], b[key]))
}
