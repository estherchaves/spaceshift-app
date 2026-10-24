import { analyzeLayout, compareHighlights, scoreLayout } from '@/core/analysis'
import { getItemPrice, getItemProfile } from '@/data/catalog/furniture.js'

/** Análise e pontuação de todas as disposições de um projeto, com os destaques. */
export function compareLayouts(project) {
  const { room, settings } = project
  const entries = project.layouts.map((layout) => {
    const analysis = analyzeLayout(room, layout.items, settings, { getProfile: getItemProfile })
    const result = scoreLayout(room, layout.items, analysis, { getProfile: getItemProfile, getPrice: getItemPrice })
    return { id: layout.id, layout, analysis, result }
  })
  const highlights = compareHighlights(entries)
  return entries.map((entry) => ({ ...entry, highlights: highlights.get(entry.id) }))
}
