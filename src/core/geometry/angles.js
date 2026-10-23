export const DEG_TO_RAD = Math.PI / 180

export function degToRad(degrees) {
  return degrees * DEG_TO_RAD
}

export function radToDeg(radians) {
  return radians / DEG_TO_RAD
}

/** Normaliza para o intervalo [0, 360). */
export function normalizeDegrees(degrees) {
  const value = ((degrees % 360) + 360) % 360
  return Object.is(value, -0) || value === 360 ? 0 : value
}

export function snapAngle(degrees, step = 15) {
  if (step <= 0) return normalizeDegrees(degrees)
  return normalizeDegrees(Math.round(degrees / step) * step)
}
