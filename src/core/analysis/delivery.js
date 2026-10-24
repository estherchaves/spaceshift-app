/*
 * «Passa pela porta?»: o móvel consegue chegar à divisão?
 *
 * O caminho é uma lista de passos (porta do prédio, escadas, corredor…)
 * que acaba na porta da divisão. Para cada passo procuram-se as seis
 * maneiras de pegar no móvel (qual medida vai à frente, qual fica na
 * vertical) e escolhe-se a que deixa mais folga.
 *
 *  - Porta ou passagem a direito: o móvel atravessa de frente, por isso só
 *    conta o corte transversal (a medida à frente é livre). Esse retângulo
 *    pode rodar dentro do vão: inclinado na diagonal cabe às vezes onde
 *    direito não cabe.
 *  - Curva a 90° (corredor ou patamar da escada): em planta, um retângulo
 *    de comprimento C e largura l, entre corredores com larguras a e b,
 *    só faz a curva se l ≤ min(a, b) e
 *      C ≤ min sobre θ de (a·sen θ + b·cos θ − l) / (sen θ · cos θ),
 *    a posição mais apertada encostado ao canto interior. A altura que
 *    fica na vertical tem de caber debaixo do teto.
 *
 * A folga é o maior δ que se pode somar a TODAS as medidas do móvel, na
 * maneira de pegar escolhida, sem deixar de passar (negativa quando não
 * passa): diz em centímetros quanto sobra ou quanto falta. Quando há
 * várias maneiras que passam, escolhe-se a mais natural (direito antes de
 * deitado, deitado antes de ao alto).
 */

const ANGLE_SAMPLES = 180
const EPS = 1e-9

/** As seis maneiras de pegar no móvel: [à frente, ao lado, na vertical]. */
function orientations({ width, depth, height }) {
  const named = [
    ['width', width],
    ['depth', depth],
    ['height', height],
  ]
  const out = []
  for (let v = 0; v < 3; v++) {
    const others = named.filter((_, i) => i !== v)
    for (const [front, side] of [others, [others[1], others[0]]]) {
      out.push({ length: front[1], across: side[1], up: named[v][1], lengthKey: front[0], acrossKey: side[0], upKey: named[v][0] })
    }
  }
  return out
}

/**
 * Um retângulo p × q, rodado no plano do vão, cabe num vão a × b?
 * Devolve o ângulo (graus) que deixa mais folga, 0 se cabe direito, ou null.
 */
export function rectangleFits(p, q, a, b) {
  if (p <= a + EPS && q <= b + EPS) return 0
  if (q <= a + EPS && p <= b + EPS) return 90
  // Inclinado: a caixa envolvente de p × q rodado θ é
  // (p·cos θ + q·sen θ) × (p·sen θ + q·cos θ).
  let best = null
  let bestSlack = -EPS
  for (let i = 1; i < ANGLE_SAMPLES; i++) {
    const t = (i / ANGLE_SAMPLES) * (Math.PI / 2)
    const c = Math.cos(t)
    const s = Math.sin(t)
    const slack = Math.min(a - (p * c + q * s), b - (p * s + q * c))
    if (slack >= bestSlack) {
      bestSlack = slack
      best = (t * 180) / Math.PI
    }
  }
  return best
}

/**
 * Maior comprimento de um retângulo de largura `w` que faz uma curva a 90°
 * entre corredores de larguras `a` e `b` (m). 0 se nem a largura passa.
 */
export function maxTurnLength(a, b, w) {
  return turnPose(a, b, w).length
}

/**
 * Posição mais apertada da curva: o ângulo θ (radianos, em relação ao
 * primeiro corredor) e o comprimento máximo nessa posição.
 */
export function turnPose(a, b, w) {
  if (w >= Math.min(a, b) - EPS) return { length: 0, angle: Math.PI / 4 }
  const f = (t) => (a * Math.sin(t) + b * Math.cos(t) - w) / (Math.sin(t) * Math.cos(t))
  let best = Infinity
  let bestT = Math.PI / 4
  const n = 720
  for (let i = 1; i < n; i++) {
    const t = (i / n) * (Math.PI / 2)
    const v = f(t)
    if (v < best) {
      best = v
      bestT = t
    }
  }
  // Afinar à volta do melhor ponto (a função é suave).
  let lo = Math.max(1e-6, bestT - Math.PI / (2 * n))
  let hi = Math.min(Math.PI / 2 - 1e-6, bestT + Math.PI / (2 * n))
  for (let k = 0; k < 40; k++) {
    const m1 = lo + (hi - lo) / 3
    const m2 = hi - (hi - lo) / 3
    if (f(m1) < f(m2)) hi = m2
    else lo = m1
  }
  const t = (lo + hi) / 2
  return f(t) < best ? { length: Math.max(0, f(t)), angle: t } : { length: Math.max(0, best), angle: bestT }
}

