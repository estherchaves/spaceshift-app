import { memo } from 'react'
import { CORNER_SOFA } from '@/core/geometry/shapes.js'
import './PlanSymbol.css'

/*
 * Símbolos de planta (vista de cima) para cada tipo de móvel.
 *
 * Cada símbolo é desenhado no referencial LOCAL do móvel, em píxeis, com o
 * centro na origem: x ∈ [−w/2, w/2], y ∈ [−h/2, h/2]. O lado −y é a parte de
 * trás (encosto, cabeceira) e +y a frente. Como o PlanItem aplica a rotação
 * ao grupo, os símbolos nunca precisam de saber o ângulo.
 *
 * `widthM` (metros) serve para detalhes que dependem da medida real, como o
 * número de almofadas de um sofá; tudo o resto é proporcional a w e h.
 */

const r = (n) => Math.round(n * 100) / 100

function Box({ x, y, w, h, rx = 0, className = 'sym-fill' }) {
  return <rect className={className} x={r(x)} y={r(y)} width={r(Math.max(0, w))} height={r(Math.max(0, h))} rx={r(rx)} />
}

function Line({ x1, y1, x2, y2, className = 'sym-detail' }) {
  return <line className={className} x1={r(x1)} y1={r(y1)} x2={r(x2)} y2={r(y2)} />
}

function seatDividers({ left, right, top, bottom, count }) {
  const lines = []
  const step = (right - left) / count
  for (let i = 1; i < count; i++) {
    const x = left + i * step
    lines.push(<Line key={i} x1={x} y1={top + 2} x2={x} y2={bottom - 2} />)
  }
  return lines
}

function Sofa({ w, h, widthM }) {
  const back = h * 0.24
  const arm = Math.min(w * 0.12, h * 0.26)
  const seats = Math.max(1, Math.round((widthM - 0.3) / 0.65))
  const L = -w / 2
  const T = -h / 2
  return (
    <>
      <Box x={L} y={T} w={w} h={h} rx={Math.min(6, h * 0.12)} />
      <Box x={L + arm} y={T + back} w={w - 2 * arm} h={h - back} rx={2} className="sym-soft" />
      <Line x1={L + arm} y1={T + back} x2={L + w - arm} y2={T + back} />
      <Line x1={L + arm} y1={T + back} x2={L + arm} y2={T + h} />
      <Line x1={L + w - arm} y1={T + back} x2={L + w - arm} y2={T + h} />
      {seatDividers({ left: L + arm, right: L + w - arm, top: T + back, bottom: T + h, count: seats })}
    </>
  )
}

function SofaCorner({ w, h }) {
  const L = -w / 2
  const T = -h / 2
  const back = Math.min(h * 0.16, w * 0.1)
  const arm = w * 0.06
  // Chaise longue do lado direito, com a largura toda (mesmas proporções das colisões).
  const chaise = w * CORNER_SOFA.chaiseRatio
  const seatDepth = h * CORNER_SOFA.seatDepthRatio
  const outline = `M${r(L)},${r(T)}H${r(L + w)}V${r(T + h)}H${r(L + w - chaise)}V${r(T + seatDepth)}H${r(L)}Z`
  const inner = `M${r(L + arm)},${r(T + back)}H${r(L + w - arm)}V${r(T + h)}H${r(L + w - chaise)}V${r(T + seatDepth)}H${r(L + arm)}Z`
  return (
    <>
      <path className="sym-fill" d={outline} />
      <path className="sym-soft" d={inner} />
      <Line x1={L + w - chaise} y1={T + back} x2={L + w - chaise} y2={T + seatDepth} />
      {seatDividers({ left: L + arm, right: L + w - chaise, top: T + back, bottom: T + seatDepth, count: 2 })}
    </>
  )
}

function Bed({ w, h, widthM }) {
  const L = -w / 2
  const T = -h / 2
  const head = h * 0.06
  const pillowH = h * 0.12
  const pillows = widthM < 1.2 ? 1 : 2
  const gap = w * 0.06
  const pillowW = (w - gap * (pillows + 1)) / pillows
  const duvetTop = T + head + pillowH + h * 0.08
  return (
    <>
      <Box x={L} y={T} w={w} h={h} rx={2} />
      <Box x={L} y={T} w={w} h={head} className="sym-strong" />
      {Array.from({ length: pillows }, (_, i) => (
        <Box key={i} x={L + gap + i * (pillowW + gap)} y={T + head + h * 0.04} w={pillowW} h={pillowH} rx={3} className="sym-light" />
      ))}
      <Box x={L + 2} y={duvetTop} w={w - 4} h={T + h - 2 - duvetTop} rx={2} className="sym-soft" />
      <Line x1={L + 2} y1={duvetTop + h * 0.09} x2={L + w - 2} y2={duvetTop + h * 0.09} />
    </>
  )
}

