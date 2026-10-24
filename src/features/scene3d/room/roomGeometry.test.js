import { describe, expect, it } from 'vitest'
import { createRoom } from '@/core/model'
import {
  CUTAWAY_HEIGHT,
  cameraView,
  cutawayWallIds,
  displayedWall,
  fitDistance,
  fitView,
  intersectFloor,
  pendantCordLength,
  wallSegments,
} from './roomGeometry.js'

const room = createRoom({ width: 5, depth: 4, wallHeight: 2.7, wallThickness: 0.15 })

describe('wallSegments', () => {
  const walls = wallSegments(room)
  const byId = Object.fromEntries(walls.map((w) => [w.id, w]))

  it('cria quatro paredes por fora do retângulo interior', () => {
    expect(walls).toHaveLength(4)
    expect(byId.north.position).toEqual([2.5, 1.35, -0.075])
    expect(byId.south.position).toEqual([2.5, 1.35, 4.075])
    expect(byId.west.position).toEqual([-0.075, 1.35, 2])
    expect(byId.east.position).toEqual([5.075, 1.35, 2])
  })

  it('as paredes norte/sul cobrem os cantos e as faces interiores coincidem com as medidas', () => {
    expect(byId.north.size).toEqual([5.3, 2.7, 0.15])
    expect(byId.west.size).toEqual([0.15, 2.7, 4])
    expect(byId.north.position[2] + byId.north.size[2] / 2).toBeCloseTo(0)
    expect(byId.east.position[0] - byId.east.size[0] / 2).toBeCloseTo(5)
  })
})

describe('cutawayWallIds', () => {
  const walls = wallSegments(room)

  it('corta as paredes entre a câmara e o interior', () => {
    expect([...cutawayWallIds(walls, [8, 5, 9])].sort()).toEqual(['east', 'south'])
    expect([...cutawayWallIds(walls, [-3, 5, -2])].sort()).toEqual(['north', 'west'])
    expect([...cutawayWallIds(walls, [2.5, 3, 9])]).toEqual(['south'])
  })

  it('com a câmara dentro ou por cima da divisão não corta nenhuma', () => {
    expect(cutawayWallIds(walls, [2.5, 12, 2])).toEqual(new Set())
    expect(cutawayWallIds(walls, [1, 1.6, 1])).toEqual(new Set())
  })

  it('uma parede cortada fica com a altura do rodapé, assente no chão', () => {
    const wall = walls[0]
    const cut = displayedWall(wall, true)
    expect(cut.size[1]).toBe(CUTAWAY_HEIGHT)
    expect(cut.position[1]).toBe(CUTAWAY_HEIGHT / 2)
    expect(displayedWall(wall, false)).toBe(wall)
  })
})

describe('câmara', () => {
  it('fitDistance: a esfera cabe no campo de visão mais estreito', () => {
    const d = fitDistance(1, 90, 1)
    expect(d).toBeCloseTo(1 / Math.sin(Math.PI / 4))
    expect(fitDistance(1, 40, 0.5)).toBeGreaterThan(fitDistance(1, 40, 2))
  })

  it('vista de cima: sobre o centro, a olhar para o chão', () => {
    const { position, target } = cameraView('top', room)
    expect(target).toEqual([2.5, 0, 2])
    expect(position[0]).toBe(2.5)
    expect(position[1]).toBeGreaterThan(room.wallHeight)
    expect(position[2]).toBeCloseTo(2, 2)
  })

  it('vista frontal: do lado sul, à altura dos olhos', () => {
    const { position, target } = cameraView('front', room)
    expect(position[0]).toBe(2.5)
    expect(position[1]).toBe(1.6)
    expect(position[2]).toBeGreaterThan(room.depth)
    expect(target[2]).toBe(2)
  })

  it('perspetiva: elevada, a sudeste, com a divisão inteira no enquadramento', () => {
    const { position, target } = cameraView('perspective', room, { fov: 40, aspect: 1.6 })
    expect(position[0]).toBeGreaterThan(target[0])
    expect(position[2]).toBeGreaterThan(target[2])
    expect(position[1]).toBeGreaterThan(room.wallHeight)
  })

  it('fitView mantém a direção e centra a divisão', () => {
    const { position, target } = fitView(room, [0, 1, 1], { fov: 40, aspect: 1 })
    expect(target).toEqual([2.5, 0, 2])
    expect(position[0]).toBeCloseTo(2.5)
    expect(position[1] - target[1]).toBeCloseTo(position[2] - target[2])
  })
})

describe('intersectFloor', () => {
  it('encontra o ponto do chão para onde o raio aponta', () => {
    expect(intersectFloor([1, 2, 1], [1, -1, 0])).toEqual({ x: 3, z: 1 })
    expect(intersectFloor([0, 3, 0], [0, -1, 1], 1)).toEqual({ x: 0, z: 2 })
  })

  it('devolve null para raios paralelos ou que se afastam do plano', () => {
    expect(intersectFloor([0, 1, 0], [1, 0, 0])).toBeNull()
    expect(intersectFloor([0, 1, 0], [0, 1, 0])).toBeNull()
  })
})

describe('pendantCordLength', () => {
  it('liga o topo do candeeiro ao teto', () => {
    const item = { elevation: 1.95, dimensions: { height: 0.35 } }
    expect(pendantCordLength(item, 2.7)).toBeCloseTo(0.4)
    expect(pendantCordLength(item, 2.2)).toBe(0)
  })
})
