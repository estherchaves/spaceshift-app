import { fitRect, worldToScreen } from '@/core/coordinates/viewport.js'

/** Margem em px à volta da divisão para as cotas e a barra de escala. */
export const PLAN_PADDING = 64

/** Abaixo deste espaçamento (px) as linhas da grelha deixam de ser legíveis. */
export const MIN_GRID_SPACING_PX = 8

/** Enquadra a divisão (incluindo a espessura das paredes) no ecrã. */
export function fitRoom(room, size, padding = PLAN_PADDING) {
  const t = room.wallThickness
  return fitRect({ x: -t, z: -t, width: room.width + 2 * t, depth: room.depth + 2 * t }, size, padding)
}

/**
 * Linhas da grelha dentro da divisão, em coordenadas do mundo.
 * Linhas que coincidem com metros inteiros são "major". Linhas menores
 * são omitidas quando ficariam demasiado juntas para o zoom atual.
 */
export function gridLines(room, gridSize, scale) {
  const lines = []
  const showMinor = gridSize * scale >= MIN_GRID_SPACING_PX
  const step = showMinor ? gridSize : 1
  if (step * scale < MIN_GRID_SPACING_PX) return lines
  const isMajor = (value) => Math.abs(value - Math.round(value)) < 1e-6
  for (const [axis, extent] of [
    ['x', room.width],
    ['z', room.depth],
  ]) {
    const count = Math.floor(extent / step + 1e-6)
    for (let i = 1; i <= count; i++) {
      const value = Math.round(i * step * 1e6) / 1e6
      if (value >= extent - 1e-6) break
      lines.push({ axis, value, major: isMajor(value) })
    }
  }
  return lines
}

/** Comprimento "redondo" para a barra de escala (≥ 48 px no ecrã). */
export function scaleBarLength(scale) {
  return [0.5, 1, 2, 5, 10].find((metres) => metres * scale >= 48) ?? 10
}

export function toScreen(viewport, x, z) {
  return worldToScreen(viewport, { x, z })
}
