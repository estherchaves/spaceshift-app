import { roundToMm } from '../units/units.js'

export function snapToGrid(value, step) {
  if (!step || step <= 0) return roundToMm(value)
  return roundToMm(Math.round(value / step) * step)
}

export function snapPoint(point, step, enabled = true) {
  if (!enabled) return { x: roundToMm(point.x), z: roundToMm(point.z) }
  return { x: snapToGrid(point.x, step), z: snapToGrid(point.z, step) }
}