function Table({ w, h }) {
  const inset = Math.min(w, h) * 0.08
  return (
    <>
      <Box x={-w / 2} y={-h / 2} w={w} h={h} rx={Math.min(3, w / 10)} />
      <Box x={-w / 2 + inset} y={-h / 2 + inset} w={w - 2 * inset} h={h - 2 * inset} rx={1} className="sym-outline" />
    </>
  )
}

function TableRound({ w, h }) {
  return (
    <>
      <ellipse className="sym-fill" cx={0} cy={0} rx={r(w / 2)} ry={r(h / 2)} />
      <ellipse className="sym-outline" cx={0} cy={0} rx={r(w * 0.42)} ry={r(h * 0.42)} />
    </>
  )
}

function Desk({ w, h }) {
  const L = -w / 2
  const T = -h / 2
  const drawers = w * 0.3
  return (
    <>
      <Box x={L} y={T} w={w} h={h} rx={2} />
      <Box x={L + w - drawers} y={T} w={drawers} h={h} className="sym-soft" />
      {[0.3, 0.55, 0.8].map((f) => (
        <Line key={f} x1={L + w - drawers * 0.7} y1={T + h * f} x2={L + w - drawers * 0.3} y2={T + h * f} />
      ))}
      <Line x1={L + w * 0.18} y1={T + h * 0.18} x2={L + w * 0.5} y2={T + h * 0.18} className="sym-strong-line" />
    </>
  )
}

function Cabinet({ w, h, widthM }) {
  const L = -w / 2
  const T = -h / 2
  const doors = Math.max(1, Math.round(widthM / 0.45))
  const step = w / doors
  return (
    <>
      <Box x={L} y={T} w={w} h={h} rx={1.5} />
      <Line x1={L} y1={T + h * 0.86} x2={L + w} y2={T + h * 0.86} />
      {Array.from({ length: doors - 1 }, (_, i) => (
        <Line key={i} x1={L + (i + 1) * step} y1={T} x2={L + (i + 1) * step} y2={T + h} />
      ))}
      {Array.from({ length: doors }, (_, i) => (
        <Line key={`h${i}`} x1={L + (i + 0.5) * step - step * 0.15} y1={T + h * 0.93} x2={L + (i + 0.5) * step + step * 0.15} y2={T + h * 0.93} className="sym-strong-line" />
      ))}
    </>
  )
}

function Wardrobe({ w, h, widthM }) {
  const L = -w / 2
  const T = -h / 2
  const doors = Math.max(2, Math.round(widthM / 0.5))
  return (
    <>
      <Box x={L} y={T} w={w} h={h} rx={1} />
      {/* Varão (tracejado) e portas na frente */}
      <Line x1={L + w * 0.06} y1={0} x2={L + w * 0.94} y2={0} className="sym-dashed" />
      <Line x1={L} y1={T + h * 0.88} x2={L + w} y2={T + h * 0.88} />
      {Array.from({ length: doors - 1 }, (_, i) => (
        <Line key={i} x1={L + ((i + 1) * w) / doors} y1={T + h * 0.88} x2={L + ((i + 1) * w) / doors} y2={T + h} />
      ))}
    </>
  )
}

function Shelf({ w, h, widthM }) {
  const L = -w / 2
  const T = -h / 2
  const bays = Math.max(1, Math.round(widthM / 0.45))
  return (
    <>
      <Box x={L} y={T} w={w} h={h} rx={1} />
      {Array.from({ length: bays - 1 }, (_, i) => (
        <Line key={i} x1={L + ((i + 1) * w) / bays} y1={T} x2={L + ((i + 1) * w) / bays} y2={T + h} />
      ))}
      <Line x1={L + 2} y1={T + h * 0.2} x2={L + w - 2} y2={T + h * 0.2} className="sym-faint" />
    </>
  )
}

function Chair({ w, h }) {
  const L = -w / 2
  const T = -h / 2
  const back = h * 0.18
  return (
    <>
      <Box x={L + w * 0.04} y={T + back * 0.6} w={w * 0.92} h={h - back * 0.6} rx={Math.min(4, w * 0.12)} className="sym-soft" />
      <Box x={L} y={T} w={w} h={back} rx={Math.min(3, back / 2)} />
    </>
  )
}

function Armchair({ w, h }) {
  const L = -w / 2
  const T = -h / 2
  const back = h * 0.26
  const arm = w * 0.17
  return (
    <>
      <Box x={L} y={T} w={w} h={h} rx={Math.min(8, w * 0.16)} />
      <Box x={L + arm} y={T + back} w={w - 2 * arm} h={h - back - h * 0.04} rx={3} className="sym-soft" />
    </>
  )
}

