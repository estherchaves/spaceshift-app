import { checkInsideRoom, itemsOverlap } from '../geometry/collision.js'
import { snapItemPosition } from './manipulation.js'

/** Tapetes e objetos suspensos podem sobrepor-se a outros móveis. */
export function isSolid(item) {
  return !item.elevation && item.dimensions.height > 0.03
}

/**
 * Procura a posição livre mais próxima de `preferred` onde o móvel cabe
 * dentro da divisão sem se sobrepor a móveis sólidos. Percorre uma grelha
 * de candidatos ordenada pela distância. Se não houver espaço, devolve a
 * posição preferida (o sistema de colisões assinala o problema).
 */
export function findFreePosition(room, items, candidate, preferred, { step = 0.1 } = {}) {
  const at = (position) => ({ ...candidate, position })
  const first = snapItemPosition(candidate, preferred, step)
  if (!isSolid(candidate)) return first

  const blockers = items.filter(isSolid)
  const fits = (position) => {
    const placed = at(position)
    return checkInsideRoom(placed, room).inside && !blockers.some((other) => itemsOverlap(placed, other).overlapping)
  }
  if (fits(first)) return first

  const candidates = []
  for (let x = 0; x <= room.width + 1e-9; x += step) {
    for (let z = 0; z <= room.depth + 1e-9; z += step) {
      candidates.push({ x, z, d: (x - preferred.x) ** 2 + (z - preferred.z) ** 2 })
    }
  }
  candidates.sort((a, b) => a.d - b.d)
  for (const c of candidates) {
    const position = snapItemPosition(candidate, c, step)
    if (fits(position)) return position
  }
  return first
}
