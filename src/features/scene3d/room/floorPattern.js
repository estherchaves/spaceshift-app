import { mixHex } from '../models/materials.js'

/*
 * Padrões de pavimento gerados localmente (sem imagens externas).
 * `floorPattern` é puro e descreve o que desenhar; `drawFloorPattern`
 * desenha-o num contexto 2D de canvas. A textura cobre um quadrado de
 * `tileSize` metros e repete-se ao longo do chão.
 */

/** Gerador pseudo-aleatório determinístico (mulberry32): o mesmo chão em todas as sessões. */
export function seededRandom(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const KIND_BY_MATERIAL = { oak: 'planks', walnut: 'planks', tile: 'tiles', concrete: 'concrete', carpet: 'carpet' }

/** Tamanho (m) do quadrado representado pela textura, por tipo de padrão. */
const TILE_SIZE = { planks: 2.4, tiles: 1.2, concrete: 2, carpet: 1 }

export function floorPattern(material, color) {
  const kind = KIND_BY_MATERIAL[material] ?? 'concrete'
  const tileSize = TILE_SIZE[kind]
  const rand = seededRandom(kind.length * 977 + 13)
  if (kind === 'planks') {
    // Tábuas de 18 cm em fiadas com juntas desencontradas e comprimentos 0,9–1,6 m.
    const plankWidth = 0.18
    const rows = Math.round(tileSize / plankWidth)
    const planks = []
    for (let row = 0; row < rows; row++) {
      let x = -rand() * 1.2
      while (x < tileSize) {
        const length = 0.9 + rand() * 0.7
        planks.push({ x, z: row * (tileSize / rows), length, width: tileSize / rows, shade: rand() * 2 - 1 })
        x += length
      }
    }
    return { kind, tileSize, color, planks }
  }
  if (kind === 'tiles') return { kind, tileSize, color, tile: 0.6, grout: 0.004 }
  return { kind, tileSize, color, grains: kind === 'carpet' ? 9000 : 2600 }
}

/** Desenha `pattern` num canvas quadrado de `px` píxeis. Fica repetível nas arestas. */
export function drawFloorPattern(ctx, pattern, px) {
  const scale = px / pattern.tileSize
  const { color } = pattern
  ctx.fillStyle = color
  ctx.fillRect(0, 0, px, px)

  if (pattern.kind === 'planks') {
    for (const plank of pattern.planks) {
      const tone = plank.shade > 0 ? mixHex(color, '#ffffff', plank.shade * 0.07) : mixHex(color, '#000000', -plank.shade * 0.07)
      ctx.fillStyle = tone
      // Desenha também a cópia deslocada de um quadrado para a junção ficar contínua.
      for (const offset of [0, -pattern.tileSize, pattern.tileSize]) {
        ctx.fillRect((plank.x + offset) * scale, plank.z * scale, plank.length * scale, plank.width * scale)
        ctx.fillStyle = mixHex(color, '#000000', 0.22)
        ctx.fillRect((plank.x + offset) * scale, plank.z * scale, Math.max(1, px / 900), plank.width * scale)
        ctx.fillStyle = tone
      }
      ctx.fillStyle = mixHex(color, '#000000', 0.18)
      ctx.fillRect(0, plank.z * scale, px, Math.max(1, px / 700))
    }
    return
  }

  if (pattern.kind === 'tiles') {
    ctx.fillStyle = mixHex(color, '#7f7a72', 0.35)
    const step = pattern.tile * scale
    const line = Math.max(1.5, pattern.grout * scale)
    for (let p = 0; p <= px + 1; p += step) {
      ctx.fillRect(p - line / 2, 0, line, px)
      ctx.fillRect(0, p - line / 2, px, line)
    }
    return
  }

  const rand = seededRandom(pattern.grains)
  for (let i = 0; i < pattern.grains; i++) {
    const t = rand()
    ctx.fillStyle = t > 0.5 ? mixHex(color, '#ffffff', (t - 0.5) * 0.18) : mixHex(color, '#000000', (0.5 - t) * 0.18)
    const size = pattern.kind === 'carpet' ? 2 : 1 + rand() * 3
    ctx.fillRect(rand() * px, rand() * px, size, size)
  }
}
