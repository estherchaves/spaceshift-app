import { MousePointerClick } from 'lucide-react'
import { useRef, useState } from 'react'
import { screenToWorld } from '@/core/coordinates/viewport.js'
import { snapItemPosition } from '@/core/editing'
import { DEFAULT_SIZE_BOUNDS, ROOM_TYPES } from '@/core/model'
import { formatLength } from '@/core/units/units.js'
import { getCatalogEntry, getItemProfile, getSizeBounds } from '@/data/catalog/furniture.js'
import { AnalysisDefs, AnalysisLayer, CirculationLayer } from '@/features/analysis/AnalysisLayer.jsx'
import { useElementSize } from '@/hooks/useElementSize.js'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts.js'
import { addCatalogItem } from '@/store/commands.js'
import { useEditorStore } from '@/store/editorStore.js'
import { getLayoutAnalysis, selectSettings, useDisplayedItems, useDisplayedRoom } from '@/store/selectors.js'
import { useProjectStore } from '@/store/projectStore.js'
import { DropGhost } from './DropGhost.jsx'
import { OpeningsLayer } from './OpeningsLayer.jsx'
import { PlanItem } from './PlanItem.jsx'
import { gridLines, scaleBarLength, toScreen } from './planGeometry.js'
import { SelectionOverlay } from './SelectionOverlay.jsx'
import { usePlanPointer } from './usePlanPointer.js'
import { useWalkingPath } from './useWalkingPath.js'
import { WalkLayer, WalkPanel } from './WalkLayer.jsx'
import { useViewport } from './useViewport.js'
import { ZOOM_STEP, ZoomControls } from './ZoomControls.jsx'
import './PlanView.css'

export const CATALOG_DRAG_TYPE = 'application/x-spaceshift-catalog'

/**
 * Editor 2D. Desenha a planta em SVG a partir do modelo (metros) com a
 * transformação do viewport; nenhuma medida do modelo está em píxeis.
 */
