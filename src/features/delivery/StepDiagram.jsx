import { stepHasTurn, turnPose } from '@/core/analysis'

/*
 * Desenho pequeno de cada passo, à escala:
 *  - porta, passagem ou escada a direito: o vão visto de frente e o corte
 *    do móvel lá dentro (inclinado se for preciso);
 *  - curva a 90°: a planta do canto e o móvel na posição mais apertada,
 *    encostado ao canto interior.
 * Verde quando passa, vermelho quando não passa.
 */

const W = 112
const H = 84
const PAD = 8

export function StepDiagram({ step, result }) {
  const color = result.fits ? 'var(--color-success)' : 'var(--color-danger)'
  const fill = result.fits ? 'rgb(47 107 72 / 0.18)' : 'rgb(184 66 58 / 0.18)'
  return (
    <svg className="delivery-diagram" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      {stepHasTurn(step) ? <Turn step={step} how={result.how} color={color} fill={fill} /> : <Front step={step} how={result.how} color={color} fill={fill} />}
    </svg>
  )
}

function Front({ step, how, color, fill }) {
  const t = (how.tilt * Math.PI) / 180
  const boxW = how.across * Math.cos(t) + how.up * Math.sin(t)
  const boxH = how.across * Math.sin(t) + how.up * Math.cos(t)
  const s = Math.min((W - 2 * PAD) / Math.max(step.width, boxW), (H - 2 * PAD) / Math.max(step.height, boxH))
  const cx = W / 2
  const floor = H - PAD
  const ow = step.width * s
  const oh = step.height * s
  // O móvel fica pousado no chão do vão, ao centro.
  const cy = floor - (boxH * s) / 2
  return (
    <g>
      <rect x={cx - ow / 2} y={floor - oh} width={ow} height={oh} fill="var(--color-surface)" stroke="var(--color-text-muted)" strokeWidth={1.5} />
      <line x1={PAD / 2} x2={W - PAD / 2} y1={floor} y2={floor} stroke="var(--color-text-muted)" strokeWidth={1.5} />
      <rect
        x={cx - (how.across * s) / 2}
        y={cy - (how.up * s) / 2}
        width={how.across * s}
        height={how.up * s}
        transform={`rotate(${-how.tilt} ${cx} ${cy})`}
        fill={fill}
        stroke={color}
        strokeWidth={1.5}
      />
    </g>
  )
}

function Turn({ step, how, color, fill }) {
  const a = step.width
  const b = step.type === 'corridor' ? (step.widthAfter ?? step.width) : step.width
  const w = how.across
  const { angle: th } = turnPose(a, b, Math.min(w, Math.min(a, b) * 0.99))
  // Mundo: primeiro corredor na horizontal (0 ≤ y ≤ a, x ≤ b), segundo na
  // vertical (0 ≤ x ≤ b, y ≥ 0); canto interior em (0, a). y para cima.
  const n = { x: Math.sin(th), y: -Math.cos(th) }
  const c = -a * Math.cos(th) + w
  const p1 = { x: c / n.x, y: 0 }
  const p2 = { x: b, y: (c - n.x * b) / n.y }
  const dir = { x: Math.cos(th), y: Math.sin(th) }
  const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
  const half = how.length / 2
  const inward = { x: -n.x * w, y: -n.y * w }
  const q1 = { x: mid.x - dir.x * half, y: mid.y - dir.y * half }
  const q2 = { x: mid.x + dir.x * half, y: mid.y + dir.y * half }
  const item = [q1, q2, { x: q2.x + inward.x, y: q2.y + inward.y }, { x: q1.x + inward.x, y: q1.y + inward.y }]

  const reach = Math.max(how.length, a + b) * 0.8
  const minX = -reach
  const maxY = a + reach
  const s = Math.min((W - 2 * PAD) / (b - minX), (H - 2 * PAD) / maxY)
  const X = (x) => PAD + (x - minX) * s
  const Y = (y) => H - PAD - y * s
  const pts = (list) => list.map((p) => `${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ')
  const floor = [
    { x: minX, y: 0 },
    { x: b, y: 0 },
    { x: b, y: maxY },
    { x: 0, y: maxY },
    { x: 0, y: a },
    { x: minX, y: a },
  ]
  return (
    <g>
      <polygon points={pts(floor)} fill="var(--color-surface)" stroke="none" />
      <polyline points={pts([{ x: minX, y: 0 }, { x: b, y: 0 }, { x: b, y: maxY }])} fill="none" stroke="var(--color-text-muted)" strokeWidth={1.5} />
      <polyline points={pts([{ x: minX, y: a }, { x: 0, y: a }, { x: 0, y: maxY }])} fill="none" stroke="var(--color-text-muted)" strokeWidth={1.5} />
      <polygon points={pts(item)} fill={fill} stroke={color} strokeWidth={1.5} />
    </g>
  )
}
