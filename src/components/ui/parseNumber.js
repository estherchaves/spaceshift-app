/**
 * Converte o texto de um campo numérico em número. Aceita vírgula ou
 * ponto decimal ("2,5" e "2.5") e ignora espaços e a unidade no fim.
 * Devolve null se o texto não for um número.
 */
export function parseLocaleNumber(text) {
  if (typeof text !== 'string') return null
  const cleaned = text
    .trim()
    .replace(/\s+/g, '')
    .replace(/(m²|m|cm|°)$/i, '')
    .replace(',', '.')
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(cleaned)) return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

export function formatLocaleNumber(value, precision) {
  return new Intl.NumberFormat('pt-PT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: precision,
    useGrouping: false,
  }).format(value)
}
