import { fitRect, worldToScreen } from '@/core/coordinates/viewport.js'
import { getCatalogEntry } from '@/data/catalog/furniture.js'
import { polygonsPath } from '@/features/analysis/markerPaths.js'
import { PlanSymbol } from './symbols/PlanSymbol.jsx'

/*
 * Planta só de leitura, sem interação: miniaturas na lista de projetos,
 * cartões da comparação e a imagem exportada. Usa os mesmos símbolos do
 * editor e o mesmo sistema de coordenadas (metros → píxeis por um
 * viewport), por isso é exatamente a mesma disposição, só mais pequena.
 * As cores do chão, das paredes e dos erros vão como atributos, para o
 * SVG continuar correto fora da página (exportação para PNG).
 */

const STATIC_PLAN_COLORS = {
  floorBase: '#ffffff',
  wall: '#2b2d31',
  grid: 'rgba(38, 40, 44, 0.08)',
  error: '#b8423a',
  circulation: 'rgba(58, 125, 85, 0.16)',
}

/** Viewport que enquadra a divisão (com paredes) numa caixa de `size` px. */
function staticPlanViewport(room, size, padding) {
  const t = room.wallThickness ?? 0.15
  return fitRect({ x: -t, z: -t, width: room.width + 2 * t, depth: room.depth + 2 * t }, size, padding, {
    minScale: 0.1,
    maxScale: 400,
  })
}

/**
 * @param {{room: {width:number, depth:number, wallThickness?:number, floorColor?:string},
 *   items: object[], width: number, height: number, padding?: number,
 *   errorRegions?: Array<{x:number,z:number}[]>, circulationRuns?: object[], showGrid?: boolean,
 *   title?: string, className?: string}} props
 */
export function StaticPlan({
  room,
  items,
  width,
  height,
  padding = 12,
  errorRegions = [],
  circulationRuns = null,
  showGrid = true,
  title,
  className,
  children,
}) {
  const viewport = staticPlanViewport(room, { width, height }, padding)
  const t = room.wallThickness ?? 0.15
  const a = worldToScreen(viewport, { x: 0, z: 0 })
  const b = worldToScreen(viewport, { x: room.width, z: room.depth })
  const oa = worldToScreen(viewport, { x: -t, z: -t })
  const ob = worldToScreen(viewport, { x: room.width + t, z: room.depth + t })
  const grid = []
  if (showGrid) {
    for (let x = 1; x < room.width - 1e-6; x++) grid.push(`M${worldToScreen(viewport, { x, z: 0 }).x.toFixed(1)},${a.y.toFixed(1)}V${b.y.toFixed(1)}`)
    for (let z = 1; z < room.depth - 1e-6; z++) grid.push(`M${a.x.toFixed(1)},${worldToScreen(viewport, { x: 0, z }).y.toFixed(1)}H${b.x.toFixed(1)}`)
  }
  // Ordem de desenho: tapetes primeiro, objetos suspensos por cima.
  const ordered = [...items].sort((p, q) => layerOf(p) - layerOf(q))

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <rect x={a.x} y={a.y} width={b.x - a.x} height={b.y - a.y} fill={STATIC_PLAN_COLORS.floorBase} />
      <rect x={a.x} y={a.y} width={b.x - a.x} height={b.y - a.y} fill={room.floorColor ?? '#c9a77c'} opacity={0.28} />
      {grid.length > 0 && <path d={grid.join('')} stroke={STATIC_PLAN_COLORS.grid} strokeWidth={1} fill="none" />}
      {circulationRuns && <path d={runsToPath(viewport, circulationRuns)} fill={STATIC_PLAN_COLORS.circulation} />}
      {ordered.map((item, i) => {
        const c = worldToScreen(viewport, item.position)
        const kind = getCatalogEntry(item.catalogId)?.plan2d ?? 'box'
        return (
          <g key={item.id ?? i} transform={`translate(${c.x.toFixed(2)} ${c.y.toFixed(2)}) rotate(${item.rotation})`}>
            <PlanSymbol
              kind={kind}
              w={item.dimensions.width * viewport.scale}
              h={item.dimensions.depth * viewport.scale}
              widthM={item.dimensions.width}
              color={item.color}
            />
          </g>
        )
      })}
      {errorRegions.length > 0 && (
        <path
          d={polygonsPath(viewport, errorRegions)}
          fill="rgba(184, 66, 58, 0.22)"
          stroke={STATIC_PLAN_COLORS.error}
          strokeWidth={1.25}
          strokeDasharray="3 2"
        />
      )}
      <path
        fill={STATIC_PLAN_COLORS.wall}
        fillRule="evenodd"
        d={`M${oa.x},${oa.y}H${ob.x}V${ob.y}H${oa.x}Z M${a.x},${a.y}V${b.y}H${b.x}V${a.y}Z`}
      />
      {typeof children === 'function' ? children(viewport) : children}
    </svg>
  )
}

function layerOf(item) {
  if ((item.elevation ?? 0) > 0) return 2
  return item.dimensions.height <= 0.03 ? 0 : 1
}

function runsToPath(viewport, runs) {
  return runs
    .map((run) => {
      const p = worldToScreen(viewport, { x: run.x, z: run.z })
      return `M${p.x.toFixed(1)},${p.y.toFixed(1)}h${(run.width * viewport.scale).toFixed(1)}v${(run.depth * viewport.scale).toFixed(1)}h${(-run.width * viewport.scale).toFixed(1)}Z`
    })
    .join('')
}
