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
  const openingId = editor().selectedOpeningId
  if (openingId) {
    project().removeOpening(openingId)
    editor().selectOpening(null)
    return true
  }
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
  if (nudgeSelectedOpening(dx, dz, large)) return
  const item = selectedItem()
  if (!item || item.locked) return
  const { gridSize, snapToGrid } = project().project.settings
  const step = (snapToGrid ? gridSize : 0.01) * (large ? 10 : 1)
  project().updateItem(item.id, { position: { x: item.position.x + dx * step, z: item.position.z + dz * step } })
}

/** Bloqueia ou desbloqueia o selecionado. Um móvel bloqueado não se move, não roda nem é eliminado. */
export function toggleLockSelected() {
  const item = selectedItem()
  if (!item) return
  project().updateItem(item.id, { locked: !item.locked })
}

export function clearSelection() {
  editor().selectItem(null)
}

/** Acrescenta uma porta ou janela e seleciona-a. Devolve o id, ou null se as paredes estiverem cheias. */
export function addOpening(type, options) {
  const id = project().addOpening(type, options)
  if (id) editor().selectOpening(id)
  return id
}

/**
 * Desloca a porta/janela selecionada ao longo da parede com as setas
 * (setas no sentido da parede; as outras são ignoradas).
 */
export function nudgeSelectedOpening(dx, dz, large = false) {
  const id = editor().selectedOpeningId
  const opening = project().project.room.openings?.find((o) => o.id === id)
  if (!opening) return false
  const along = opening.wall === 'top' || opening.wall === 'bottom' ? dx : dz
  if (!along) return true
  const { gridSize, snapToGrid } = project().project.settings
  const step = (snapToGrid ? gridSize : 0.01) * (large ? 10 : 1)
  project().updateOpening(id, { offset: opening.offset + along * step })
  return true
}

/**
 * Realça um problema da análise: seleciona o primeiro móvel envolvido e,
 * em ecrãs pequenos, mostra a vista onde o marcador aparece.
 */
export function focusIssue(issue) {
  if (issue.itemIds.length) editor().selectItem(issue.itemIds[0])
  else if (issue.openingIds?.length) editor().selectOpening(issue.openingIds[0])
  editor().setFocusedIssue(issue.id)
  editor().setMobilePanel('plan')
}

/** Correção automática proposta pela análise (ex.: trazer um móvel para dentro). */
export function applyIssueFix(issue) {
  const fix = issue.fix
  if (fix?.type !== 'bring-inside') return false
  const item = findItem(project().project, fix.itemId)
  if (!item || item.locked) return false
  project().updateItem(item.id, {
    position: { x: item.position.x + fix.delta.x, z: item.position.z + fix.delta.z },
  })
  editor().selectItem(item.id)
  return true
}

/** Depois de anular/refazer/trocar de disposição, a seleção pode já não existir. */
function reconcileSelection() {
  const id = editor().selectedItemId
  if (id && !findItem(project().project, id)) editor().selectItem(null)
  const openingId = editor().selectedOpeningId
  if (openingId && !project().project.room.openings?.some((o) => o.id === openingId)) editor().selectOpening(null)
  editor().setFocusedIssue(null)
}

/** Anula a última alteração. Ignorado durante um gesto (o gesto ainda não chegou ao documento). */
export function undoChange() {
  if (editor().interaction) return false
  project().undo()
  reconcileSelection()
  return true
}

export function redoChange() {
  if (editor().interaction) return false
  project().redo()
  reconcileSelection()
  return true
}

export function switchLayout(layoutId) {
  project().setActiveLayout(layoutId)
  editor().selectItem(null)
}

/** Nova disposição: cópia da atual (por omissão) ou vazia. */
export function createLayout({ copyCurrent = true } = {}) {
  const fromLayoutId = copyCurrent ? project().project.activeLayoutId : null
  const id = project().addLayout({ fromLayoutId })
  if (id) editor().selectItem(null)
  return id
}

export function deleteLayout(layoutId) {
  project().removeLayout(layoutId)
  reconcileSelection()
}
