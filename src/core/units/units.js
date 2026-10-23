/**
 * Unidades do SpaceShift.
 *
 * Todas as medidas do modelo de dados estão em METROS (números decimais).
 * Os píxeis só existem na camada de visualização (ver core/coordinates).
 * Arredondamos ao milímetro para evitar acumular erros de vírgula flutuante
 * (ex.: 0.1 + 0.2) quando o utilizador arrasta ou introduz valores.
 */

export const MM = 0.001
export const CM = 0.01

const PRECISION = 1000 // 1 / MM

export function roundToMm(value) {
  return Math.round(value * PRECISION) / PRECISION
}

export function cmToM(cm) {
  return roundToMm(cm * CM)
}

export function mToCm(m) {
  return Math.round(m * 100 * 10) / 10
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

const lengthFormatter = new Intl.NumberFormat('pt-PT', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** 3.5 → "3,50 m" */
export function formatLength(metres) {
  return `${lengthFormatter.format(metres)} m`
}

/** 12.25 → "12,25 m²" */
export function formatArea(squareMetres) {
  return `${lengthFormatter.format(squareMetres)} m²`
}

/** 1.8 → "180 cm" (útil para etiquetas de móveis) */
export function formatCentimetres(metres) {
  return `${Math.round(metres * 100)} cm`
}