export function PlanView() {
  const [containerRef, size] = useElementSize()
  const svgRef = useRef(null)
  const room = useDisplayedRoom()
  const settings = useProjectStore(selectSettings)
  const updateSettings = useProjectStore((state) => state.updateSettings)
  const items = useDisplayedItems()
  const selectedId = useEditorStore((state) => state.selectedItemId)
  const selectItem = useEditorStore((state) => state.selectItem)
  const selectedOpeningId = useEditorStore((state) => state.selectedOpeningId)
  const selectOpening = useEditorStore((state) => state.selectOpening)
  const interaction = useEditorStore((state) => state.interaction)
  const catalogDragId = useEditorStore((state) => state.catalogDragId)
  const showCirculation = useEditorStore((state) => state.showCirculation)
  const setShowCirculation = useEditorStore((state) => state.setShowCirculation)
  const focusedIssueId = useEditorStore((state) => state.focusedIssueId)
  const analysisOpen = useEditorStore((state) => state.analysisOpen)
  const walkTool = useEditorStore((state) => state.walkTool)
  const walkPoints = useEditorStore((state) => state.walkPoints)
  const setWalkTool = useEditorStore((state) => state.setWalkTool)
  const { viewport, zoomBy, pan, fit, zoomPercent } = useViewport(room, size)
  const pointer = usePlanPointer({ svgRef, viewport, pan, zoomBy })
  const [dropPoint, setDropPoint] = useState(null)

  const analysis = getLayoutAnalysis(room, items, settings)
  const selected = items.find((item) => item.id === selectedId) ?? null
  const dragEntry = catalogDragId ? getCatalogEntry(catalogDragId) : null
  const walkPath = useWalkingPath(room, analysis, settings)

  useKeyboardShortcuts([
    { key: ['+', '='], handler: () => zoomBy(ZOOM_STEP) },
    { key: ['-', '_'], handler: () => zoomBy(1 / ZOOM_STEP) },
    { key: '0', handler: fit },
    { key: 'g', handler: () => updateSettings({ snapToGrid: !settings.snapToGrid }) },
    { key: 'c', handler: () => setShowCirculation(!showCirculation) },
    { key: 'p', handler: () => setWalkTool(!walkTool) },
  ])

  const worldFromClient = (event) => {
    const rect = svgRef.current.getBoundingClientRect()
    return screenToWorld(viewport, { x: event.clientX - rect.left, y: event.clientY - rect.top })
  }

  const dropProps = {
    onDragOver: (event) => {
      if (!dragEntry || !viewport) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
      const world = worldFromClient(event)
      if (!Number.isFinite(world.x) || !Number.isFinite(world.z)) return
      const draft = { position: { x: 0, z: 0 }, dimensions: dragEntry.dimensions, rotation: 0 }
      setDropPoint(snapItemPosition(draft, world, settings.gridSize, settings.snapToGrid))
    },
    onDragLeave: () => setDropPoint(null),
    onDrop: (event) => {
      const id = event.dataTransfer.getData(CATALOG_DRAG_TYPE) || catalogDragId
      setDropPoint(null)
      if (!id || !viewport) return
      event.preventDefault()
      addCatalogItem(id, worldFromClient(event))
      useEditorStore.getState().setCatalogDrag(null)
    },
  }

  return (
    <div
      ref={containerRef}
      className="plan-view"
      data-interaction={interaction?.type}
      data-dragging-catalog={dragEntry ? true : undefined}
      data-walk-tool={walkTool || undefined}
      {...dropProps}
    >
      {viewport && (
        <svg
          ref={svgRef}
          className="plan-svg"
          width={size.width}
          height={size.height}
          viewBox={`0 0 ${size.width} ${size.height}`}
          aria-label={`Planta da divisão: ${ROOM_TYPES[room.type].label}, ${formatLength(room.width)} por ${formatLength(room.depth)}`}
          role="group"
          data-scale={viewport.scale.toFixed(3)}
          {...pointer}
        >
          <AnalysisDefs />
          <RoomLayer room={room} settings={settings} viewport={viewport} />
          {showCirculation && <CirculationLayer circulation={analysis.circulation} viewport={viewport} />}
          <g className="plan-items">
            {items.map((item) => (
              <PlanItem
                key={item.id}
                item={item}
                viewport={viewport}
                selected={item.id === selectedId}
                status={analysis.itemStatus.get(item.id)}
                shape={getItemProfile(item).shape}
                onSelect={selectItem}
              />
            ))}
          </g>
          <WallsLayer room={room} viewport={viewport} />
          <OpeningsLayer room={room} viewport={viewport} selectedId={selectedOpeningId} onSelect={selectOpening} />
          <AnalysisLayer
            issues={analysis.issues}
            viewport={viewport}
            focusedId={focusedIssueId}
            selectedId={selectedId}
            panelOpen={analysisOpen}
          />
          {analysis.turning && <TurningCircle turning={analysis.turning} viewport={viewport} />}
          {walkTool && <WalkLayer points={walkPoints} path={walkPath} viewport={viewport} />}
          {selected && (
            <SelectionOverlay
              item={selected}
              viewport={viewport}
              bounds={getSizeBounds(selected.catalogId, DEFAULT_SIZE_BOUNDS)}
              interacting={interaction?.itemId === selected.id}
            />
          )}
          {dragEntry && dropPoint && <DropGhost entry={dragEntry} position={dropPoint} viewport={viewport} />}
          <ScaleBar viewport={viewport} height={size.height} />
        </svg>
      )}

      {walkTool && <WalkPanel points={walkPoints} path={walkPath} onClose={() => setWalkTool(false)} />}

      {items.length === 0 && !dragEntry && !walkTool && (
        <div className="plan-hint">
          <MousePointerClick size={16} strokeWidth={1.75} aria-hidden="true" />
          Arraste um móvel do catálogo para a planta ou use o botão +.
        </div>
      )}

      <ZoomControls
        zoomPercent={zoomPercent}
        onZoomIn={() => zoomBy(ZOOM_STEP)}
        onZoomOut={() => zoomBy(1 / ZOOM_STEP)}
        onFit={fit}
        snap={settings.snapToGrid}
        onToggleSnap={() => updateSettings({ snapToGrid: !settings.snapToGrid })}
        circulation={showCirculation}
        onToggleCirculation={() => setShowCirculation(!showCirculation)}
        walk={walkTool}
        onToggleWalk={() => setWalkTool(!walkTool)}
      />
    </div>
  )
}

