import { findItem } from '@/core/model'
import { snapAngle } from '@/core/geometry'
import { useEditorStore } from './editorStore.js'
import { useProjectStore } from './projectStore.js'

/*
 * Comandos do editor: coordenam o documento (projectStore) e a interface
 * (editorStore). São usados pelos botões, pela planta e pelos atalhos de
 * teclado, para que a mesma ação se comporte sempre da mesma maneira.
 */

const project = () => useProjectStore.getState()
const editor = () => useEditorStore.getState()

function selectedItem() {
  const id = editor().selectedItemId
  return id ? findItem(project().project, id) : null
}

/** Adiciona um móvel, seleciona-o e, em ecrãs pequenos, mostra a planta. */
export function addCatalogItem(catalogId, position) {
  const id = project().addFromCatalog(catalogId, position)
  if (id) {
    editor().selectItem(id)
    editor().setMobilePanel('plan')
  }
  return id
}

export function deleteSelected() {
  const item = selectedItem()
  if (!item || item.locked) return false
  project().removeItem(item.id)
  editor().selectItem(null)
  return true
}

export function duplicateSelected() {
  const item = selectedItem()
  if (!item) return null
  const id = project().duplicateItem(item.id)
  if (id) editor().selectItem(id)
  return id
}

/** Roda o selecionado por `direction` passos de rotação (±1). */
export function rotateSelected(direction = 1) {
  const item = selectedItem()
  if (!item || item.locked) return
  const step = project().project.settings.rotationStep
  project().updateItem(item.id, { rotation: snapAngle(item.rotation + direction * step, step) })
}

/**
 * Desloca o selecionado com as setas: um passo de grelha (ou 1 cm sem
 * snap); com `large` (Shift) dez vezes mais.
 */
export function nudgeSelected(dx, dz, large = false) {
  const item = selectedItem()
  if (!item || item.locked) return
  const { gridSize, snapToGrid } = project().project.settings
  const step = (snapToGrid ? gridSize : 0.01) * (large ? 10 : 1)
  project().updateItem(item.id, { position: { x: item.position.x + dx * step, z: item.position.z + dz * step } })
}

export function clearSelection() {
  editor().selectItem(null)
}
