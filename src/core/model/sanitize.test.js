import { describe, expect, it } from 'vitest'
import { applyRoomPatch, applySettingsPatch, createRoom, DEFAULT_SETTINGS, sanitizeProjectName } from './index.js'

describe('applyRoomPatch', () => {
  const room = createRoom()

  it('aplica medidas válidas arredondadas ao milímetro', () => {
    expect(applyRoomPatch(room, { width: 4.12345, depth: 3 })).toMatchObject({ width: 4.123, depth: 3 })
  })

  it('limita medidas aos valores permitidos', () => {
    expect(applyRoomPatch(room, { width: 0.2, depth: 99 })).toMatchObject({ width: 1, depth: 30 })
  })

  it('ignora valores inválidos sem lançar exceções', () => {
    const next = applyRoomPatch(room, { width: NaN, type: 'garagem', wallColor: 'azul', floorMaterial: 'lava' })
    expect(next).toEqual(room)
  })

  it('ao trocar de material aplica a cor típica, a não ser que venha uma cor', () => {
    expect(applyRoomPatch(room, { floorMaterial: 'walnut' }).floorColor).toBe('#7a5a43')
    expect(applyRoomPatch(room, { floorMaterial: 'walnut', floorColor: '#ABCDEF' }).floorColor).toBe('#abcdef')
  })

  it('não altera o objeto original', () => {
    applyRoomPatch(room, { width: 9 })
    expect(room.width).toBe(5)
  })
})

describe('applySettingsPatch', () => {
  it('valida e limita as definições do editor', () => {
    const next = applySettingsPatch(DEFAULT_SETTINGS, { gridSize: 5, snapToGrid: false, circulationMin: 0.1, rotationStep: 7.6 })
    expect(next).toEqual({ ...DEFAULT_SETTINGS, gridSize: 1, snapToGrid: false, circulationMin: 0.3, rotationStep: 8 })
    expect(applySettingsPatch(DEFAULT_SETTINGS, { snapToGrid: 'sim' }).snapToGrid).toBe(true)
  })
})

describe('sanitizeProjectName', () => {
  it('normaliza espaços e rejeita nomes vazios', () => {
    expect(sanitizeProjectName('  Sala   da Ana ')).toBe('Sala da Ana')
    expect(sanitizeProjectName('   ')).toBeNull()
    expect(sanitizeProjectName(42)).toBeNull()
    expect(sanitizeProjectName('x'.repeat(200))).toHaveLength(80)
  })
})