function RoomLayer({ room, settings, viewport }) {
  const inner = { a: toScreen(viewport, 0, 0), b: toScreen(viewport, room.width, room.depth) }
  const lines = gridLines(room, settings.gridSize, viewport.scale)
  const box = { x: inner.a.x, y: inner.a.y, width: inner.b.x - inner.a.x, height: inner.b.y - inner.a.y }
  return (
    <g>
      <rect className="plan-floor-base" {...box} />
      <rect data-testid="plan-floor" {...box} fill={room.floorColor} opacity={0.28} />
      <g className="plan-grid" aria-hidden="true">
        {lines.map((line) => {
          const p = line.axis === 'x' ? toScreen(viewport, line.value, 0) : toScreen(viewport, 0, line.value)
          return line.axis === 'x' ? (
            <line key={`x${line.value}`} data-major={line.major || undefined} x1={p.x} x2={p.x} y1={inner.a.y} y2={inner.b.y} />
          ) : (
            <line key={`z${line.value}`} data-major={line.major || undefined} x1={inner.a.x} x2={inner.b.x} y1={p.y} y2={p.y} />
          )
        })}
      </g>
    </g>
  )
}

function WallsLayer({ room, viewport }) {
  const t = room.wallThickness
  const inner = { a: toScreen(viewport, 0, 0), b: toScreen(viewport, room.width, room.depth) }
  const outer = { a: toScreen(viewport, -t, -t), b: toScreen(viewport, room.width + t, room.depth + t) }
  return (
    <g aria-hidden="true">
      <path
        className="plan-walls"
        fillRule="evenodd"
        d={`M${outer.a.x},${outer.a.y}H${outer.b.x}V${outer.b.y}H${outer.a.x}Z M${inner.a.x},${inner.a.y}V${inner.b.y}H${inner.b.x}V${inner.a.y}Z`}
      />
      <Dimension orientation="horizontal" from={inner.a.x} to={inner.b.x} at={outer.a.y - 22} label={formatLength(room.width)} name="Comprimento" />
      <Dimension orientation="vertical" from={inner.a.y} to={inner.b.y} at={outer.a.x - 22} label={formatLength(room.depth)} name="Largura" />
    </g>
  )
}

/** Círculo livre para rodar (modo de acessibilidade), onde a análise o encontrou. */
function TurningCircle({ turning, viewport }) {
  const c = toScreen(viewport, turning.centre.x, turning.centre.z)
  const r = (turning.diameter / 2) * viewport.scale
  return (
    <g className="plan-turning" data-testid="turning-circle">
      <circle cx={c.x} cy={c.y} r={r} />
      <text x={c.x} y={c.y} textAnchor="middle" dy="0.35em">
        {`Ø ${formatLength(turning.diameter)}`}
      </text>
    </g>
  )
}

function ScaleBar({ viewport, height }) {
  const metres = scaleBarLength(viewport.scale)
  const px = metres * viewport.scale
  return (
    <g className="plan-scale" transform={`translate(20 ${height - 22})`} aria-hidden="true">
      <rect x={0} y={-3} width={px} height={3} />
      <rect x={0} y={-3} width={px / 2} height={3} className="plan-scale__half" />
      <text x={px + 6} y={0}>
        {formatLength(metres).replace(',00', '')}
      </text>
    </g>
  )
}

const TICK = 5

function Dimension({ orientation, from, to, at, label, name }) {
  const mid = (from + to) / 2
  if (orientation === 'horizontal') {
    return (
      <g className="plan-dimension" data-testid={`dimension-${name}`}>
        <line x1={from} x2={to} y1={at} y2={at} />
        <line x1={from - TICK} x2={from + TICK} y1={at + TICK} y2={at - TICK} className="plan-dimension__tick" />
        <line x1={to - TICK} x2={to + TICK} y1={at + TICK} y2={at - TICK} className="plan-dimension__tick" />
        <text x={mid} y={at - 7} textAnchor="middle">
          {label}
        </text>
      </g>
    )
  }
  return (
    <g className="plan-dimension" data-testid={`dimension-${name}`}>
      <line x1={at} x2={at} y1={from} y2={to} />
      <line x1={at - TICK} x2={at + TICK} y1={from + TICK} y2={from - TICK} className="plan-dimension__tick" />
      <line x1={at - TICK} x2={at + TICK} y1={to + TICK} y2={to - TICK} className="plan-dimension__tick" />
      <text x={at - 7} y={mid} textAnchor="middle" transform={`rotate(-90 ${at - 7} ${mid})`}>
        {label}
      </text>
    </g>
  )
}
