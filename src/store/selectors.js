import { getActiveLayout, occupiedArea, roomArea } from '@/core/model'
import { checkInsideRoom, itemsOverlap } from '@/core/geometry'

/*
 * Seletores e derivações do estado. Com o Zustand v5 um seletor não pode
 * devolver um objeto novo a cada chamada, por isso as derivações
 * compostas (métricas) são funções puras usadas com useMemo.
 */

export const selectProject = (state) => state.project
export const selectRoom = (state) => state.project.room
export const selectSettings = (state) => state.project.settings
export const selectProjectName = (state) => state.project.name
export const selectDirty = (state) => state.dirty
export const selectActiveItems = (state) => getActiveLayout(state.project).items

/** Revestimentos de chão (ex.: tapetes) podem ficar debaixo de outros móveis. */
const FLOOR_COVERING_MAX_HEIGHT = 0.03

/**
 * Métricas para a barra inferior. A contagem de conflitos usa a geometria
 * real (SAT e cantos rodados); a análise completa, com circulação e
 * mensagens explicativas, chega na Fase 6.
 */
export function computeLayoutMetrics(room, items) {
  const outside = items.filter((item) => !checkInsideRoom(item, room).inside).length
  const solid = items.filter((item) => !item.elevation && item.dimensions.height > FLOOR_COVERING_MAX_HEIGHT)
  let overlaps = 0
  for (let i = 0; i < solid.length; i++) {
    for (let j = i + 1; j < solid.length; j++) {
      if (itemsOverlap(solid[i], solid[j]).overlapping) overlaps++
    }
  }
  return {
    roomArea: roomArea(room),
    occupiedArea: occupiedArea(items),
    itemCount: items.length,
    outside,
    overlaps,
    conflicts: outside + overlaps,
  }
}
