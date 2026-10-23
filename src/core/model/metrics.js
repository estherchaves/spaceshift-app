import { footprintArea } from '../geometry/footprint.js'

export function roomArea(room) {
  return room.width * room.depth
}

/**
 * Soma das pegadas dos móveis pousados no chão. Objetos elevados
 * (ex.: candeeiros suspensos) não ocupam chão e ficam de fora.
 * Nota: sobreposições não são descontadas; essas são reportadas como colisões.
 */
export function occupiedArea(items) {
  return items
    .filter((item) => !item.elevation)
    .reduce((sum, item) => sum + footprintArea(item), 0)
}

export function occupancyRatio(room, items) {
  const area = roomArea(room)
  return area > 0 ? occupiedArea(items) / area : 0
}
