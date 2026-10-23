import { clamp } from '../units/units.js'

/**
 * Transformação entre o espaço do mundo (metros) e o ecrã (píxeis CSS).
 *
 * Mundo (planta vista de cima):
 *   - origem no canto superior esquerdo interior da divisão;
 *   - X cresce para a direita, Z cresce para baixo no ecrã.
 * Ecrã:
 *   screen.x = world.x * scale + offsetX
 *   screen.y = world.z * scale + offsetY
 *
 * `scale` é o número de píxeis por metro. A transformação é uniforme
 * (o mesmo scale nos dois eixos), por isso as proporções da divisão
 * mantêm-se com qualquer zoom ou tamanho de janela.
 *
 * Todas as funções são puras e devolvem um novo viewport.
 */

export const MIN_SCALE = 10 // px/m
export const MAX_SCALE = 1000 // px/m
export const DEFAULT_SCALE = 100 // px/m

export function createViewport({ scale = DEFAULT_SCALE, offsetX = 0, offsetY = 0 } = {}) {
  return { scale: clamp(scale, MIN_SCALE, MAX_SCALE), offsetX, offsetY }
}

export function metresToPixels(viewport, metres) {
  return metres * viewport.scale
}

export function pixelsToMetres(viewport, pixels) {
  return pixels / viewport.scale
}

/** @param {{x:number, z:number}} point ponto no mundo (m) */
export function worldToScreen(viewport, point) {
  return {
    x: point.x * viewport.scale + viewport.offsetX,
    y: point.z * viewport.scale + viewport.offsetY,
  }
}

/** @param {{x:number, y:number}} point ponto no ecrã (px) */
export function screenToWorld(viewport, point) {
  return {
    x: (point.x - viewport.offsetX) / viewport.scale,
    z: (point.y - viewport.offsetY) / viewport.scale,
  }
}

export function panBy(viewport, dx, dy) {
  return { ...viewport, offsetX: viewport.offsetX + dx, offsetY: viewport.offsetY + dy }
}

/**
 * Zoom mantendo fixo o ponto do mundo que está sob `screenPoint`
 * (normalmente o cursor), como nas ferramentas de desenho profissionais.
 */
export function zoomAt(viewport, screenPoint, factor, limits = {}) {
  const { minScale = MIN_SCALE, maxScale = MAX_SCALE } = limits
  const scale = clamp(viewport.scale * factor, minScale, maxScale)
  if (scale === viewport.scale) return viewport
  const anchor = screenToWorld(viewport, screenPoint)
  return {
    scale,
    offsetX: screenPoint.x - anchor.x * scale,
    offsetY: screenPoint.y - anchor.z * scale,
  }
}

/**
 * Enquadra um retângulo do mundo (ex.: a divisão) no centro do ecrã.
 * @param {{x:number, z:number, width:number, depth:number}} rect
 * @param {{width:number, height:number}} size tamanho do ecrã em px
 * @param {number} padding margem em px de cada lado
 */
export function fitRect(rect, size, padding = 48, limits = {}) {
  const { minScale = MIN_SCALE, maxScale = MAX_SCALE } = limits
  const availableW = Math.max(1, size.width - padding * 2)
  const availableH = Math.max(1, size.height - padding * 2)
  const rawScale = Math.min(availableW / rect.width, availableH / rect.depth)
  const scale = clamp(rawScale, minScale, maxScale)
  const centreX = rect.x + rect.width / 2
  const centreZ = rect.z + rect.depth / 2
  return {
    scale,
    offsetX: size.width / 2 - centreX * scale,
    offsetY: size.height / 2 - centreZ * scale,
  }
}
