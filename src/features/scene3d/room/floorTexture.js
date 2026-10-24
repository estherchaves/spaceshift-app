import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'
import { drawFloorPattern, floorPattern } from './floorPattern.js'

const TEXTURE_PX = 1024

/**
 * Textura do chão desenhada num canvas local, repetida para cobrir
 * `width` × `depth` metros. Devolve null se o browser
 * não tiver contexto 2D (o chão fica com a cor lisa).
 */
export function createFloorTexture(material, color, { width, depth }) {
  const canvas = document.createElement('canvas')
  canvas.width = TEXTURE_PX
  canvas.height = TEXTURE_PX
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const pattern = floorPattern(material, color)
  drawFloorPattern(ctx, pattern, TEXTURE_PX)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.anisotropy = 8
  texture.repeat.set(width / pattern.tileSize, depth / pattern.tileSize)
  return texture
}
