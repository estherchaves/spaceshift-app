import { intersectConvex, polygonsDistance, polygonsOverlap } from '../geometry/index.js'
import { add, scale } from '../geometry/vec2.js'
import { doorSwingPolygon, openingLabels, openingSegment, WALL_LABELS } from '../model/openings.js'
import { formatCentimetres } from '../units/units.js'
import { buildCirculationGrid, zoneReaches } from './circulation.js'
import { isDecorative, verticalOverlap } from './rules.js'

/*
 * Regras das portas e janelas.
 *
 *  - Porta que abre para dentro: a área varrida pela folha (quarto de
 *    círculo) tem de estar livre até à altura da porta. Um móvel lá dentro
 *    é um erro: a porta não abre por completo.
 *  - Porta sem passagem: a zona de circulação principal (com a largura de
 *    acesso) tem de chegar à porta. Senão entra-se na divisão e não se
 *    chega a lado nenhum.
 *  - Janela tapada: um móvel encostado à janela e mais alto do que o
 *    peitoril tapa-a (aviso). Candeeiros e plantas não contam.
 *  - Acessibilidade: portas mais estreitas do que o perfil pede e falta de
 *    um círculo livre para rodar (cadeira de rodas, carrinho de bebé).
 */

/** Distância à janela a partir da qual um móvel já não a tapa (m). */
export const WINDOW_REACH = 0.15

const thinRect = (from, to, normal, depth) => [from, to, add(to, scale(normal, depth)), add(from, scale(normal, depth))]

export function analyzeOpenings(room, walkers, { grid, access, profile }) {
  const openings = room.openings ?? []
  if (openings.length === 0 && !profile.turning) return { issues: [], turning: null }
  const labels = openingLabels(openings)
  const issues = []

  for (const opening of openings) {
    const label = labels.get(opening.id)
    const seg = openingSegment(room, opening)

    if (opening.type === 'door') {
      // 1. Área de abertura da folha.
      if (opening.swing !== 'out') {
        const swing = doorSwingPolygon(room, opening)
        const doorSpace = { elevation: 0, dimensions: { height: opening.height } }
        for (const entry of walkers) {
          if (!verticalOverlap(entry.item, doorSpace)) continue
          const regions = []
          for (const polygon of entry.shape) {
            if (!polygonsOverlap(polygon, swing).overlapping) continue
            const region = intersectConvex(polygon, swing)
            if (region.length) regions.push(region)
          }
          if (regions.length === 0) continue
          issues.push({
            id: `door-swing:${opening.id}:${entry.item.id}`,
            severity: 'error',
            type: 'door-swing',
            title: 'A porta não abre',
            message: `${entry.item.name} está na área de abertura da ${label.toLowerCase()}: a porta não abre por completo.`,
            hint: 'Afaste o móvel ou mude o lado da dobradiça ou o sentido de abertura.',
            itemIds: [entry.item.id],
            openingIds: [opening.id],
            marker: { kind: 'region', polygons: regions },
          })
        }
      }

      // 2. Passagem desde a porta até à zona de circulação principal.
      if (grid.zones.length > 0) {
        const threshold = thinRect(seg.from, seg.to, seg.inward, grid.cell)
        if (!zoneReaches(grid, 0, [threshold], grid.radius + grid.cell * 1.5)) {
          issues.push({
            id: `door-access:${opening.id}`,
            severity: 'warning',
            type: 'door-access',
            title: 'Porta sem passagem',
            message: `Da ${label.toLowerCase()} não há uma passagem de ${formatCentimetres(access)} até ao resto da divisão.`,
            hint: 'Abra espaço à frente da porta.',
            itemIds: [],
            openingIds: [opening.id],
            marker: { kind: 'region', polygons: [thinRect(seg.from, seg.to, seg.inward, Math.max(access, 0.3))] },
          })
        }
      }

      // 3. Largura da porta para o perfil de acessibilidade.
      if (profile.door && opening.width < profile.door - 1e-9) {
        issues.push({
          id: `door-width:${opening.id}`,
          severity: 'warning',
          type: 'door-width',
          title: 'Porta estreita',
          message: `A ${label.toLowerCase()} tem ${formatCentimetres(opening.width)}. Para ${profile.label.toLowerCase()} sugere-se pelo menos ${formatCentimetres(profile.door)}.`,
          hint: 'Alargue a porta ou retire a folha.',
          itemIds: [],
          openingIds: [opening.id],
          marker: null,
        })
      }
      continue
    }

    // Janela tapada por um móvel alto encostado.
    const glass = thinRect(seg.from, seg.to, seg.inward, 0.01)
    const windowSpace = { elevation: opening.sill + 0.05, dimensions: { height: Math.max(0.01, opening.height - 0.05) } }
    for (const entry of walkers) {
      if (isDecorative(entry.item) || !verticalOverlap(entry.item, windowSpace)) continue
      const close = entry.shape.some((polygon) => polygonsDistance(polygon, glass).distance <= WINDOW_REACH)
      if (!close) continue
      issues.push({
        id: `window:${opening.id}:${entry.item.id}`,
        severity: 'warning',
        type: 'window',
        title: 'Janela tapada',
        message: `${entry.item.name} é mais alto do que o peitoril e tapa a ${label.toLowerCase()} da parede ${WALL_LABELS[opening.wall]}.`,
        hint: 'Ponha à frente da janela só móveis baixos ou afaste este.',
        itemIds: [entry.item.id],
        openingIds: [opening.id],
        marker: { kind: 'region', polygons: entry.shape },
      })
    }
  }

  // Círculo livre para rodar, ligado à zona principal.
  let turning = null
  if (profile.turning) {
    const obstacles = walkers.map((entry) => entry.shape)
    const turn = buildCirculationGrid(room, obstacles, profile.turning)
    for (const k of bestTurningCells(turn)) {
      const i = k % turn.cols
      const j = (k - i) / turn.cols
      const centre = turn.centre(i, j)
      // A célula também tem de ser alcançável pela zona de circulação principal.
      if (grid.zones.length === 0 || zoneReaches(grid, 0, [[centre, centre, centre]], grid.cell)) {
        turning = { centre, diameter: profile.turning }
        break
      }
    }
    if (!turning) {
      issues.push({
        id: 'turning',
        severity: 'warning',
        type: 'turning',
        title: 'Sem espaço para rodar',
        message: `Não há um círculo livre de ${formatCentimetres(profile.turning)} para ${profile.label.toLowerCase()} dar a volta.`,
        hint: 'Liberte o centro da divisão ou retire um móvel.',
        itemIds: [],
        openingIds: [],
        marker: null,
      })
    }
  }

  return { issues, turning }
}

/** Células circuláveis da grelha de rotação, das mais centrais nas suas zonas para as menos. */
function bestTurningCells(grid) {
  const cells = []
  for (const zone of grid.zones) {
    const ci = (zone.minI + zone.maxI) / 2
    const cj = (zone.minJ + zone.maxJ) / 2
    const sorted = [...zone.cells].sort((a, b) => {
      const ai = a % grid.cols
      const bi = b % grid.cols
      return (ai - ci) ** 2 + ((a - ai) / grid.cols - cj) ** 2 - ((bi - ci) ** 2 + ((b - bi) / grid.cols - cj) ** 2)
    })
    cells.push(...sorted)
  }
  return cells
}