function OfficeChair({ w, h }) {
  const radius = Math.min(w, h) / 2
  const legs = [0, 72, 144, 216, 288].map((deg) => {
    const a = ((deg - 90) * Math.PI) / 180
    return { x: Math.cos(a) * radius * 0.96, y: Math.sin(a) * radius * 0.96 }
  })
  return (
    <>
      {legs.map((p, i) => (
        <Line key={i} x1={0} y1={0} x2={p.x} y2={p.y} className="sym-strong-line" />
      ))}
      <ellipse className="sym-soft" cx={0} cy={r(h * 0.06)} rx={r(w * 0.34)} ry={r(h * 0.32)} />
      <path className="sym-fill" d={`M${r(-w * 0.36)},${r(-h * 0.24)}Q0,${r(-h * 0.56)} ${r(w * 0.36)},${r(-h * 0.24)}L${r(w * 0.3)},${r(-h * 0.16)}Q0,${r(-h * 0.4)} ${r(-w * 0.3)},${r(-h * 0.16)}Z`} />
    </>
  )
}

function FloorLamp({ w, h }) {
  return (
    <>
      <ellipse className="sym-fill" cx={0} cy={0} rx={r(w / 2)} ry={r(h / 2)} />
      <ellipse className="sym-light" cx={0} cy={0} rx={r(w * 0.3)} ry={r(h * 0.3)} />
      <circle className="sym-strong" cx={0} cy={0} r={r(Math.min(w, h) * 0.07)} />
    </>
  )
}

function Pendant({ w, h }) {
  // Objeto suspenso: contorno tracejado, por convenção de planta.
  return (
    <>
      <ellipse className="sym-ghost" cx={0} cy={0} rx={r(w / 2)} ry={r(h / 2)} />
      <Line x1={-w * 0.18} y1={0} x2={w * 0.18} y2={0} className="sym-strong-line" />
      <Line x1={0} y1={-h * 0.18} x2={0} y2={h * 0.18} className="sym-strong-line" />
    </>
  )
}

function Rug({ w, h }) {
  const fringe = Math.min(w * 0.035, 6)
  const ticks = Math.max(3, Math.round(h / 6))
  const L = -w / 2 + fringe
  const R = w / 2 - fringe
  return (
    <>
      <Box x={L} y={-h / 2} w={R - L} h={h} className="sym-rug" />
      <Box x={L + 4} y={-h / 2 + 4} w={R - L - 8} h={h - 8} className="sym-dashed-box" />
      {Array.from({ length: ticks }, (_, i) => {
        const y = -h / 2 + ((i + 0.5) * h) / ticks
        return (
          <g key={i}>
            <Line x1={-w / 2} y1={y} x2={L} y2={y} className="sym-faint" />
            <Line x1={R} y1={y} x2={w / 2} y2={y} className="sym-faint" />
          </g>
        )
      })}
    </>
  )
}

function Plant({ w, h }) {
  const leaves = 7
  return (
    <>
      <ellipse className="sym-pot" cx={0} cy={0} rx={r(w * 0.3)} ry={r(h * 0.3)} />
      {Array.from({ length: leaves }, (_, i) => (
        <ellipse
          key={i}
          className="sym-leaf"
          cx={0}
          cy={r(-h * 0.24)}
          rx={r(w * 0.12)}
          ry={r(h * 0.25)}
          transform={`rotate(${(360 / leaves) * i})`}
        />
      ))}
      <circle className="sym-strong" cx={0} cy={0} r={r(Math.min(w, h) * 0.06)} />
    </>
  )
}

function Fallback({ w, h }) {
  return <Box x={-w / 2} y={-h / 2} w={w} h={h} rx={2} />
}

const PLAN_SYMBOLS = {
  sofa: Sofa,
  'sofa-corner': SofaCorner,
  bed: Bed,
  table: Table,
  'table-round': TableRound,
  desk: Desk,
  cabinet: Cabinet,
  wardrobe: Wardrobe,
  shelf: Shelf,
  chair: Chair,
  armchair: Armchair,
  'office-chair': OfficeChair,
  lamp: FloorLamp,
  pendant: Pendant,
  rug: Rug,
  plant: Plant,
}

/**
 * @param {{kind: string, w: number, h: number, widthM: number, color: string}} props
 *   w e h em píxeis; widthM é o comprimento real (m).
 */
export const PlanSymbol = memo(function PlanSymbol({ kind, w, h, widthM, color }) {
  const Symbol = PLAN_SYMBOLS[kind] ?? Fallback
  return (
    <g className="plan-symbol" data-kind={kind} style={{ '--item-color': color }}>
      <Symbol w={w} h={h} widthM={widthM} />
    </g>
  )
})
