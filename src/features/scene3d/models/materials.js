/*
 * Parâmetros de material (PBR) por papel da peça e acabamento do móvel.
 * Função pura: devolve objetos simples que o componente passa ao
 * MeshStandardMaterial. Sem texturas externas.
 */

/** Mistura duas cores hex: t = 0 → a, t = 1 → b. */
export function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = (v, s) => (v >> s) & 255
  const mix = (s) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t)
  return `#${((mix(16) << 16) | (mix(8) << 8) | mix(0)).toString(16).padStart(6, '0')}`
}

const FINISH_SURFACE = {
  linen: { roughness: 0.95, metalness: 0 },
  boucle: { roughness: 1, metalness: 0 },
  velvet: { roughness: 0.82, metalness: 0 },
  wool: { roughness: 0.98, metalness: 0 },
  leather: { roughness: 0.55, metalness: 0 },
  oak: { roughness: 0.68, metalness: 0 },
  walnut: { roughness: 0.62, metalness: 0 },
  'white-lacquer': { roughness: 0.32, metalness: 0 },
  'black-metal': { roughness: 0.42, metalness: 0.65 },
  brass: { roughness: 0.32, metalness: 0.85 },
  ceramic: { roughness: 0.45, metalness: 0 },
  glass: { roughness: 0.08, metalness: 0, transparent: true, opacity: 0.45 },
  marble: { roughness: 0.25, metalness: 0 },
}

const DEFAULT_SURFACE = { roughness: 0.75, metalness: 0 }

export function materialFor(role, { color, finish }, partColor) {
  const surface = FINISH_SURFACE[finish] ?? DEFAULT_SURFACE
  switch (role) {
    case 'main':
      return { color, ...surface }
    case 'soft':
      return { color: mixHex(color, '#ffffff', 0.12), ...surface, transparent: false, opacity: 1 }
    case 'wood':
      return finish === 'black-metal' || finish === 'brass'
        ? { color, ...surface }
        : { color: mixHex(color, '#3b2a1e', 0.45), roughness: 0.7, metalness: 0 }
    case 'metal':
      return { color: finish === 'brass' ? color : '#2b2b2d', roughness: 0.38, metalness: 0.7 }
    case 'dark':
      return { color: '#2a2b2e', roughness: 0.8, metalness: 0 }
    case 'linen':
      return { color: '#f3f0ea', roughness: 0.95, metalness: 0 }
    case 'shade':
      return { color: '#fbf3e3', roughness: 0.9, metalness: 0, emissive: '#ffe2b0', emissiveIntensity: 0.55 }
    case 'pot':
      return { color: '#cbbba6', roughness: 0.6, metalness: 0 }
    case 'leaf':
      return { color: mixHex(color, '#2f5a3a', 0.35), roughness: 0.7, metalness: 0 }
    case 'book':
      return { color: partColor ?? '#888888', roughness: 0.85, metalness: 0 }
    default:
      return { color, ...surface }
  }
}
