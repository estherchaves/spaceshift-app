import { create } from 'zustand'
import {
  addItem,
  addLayout,
  applyOpeningPatch,
  applyRouteStepPatch,
  applyRoomPatch,
  applySettingsPatch,
  createFurnitureItem,
  createOpening,
  createProject,
  createRouteStep,
  DEFAULT_SIZE_BOUNDS,
  duplicateItem,
  findItem,
  getActiveLayout,
  LIMITS,
  OPENING_TYPES,
  openingLabels,
  removeItem,
  removeLayout,
  renameLayout,
  ROUTE_LIMITS,
  sanitizeProjectName,
  setActiveLayout,
  updateItem,
} from '@/core/model'
import { findFreePosition, snapItemPosition } from '@/core/editing'
import { createHistory, recordChange, redo, undo } from '@/core/history'
import { getCatalogEntry, getSizeBounds } from '@/data/catalog/furniture.js'

/**
 * Store do documento: o projeto que é guardado, exportado e partilhado
 * pelas vistas 2D e 3D. Todas as alterações passam por estas ações, que
 * usam as funções puras de core/model para garantir um estado válido.
 *
 * Histórico: cada ação que muda o documento regista UMA entrada, com um
 * nome legível ("Mover Sofá"). Os gestos na planta e na cena 3D só mudam
 * o documento ao largar, por isso também dão uma entrada cada.
 *
 * Gravação: `savedProject` é a última versão gravada. Há alterações por
 * guardar quando o projeto atual é outro objeto, o que também funciona
 * depois de anular: voltar ao estado gravado deixa de estar "por guardar".
 * `saveStatus`: 'saved' | 'unsaved' | 'saving' | 'error'.
 */
function createInitialProject() {
  return createProject({ name: 'Sala de estar', roomType: 'living' })
}

const ITEM_PATCH_LABELS = [
  ['position', 'Mover'],
  ['rotation', 'Rodar'],
  ['dimensions', 'Redimensionar'],
  ['finish', 'Mudar o acabamento de'],
  ['color', 'Mudar a cor de'],
  ['elevation', 'Mudar a altura ao chão de'],
]

/** Nome da alteração para o histórico ("Mover Sofá de 3 lugares"). */
export function itemPatchLabel(item, patch) {
  if ('locked' in patch) return `${patch.locked ? 'Bloquear' : 'Desbloquear'} ${item.name}`
  const verb = ITEM_PATCH_LABELS.find(([key]) => key in patch)?.[1] ?? 'Alterar'
  return `${verb} ${item.name}`
}

function initialDocument(project) {
  return {
    project,
    savedProject: project,
    dirty: false,
    history: createHistory(),
    saveStatus: 'saved',
    lastSavedAt: null,
    saveError: null,
  }
}

