import { worldToScreen } from '@/core/coordinates/viewport.js'

/** Polígonos em metros → caminho SVG em píxeis. */
export const polygonsPath = (viewport, polygons) =>
  polygons
    .map((polygon) => polygon.map((p, i) => {
      const s = worldToScreen(viewport, p)
      return `${i ? 'L' : 'M'}${s.x.toFixed(1)},${s.y.toFixed(1)}`
    }).join('') + 'Z')
    .join(' ')

/** Corridas de células da grelha → um único caminho SVG. */
export function runsPath(viewport, runs) {
  return runs
    .map((run) => {
      const a = worldToScreen(viewport, { x: run.x, z: run.z })
      return `M${a.x.toFixed(1)},${a.y.toFixed(1)}h${(run.width * viewport.scale).toFixed(1)}v${(run.depth * viewport.scale).toFixed(1)}h${(-run.width * viewport.scale).toFixed(1)}Z`
    })
    .join('')
}

/** Que marcadores se veem: erros sempre; avisos com o painel aberto, focados ou do móvel selecionado. */
export function isIssueVisible(issue, { panelOpen, selectedId, focusedId }) {
  return issue.severity === 'error' || panelOpen || issue.id === focusedId || issue.itemIds.includes(selectedId)
}
