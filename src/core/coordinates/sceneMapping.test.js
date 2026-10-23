import { describe, expect, it } from 'vitest'
import {
  planRotationToScene,
  planToScenePosition,
  scenePositionToPlan,
  sceneRotationToPlan,
} from './sceneMapping.js'

describe('mapeamento planta ↔ cena 3D', () => {
  it('usa as mesmas coordenadas X/Z e assenta o objeto no chão', () => {
    expect(planToScenePosition({ x: 1.2, z: 3.4 }, 0.8)).toEqual([1.2, 0.4, 3.4])
    expect(planToScenePosition({ x: 1, z: 1 }, 0.4, 1.5)).toEqual([1, 1.7, 1])
    expect(scenePositionToPlan([1.2, 0.4, 3.4])).toEqual({ x: 1.2, z: 3.4 })
  })

  it('inverte o sentido da rotação (horário na planta, anti-horário no Three.js)', () => {
    expect(planRotationToScene(0)).toBe(0)
    expect(planRotationToScene(90)).toBeCloseTo(-Math.PI / 2)
    expect(sceneRotationToPlan(-Math.PI / 2)).toBeCloseTo(90)
    expect(sceneRotationToPlan(planRotationToScene(225))).toBeCloseTo(225)
  })
})
