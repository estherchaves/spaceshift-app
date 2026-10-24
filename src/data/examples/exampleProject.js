import { createFurnitureItem, createLayout, createOpening, createProject } from '@/core/model'
import { getCatalogEntry } from '@/data/catalog/furniture.js'

/*
 * Projeto de exemplo para quem abre o SpaceShift pela primeira vez: uma
 * sala com duas disposições diferentes, para experimentar o editor e a
 * comparação sem ter de começar do zero.
 */

function place(catalogId, x, z, rotation = 0, overrides = {}) {
  const entry = getCatalogEntry(catalogId)
  return createFurnitureItem(entry, { position: { x, z }, rotation, ...overrides })
}

export function createExampleProject() {
  const project = createProject({
    name: 'Sala de exemplo',
    roomType: 'living',
    room: { width: 5.2, depth: 4.2 },
  })
  // Porta de entrada na parede de baixo, à direita do sofá, e janela à esquerda.
  const door = createOpening(project.room, 'door', { wall: 'bottom', preferred: 4.15, hinge: 'end' })
  const win = createOpening({ ...project.room, openings: [door] }, 'window', { wall: 'left', preferred: 2.4 })
  project.room = { ...project.room, openings: [door, win] }

  const facingTv = createLayout('Sofá virado para a TV', [
    place('rug', 2.6, 2.55, 0, { dimensions: { width: 2.4, depth: 1.7, height: 0.01 } }),
    place('tv-unit', 2.6, 0.21),
    place('sofa-3', 2.6, 3.74, 180),
    place('coffee-table', 2.6, 2.55),
    place('armchair', 0.44, 1.6, 270),
    place('floor-lamp', 0.3, 3.85),
    place('bookshelf', 5.025, 2.2, 90),
    place('plant', 4.85, 0.35),
    place('pendant-lamp', 2.6, 2.55),
  ])

  const corner = createLayout('Sofá de canto', [
    place('rug', 1.6, 2.15, 0, { dimensions: { width: 2.4, depth: 1.7, height: 0.01 } }),
    place('tv-unit', 1.6, 0.21),
    place('sofa-corner', 1.35, 3.375, 180),
    place('coffee-table', 1.6, 1.9),
    place('round-table', 4.3, 1.1),
    place('dining-chair', 3.45, 1.1, 270),
    place('dining-chair', 4.3, 1.92, 180),
    place('floor-lamp', 3.0, 3.9),
    place('plant', 4.85, 3.85),
    place('pendant-lamp', 4.3, 1.1),
  ])

  return { ...project, layouts: [facingTv, corner], activeLayoutId: facingTv.id }
}
