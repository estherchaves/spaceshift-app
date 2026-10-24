import { useMemo } from 'react'
import { getActiveLayout, occupiedArea, roomArea } from '@/core/model'
import { checkInsideRoom, itemsOverlap } from '@/core/geometry'
import { isSolid } from '@/core/editing'
import { useEditorStore } from './editorStore.js'
import { useProjectStore } from './projectStore.js'

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

/**
 * Métricas para a barra inferior. A contagem de conflitos usa a geometria
 * real (SAT e cantos rodados); a análise completa, com circulação e
 * mensagens explicativas, chega na Fase 6.
 */
export function computeLayoutMetrics(room, items) {
  const conflictIds = new Set()
  let outside = 0
  for (const item of items) {
    if (!checkInsideRoom(item, room).inside) {
      outside++
      conflictIds.add(item.id)
    }
  }
  const solid = items.filter(isSolid)
  let overlaps = 0
  for (let i = 0; i < solid.length; i++) {
    for (let j = i + 1; j < solid.length; j++) {
      if (itemsOverlap(solid[i], solid[j]).overlapping) {
        overlaps++
        conflictIds.add(solid[i].id)
        conflictIds.add(solid[j].id)
      }
    }
  }
  return {
    roomArea: roomArea(room),
    occupiedArea: occupiedArea(items),
    itemCount: items.length,
    outside,
    overlaps,
    conflicts: outside + overlaps,
    conflictIds,
  }
}

/**
 * Móveis tal como devem ser mostrados: os do documento com a pré-visualização
 * do gesto em curso aplicada. A planta, a barra inferior e (na Fase 5) a cena
 * 3D usam esta lista, por isso todas as vistas mostram o mesmo estado.
 */
export function useDisplayedItems() {
  const items = useProjectStore(selectActiveItems)
  const interaction = useEditorStore((state) => state.interaction)
  return useMemo(() => {
    if (!interaction?.preview || !interaction.itemId) return items
    return items.map((item) => (item.id === interaction.itemId ? { ...item, ...interaction.preview } : item))
  }, [items, interaction])
}

export function useSelectedItem() {
  const selectedId = useEditorStore((state) => state.selectedItemId)
  const items = useDisplayedItems()
  return useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId])
}