/** Passa por esta orientação? Devolve o detalhe ou null. */
function fitsStep(step, o) {
  const turn = stepHasTurn(step)
  if (!turn) {
    const angle = rectangleFits(o.across, o.up, step.width, step.height)
    return angle === null ? null : { tilt: angle }
  }
  if (o.up > step.height + EPS) return null
  const after = step.type === 'corridor' ? (step.widthAfter ?? step.width) : step.width
  return o.length <= maxTurnLength(step.width, after, o.across) + EPS ? { tilt: 0 } : null
}

/** A curva tem a ver com este passo? */
export function stepHasTurn(step) {
  return Boolean(step.turn) && (step.type === 'corridor' || step.type === 'stairs')
}

const grow = (o, d) => ({ ...o, length: o.length + d, across: o.across + d, up: o.up + d })

/** Maior δ (m) tal que a orientação, com δ a mais em cada medida, ainda passa. */
function orientationMargin(step, o) {
  const passes = (d) => fitsStep(step, grow(o, d)) !== null
  const smallest = Math.min(o.length, o.across, o.up)
  let lo = -smallest + 1e-4
  let hi = Math.max(step.width, step.height) * 2
  if (!passes(lo)) return lo
  for (let k = 0; k < 36; k++) {
    const mid = (lo + hi) / 2
    if (passes(mid)) lo = mid
    else hi = mid
  }
  return lo
}

/**
 * Verifica um passo do caminho para um móvel com `dimensions` (m).
 * `how` diz como pegar no móvel: que medida vai à frente (`lengthKey`),
 * ao lado (`acrossKey`) e na vertical (`upKey`), e a inclinação no vão.
 * @returns {{fits: boolean, margin: number, how: object}}
 */
export function checkRouteStep(dimensions, step) {
  // Entre as maneiras que passam, a mais natural (direito, depois deitado,
  // depois ao alto) e, nessa, a de mais folga. Se nenhuma passa, a que
  // fica mais perto de passar.
  const POSE = { height: 0, depth: 1, width: 2 }
  let best = null
  for (const o of orientations(dimensions)) {
    const margin = orientationMargin(step, o)
    const candidate = { margin, o, fits: fitsStep(step, o) !== null }
    if (!best || better(candidate, best)) best = candidate
  }
  function better(c, b) {
    if (c.fits !== b.fits) return c.fits
    if (c.fits && POSE[c.o.upKey] !== POSE[b.o.upKey]) return POSE[c.o.upKey] < POSE[b.o.upKey]
    return c.margin > b.margin + 1e-6
  }
  const fit = fitsStep(step, best.o)
  let { across, up, upKey, acrossKey, lengthKey, length } = best.o
  let tilt = fit ? fit.tilt : 0
  // Rodado 90° no vão é o mesmo que trocar o lado com a vertical.
  if (tilt > 89.5) {
    ;[across, up, acrossKey, upKey] = [up, across, upKey, acrossKey]
    tilt = 0
  }
  return {
    fits: fit !== null,
    margin: Math.round(best.margin * 1000) / 1000,
    how: { length, across, up, lengthKey, acrossKey, upKey, tilt: tilt < 0.5 ? 0 : Math.round(tilt) },
  }
}

/**
 * Verifica o caminho inteiro. O passo mais apertado é o que tem menos folga.
 * @returns {{fits: boolean, steps: Array<{step, fits, margin, how}>, tightest: number}}
 */
export function checkDelivery(dimensions, steps) {
  const results = steps.map((step) => ({ step, ...checkRouteStep(dimensions, step) }))
  let tightest = -1
  results.forEach((r, i) => {
    if (tightest < 0 || r.margin < results[tightest].margin) tightest = i
  })
  return { fits: results.every((r) => r.fits), steps: results, tightest }
}

/** Frase curta sobre como pegar no móvel: «deitado, inclinado 30°». */
export function describeCarry(how) {
  const pose = { height: 'direito', depth: 'deitado', width: 'ao alto' }[how.upKey] ?? 'direito'
  return how.tilt ? `${pose}, inclinado ${how.tilt}°` : pose
}
