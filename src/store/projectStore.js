import { create } from 'zustand'
import {
  addItem,
  applyRoomPatch,
  applySettingsPatch,
  createFurnitureItem,
  createProject,
  DEFAULT_SIZE_BOUNDS,
  duplicateItem,
  findItem,
  getActiveLayout,
  removeItem,
  sanitizeProjectName,
  updateItem,
} from '@/core/model'
import { findFreePosition, snapItemPosition } from '@/core/editing'
import { getCatalogEntry, getSizeBounds } from '@/data/catalog/furniture.js'

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

export const useProjectStore = create((set, get) => {
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

    /**
     * Adiciona um móvel do catálogo. Sem posição, procura o espaço livre
     * mais próximo do centro; com posição (largar na planta), respeita-a
     * e só aplica o snap. Devolve o id do novo móvel (ou null).
     */
    addFromCatalog: (catalogId, position) => {
      const entry = getCatalogEntry(catalogId)
      if (!entry) return null
      const { project } = get()
      const { room, settings } = project
      const draft = createFurnitureItem(entry)
      const items = getActiveLayout(project).items
      const centre = { x: room.width / 2, z: room.depth / 2 }
      const valid = position && Number.isFinite(position.x) && Number.isFinite(position.z)
      const placed = valid
        ? snapItemPosition(draft, position, settings.gridSize, settings.snapToGrid)
        : findFreePosition(room, items, draft, centre, { step: Math.max(settings.gridSize, 0.05) })
      const item = { ...draft, position: placed }
      change((current) => addItem(current, item))
      return item.id
    },

    updateItem: (itemId, patch) =>
      change((project) => {
        const item = findItem(project, itemId)
        if (!item) return project
        return updateItem(project, itemId, patch, { bounds: getSizeBounds(item.catalogId, DEFAULT_SIZE_BOUNDS) })
      }),

    removeItem: (itemId) => change((project) => removeItem(project, itemId)),

    /** Duplica e devolve o id da cópia (ou null). */
    duplicateItem: (itemId) => {
      let newId = null
      change((project) => {
        const result = duplicateItem(project, itemId)
        newId = result.itemId
        return result.project
      })
      return newId
    },

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
