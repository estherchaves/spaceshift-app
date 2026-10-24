import { useMemo } from 'react'
import { findWalkingPath, WALK_BODY } from '@/core/analysis'
import { getAccessibilityProfile } from '@/core/model'
import { useEditorStore } from '@/store/editorStore.js'

/**
 * Percurso entre os dois pontos marcados, recalculado quando os móveis
 * mudam. Com um perfil de acessibilidade, quem passa é a cadeira de rodas
 * ou o carrinho (a largura do perfil); senão, uma pessoa (50 cm).
 */
export function useWalkingPath(room, analysis, settings) {
  const points = useEditorStore((state) => state.walkPoints)
  const profile = getAccessibilityProfile(settings)
  const body = profile.passage ?? WALK_BODY
  const passage = analysis.circulation.passage
  return useMemo(() => {
    if (points.length < 2) return null
    return { ...findWalkingPath(room, analysis.obstacles, points[0], points[1], { body }), body, passage }
  }, [room, analysis.obstacles, points, body, passage])
}
