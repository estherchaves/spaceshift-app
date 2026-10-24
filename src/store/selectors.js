import { useMemo } from 'react'
import { analyzeLayout, blockedFloorArea } from '@/core/analysis'
import { getActiveLayout, roomArea } from '@/core/model'
import { getItemProfile } from '@/data/catalog/furniture.js'
import { useEditorStore } from './editorStore.js'
import { useProjectStore } from './projectStore.js'

/*
 * Seletores e derivações do estado. Com o Zustand v5 um seletor não pode
 * devolver um objeto novo a cada chamada, por isso as derivações
 * compostas (métricas, análise) são funções puras memorizadas.
 */

export const selectProject = (state) => state.project
export const selectRoom = (state) => state.project.room
export const selectSettings = (state) => state.project.settings
export const selectProjectName = (state) => state.project.name
export const selectDirty = (state) => state.dirty
export const selectActiveItems = (state) => getActiveLayout(state.project).items

/** Memoriza o último resultado de uma função pelos argumentos (por referência). */
function memoizeLast(fn) {
  let lastArgs = null
  let lastResult
  return (...args) => {
    if (lastArgs && args.length === lastArgs.length && args.every((arg, i) => arg === lastArgs[i])) return lastResult
    lastArgs = args
    lastResult = fn(...args)
    return lastResult
  }
}

/**
 * Análise completa da disposição (colisões, passagens, acesso). É
 * memorizada ao nível do módulo: a planta, a cena 3D, a barra inferior e
 * o painel de análise recebem o mesmo resultado, calculado uma só vez por
 * alteração (também durante um arrasto).
 */
export const getLayoutAnalysis = memoizeLast((room, items, settings) =>
  analyzeLayout(room, items, settings, { getProfile: getItemProfile }),
)

/** Métricas para a barra inferior (o «ocupado» é o mesmo da comparação). */
export function computeLayoutMetrics(room, items, settings) {
  const analysis = getLayoutAnalysis(room, items, settings)
  const occupied = blockedFloorArea(items, getItemProfile)
  return {
    roomArea: roomArea(room),
    occupiedArea: occupied,
    itemCount: items.length,
    errors: analysis.errors.length,
    warnings: analysis.warnings.length,
  }
}

const applyPreview = memoizeLast((items, interaction) => {
  if (!interaction?.preview || !interaction.itemId) return items
  return items.map((item) => (item.id === interaction.itemId ? { ...item, ...interaction.preview } : item))
})

/**
 * Móveis tal como devem ser mostrados: os do documento com a pré-visualização
 * do gesto em curso aplicada. A planta, a barra inferior e a cena
 * 3D usam esta lista (a mesma instância), por isso todas as vistas mostram
 * o mesmo estado e a análise é calculada uma única vez.
 */
export function useDisplayedItems() {
  const items = useProjectStore(selectActiveItems)
  const interaction = useEditorStore((state) => state.interaction)
  return applyPreview(items, interaction)
}

export function useLayoutAnalysis() {
  const room = useProjectStore(selectRoom)
  const settings = useProjectStore(selectSettings)
  const items = useDisplayedItems()
  return getLayoutAnalysis(room, items, settings)
}

export function useSelectedItem() {
  const selectedId = useEditorStore((state) => state.selectedItemId)
  const items = useDisplayedItems()
  return useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId])
}
