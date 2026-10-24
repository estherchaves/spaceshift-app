/*
 * Perfis de acessibilidade. Mudam as larguras que a análise exige e
 * acrescentam verificações próprias (círculo de rotação, largura das
 * portas). São orientações de conforto e de uso, não verificação de
 * conformidade com a legislação de acessibilidade.
 *
 *  - passage  passagem mínima (substitui a configurada se for maior)
 *  - turning  diâmetro livre para dar a volta (m), ou null
 *  - door     largura mínima de uma porta para passar (m), ou null
 */
export const ACCESSIBILITY_PROFILES = {
  none: { label: 'Sem requisitos', passage: null, turning: null, door: null },
  wheelchair: {
    label: 'Cadeira de rodas',
    passage: 0.9,
    turning: 1.5,
    door: 0.8,
    description: 'Passagens de 90 cm, portas de 80 cm e um círculo livre de 1,50 m para rodar.',
  },
  pram: {
    label: 'Carrinho de bebé',
    passage: 0.8,
    turning: 1.2,
    door: 0.7,
    description: 'Passagens de 80 cm, portas de 70 cm e um círculo livre de 1,20 m para rodar.',
  },
}

export function getAccessibilityProfile(settings) {
  return ACCESSIBILITY_PROFILES[settings?.accessibility] ?? ACCESSIBILITY_PROFILES.none
}

/** Passagem mínima efetiva: a configurada ou a do perfil, a maior. */
export function effectivePassage(settings) {
  const profile = getAccessibilityProfile(settings)
  return Math.max(settings.circulationMin, profile.passage ?? 0)
}
