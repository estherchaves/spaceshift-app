/** Remove acentos e maiúsculas para a pesquisa ("Cómoda" ≈ "comoda"). */
export function normalizeSearch(text) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

/**
 * Filtra o catálogo por categoria e texto. A pesquisa procura no nome e no
 * nome da categoria, e todas as palavras têm de aparecer.
 */
export function filterCatalog(catalog, { query = '', category = 'all', categories = {} } = {}) {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean)
  return catalog.filter((entry) => {
    if (category !== 'all' && entry.category !== category) return false
    if (terms.length === 0) return true
    const haystack = normalizeSearch(`${entry.name} ${categories[entry.category]?.label ?? ''}`)
    return terms.every((term) => haystack.includes(term))
  })
}