export const useProjectStore = create((set, get) => {
  /**
   * Aplica uma alteração ao projeto, regista-a no histórico e marca-o como
   * modificado. `record: false` muda o documento sem entrada no histórico
   * (ex.: trocar de disposição, que não é uma edição).
   */
  const change = (recipe, { label, mergeKey = null, record = true } = {}) =>
    set((state) => {
      const next = recipe(state.project)
      if (next === state.project) return state
      const project = { ...next, updatedAt: new Date().toISOString() }
      return {
        project,
        dirty: true,
        saveStatus: state.saveStatus === 'saving' ? 'saving' : 'unsaved',
        history: record ? recordChange(state.history, state.project, { label, mergeKey }) : state.history,
      }
    })

  const changeRoute = (recipe, label) =>
    change(
      (project) => {
        const current = project.room.route ?? { steps: [], entryDoorId: null }
        const route = recipe(current)
        return route === current ? project : { ...project, room: { ...project.room, route } }
      },
      { label },
    )

  /** Anular/refazer: troca o documento por um instantâneo do histórico. */
  const travel = (step) =>
    set((state) => {
      const result = step(state.history, state.project)
      if (!result) return state
      const dirty = result.state !== state.savedProject
      return {
        project: result.state,
        history: result.history,
        dirty,
        saveStatus: dirty ? (state.saveStatus === 'saving' ? 'saving' : 'unsaved') : 'saved',
      }
    })

  return {
    ...initialDocument(createInitialProject()),

    renameProject: (name) =>
      change(
        (project) => {
          const clean = sanitizeProjectName(name)
          return clean && clean !== project.name ? { ...project, name: clean } : project
        },
        { label: 'Mudar o nome do projeto' },
      ),

    updateRoom: (patch) =>
      change(
        (project) => {
          const room = applyRoomPatch(project.room, patch)
          return shallowEqual(room, project.room) ? project : { ...project, room }
        },
        {
          label: 'wallColor' in patch || 'floorColor' in patch || 'floorMaterial' in patch ? 'Mudar os acabamentos da divisão' : 'Alterar a divisão',
          mergeKey: 'wallColor' in patch ? 'room:wallColor' : 'floorColor' in patch ? 'room:floorColor' : null,
        },
      ),

    /**
     * Acrescenta uma porta ou janela à divisão (todas as disposições).
     * Devolve o id, ou null se não houver espaço livre nas paredes.
     */
    addOpening: (type, options = {}) => {
      const { room } = get().project
      if ((room.openings?.length ?? 0) >= LIMITS.openingsPerRoom) return null
      const opening = createOpening(room, type, options)
      if (!opening) return null
      change((project) => ({ ...project, room: { ...project.room, openings: [...(project.room.openings ?? []), opening] } }), {
        label: `Acrescentar ${OPENING_TYPES[opening.type].label.toLowerCase()}`,
      })
      return opening.id
    },

    updateOpening: (id, patch, { label } = {}) =>
      change(
        (project) => {
          const openings = project.room.openings ?? []
          const index = openings.findIndex((o) => o.id === id)
          if (index === -1) return project
          const next = applyOpeningPatch(project.room, openings[index], patch)
          if (Object.keys(next).every((key) => next[key] === openings[index][key])) return project
          return { ...project, room: { ...project.room, openings: openings.with(index, next) } }
        },
        { label: label ?? `${'offset' in patch || 'wall' in patch ? 'Mover' : 'Alterar'} ${openingLabels(get().project.room.openings ?? []).get(id)?.toLowerCase() ?? 'abertura'}` },
      ),

    removeOpening: (id) =>
      change(
        (project) => {
          const openings = project.room.openings ?? []
          if (!openings.some((o) => o.id === id)) return project
          const route = project.room.route?.entryDoorId === id ? { ...project.room.route, entryDoorId: null } : project.room.route
          return { ...project, room: { ...project.room, openings: openings.filter((o) => o.id !== id), route } }
        },
        { label: `Eliminar ${openingLabels(get().project.room.openings ?? []).get(id)?.toLowerCase() ?? 'abertura'}` },
      ),

    /** Caminho de entrega (o que o móvel atravessa até à divisão). */
    addRouteStep: (type) => {
      const route = get().project.room.route ?? { steps: [], entryDoorId: null }
      if (route.steps.length >= ROUTE_LIMITS.steps) return null
      const step = createRouteStep(type)
      changeRoute((r) => ({ ...r, steps: [...r.steps, step] }), `Acrescentar ${step.label.toLowerCase()} ao caminho`)
      return step.id
    },

    updateRouteStep: (id, patch) =>
      changeRoute((r) => {
        const index = r.steps.findIndex((s) => s.id === id)
        if (index === -1) return r
        const next = applyRouteStepPatch(r.steps[index], patch)
        if (Object.keys(next).every((key) => next[key] === r.steps[index][key])) return r
        return { ...r, steps: r.steps.with(index, next) }
      }, 'Alterar o caminho de entrega'),

    removeRouteStep: (id) =>
      changeRoute((r) => (r.steps.some((s) => s.id === id) ? { ...r, steps: r.steps.filter((s) => s.id !== id) } : r), 'Retirar um passo do caminho'),

    moveRouteStep: (id, delta) =>
      changeRoute((r) => {
        const from = r.steps.findIndex((s) => s.id === id)
        const to = from + delta
        if (from === -1 || to < 0 || to >= r.steps.length) return r
        const steps = [...r.steps]
        const [step] = steps.splice(from, 1)
        steps.splice(to, 0, step)
        return { ...r, steps }
      }, 'Reordenar o caminho de entrega'),

    setEntryDoor: (openingId) =>
      changeRoute((r) => {
        const valid = get().project.room.openings?.some((o) => o.id === openingId && o.type === 'door')
        return valid && r.entryDoorId !== openingId ? { ...r, entryDoorId: openingId } : r
      }, 'Mudar a porta de entrada'),

    updateSettings: (patch) =>
      change(
        (project) => {
          const settings = applySettingsPatch(project.settings, patch)
          return shallowEqual(settings, project.settings) ? project : { ...project, settings }
        },
        { label: 'circulationMin' in patch ? 'Mudar a passagem mínima' : 'accessibility' in patch ? 'Mudar o modo de acessibilidade' : 'Mudar as definições da planta' },
      ),

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
      change((current) => addItem(current, item), { label: `Adicionar ${item.name}` })
      return item.id
    },

    updateItem: (itemId, patch) => {
      const item = findItem(get().project, itemId)
      if (!item) return
      // O seletor de cor nativo emite uma alteração por movimento: juntam-se numa só.
      const mergeKey = Object.keys(patch).length === 1 && 'color' in patch ? `color:${itemId}` : null
      change(
        (project) => updateItem(project, itemId, patch, { bounds: getSizeBounds(item.catalogId, DEFAULT_SIZE_BOUNDS) }),
        { label: itemPatchLabel(item, patch), mergeKey },
      )
    },

    removeItem: (itemId) => {
      const item = findItem(get().project, itemId)
      if (!item) return
      change((project) => removeItem(project, itemId), { label: `Eliminar ${item.name}` })
    },

    /** Duplica e devolve o id da cópia (ou null). */
    duplicateItem: (itemId) => {
      const item = findItem(get().project, itemId)
      if (!item) return null
      let newId = null
      change(
        (project) => {
          const result = duplicateItem(project, itemId)
          newId = result.itemId
          return result.project
        },
        { label: `Duplicar ${item.name}` },
      )
      return newId
    },

    /** Nova disposição (vazia ou cópia de outra), que fica ativa. Devolve o id ou null. */
    addLayout: ({ fromLayoutId = null, name } = {}) => {
      let layoutId = null
      change(
        (project) => {
          const result = addLayout(project, { fromLayoutId, name })
          layoutId = result.layoutId
          return result.project
        },
        { label: fromLayoutId ? 'Duplicar disposição' : 'Nova disposição' },
      )
      return layoutId
    },

    renameLayout: (layoutId, name) => change((project) => renameLayout(project, layoutId, name), { label: 'Mudar o nome da disposição' }),

    removeLayout: (layoutId) => {
      const layout = get().project.layouts.find((l) => l.id === layoutId)
      if (!layout) return
      change((project) => removeLayout(project, layoutId), { label: `Eliminar ${layout.name}` })
    },

    /** Trocar de disposição não é uma edição: muda o documento sem entrada no histórico. */
    setActiveLayout: (layoutId) => change((project) => setActiveLayout(project, layoutId), { record: false }),

    undo: () => travel(undo),
    redo: () => travel(redo),

    /** Substitui o projeto (abrir, importar). O projeto já vem validado; o histórico recomeça. */
    loadProject: (project, { savedAt = null } = {}) => set({ ...initialDocument(project), lastSavedAt: savedAt }),

    /** Chamado pela gravação: `project` é a versão que foi gravada. */
    markSaving: () => set({ saveStatus: 'saving', saveError: null }),
    markSaved: (project, savedAt) =>
      set((state) => {
        const dirty = state.project !== project
        return { savedProject: project, dirty, saveStatus: dirty ? 'unsaved' : 'saved', lastSavedAt: savedAt, saveError: null }
      }),
    markSaveFailed: (message) => set({ saveStatus: 'error', saveError: message }),
  }
})

export function resetProjectStore() {
  useProjectStore.setState(initialDocument(createInitialProject()))
}

function shallowEqual(a, b) {
  const keys = Object.keys(a)
  return keys.length === Object.keys(b).length && keys.every((key) => Object.is(a[key], b[key]))
}
