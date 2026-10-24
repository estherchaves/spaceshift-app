import { describe, expect, it } from 'vitest'
import {
  applyOpeningPatch,
  applyRoomPatch,
  createOpening,
  createProject,
  doorSwingPolygon,
  findOpeningOffset,
  migrateProject,
  openingSegment,
  parseProject,
  serializeProject,
  validateProject,
} from '@/core/model'
import { polygonArea } from '@/core/geometry/polygon.js'

const room = { ...createProject().room, width: 4, depth: 3, openings: [] }

describe('aberturas', () => {
  it('cria uma porta no meio da parede pedida', () => {
    const door = createOpening(room, 'door', { wall: 'bottom' })
    expect(door).toMatchObject({ type: 'door', wall: 'bottom', offset: 2, width: 0.8, sill: 0, hinge: 'start', swing: 'in' })
    const seg = openingSegment(room, door)
    expect(seg.from).toEqual({ x: 1.6, z: 3 })
    expect(seg.to).toEqual({ x: 2.4, z: 3 })
    expect(seg.inward).toEqual({ x: 0, z: -1 })
  })

  it('não sobrepõe aberturas na mesma parede e procura outra parede quando esta está cheia', () => {
    const first = createOpening(room, 'window', { wall: 'top', width: 3 })
    const withFirst = { ...room, openings: [first] }
    expect(findOpeningOffset(withFirst, withFirst.openings, { ...first, id: 'x', width: 1 }, 2)).toBeNull()
    const second = createOpening(withFirst, 'window', { wall: 'top', width: 1 })
    expect(second.wall).not.toBe('top')
  })

  it('a área da folha é um quarto de círculo do lado para onde abre', () => {
    const door = createOpening(room, 'door', { wall: 'left', preferred: 1.5, width: 0.9 })
    const swing = doorSwingPolygon(room, door, 64)
    expect(polygonArea(swing)).toBeCloseTo((Math.PI * 0.9 * 0.9) / 4, 2)
    // Para dentro: todos os pontos com x ≥ 0 (parede esquerda).
    expect(swing.every((p) => p.x >= -1e-9)).toBe(true)
    const out = doorSwingPolygon(room, { ...door, swing: 'out' })
    expect(out.every((p) => p.x <= 1e-9)).toBe(true)
  })

  it('as alterações mantêm a abertura dentro da parede', () => {
    const door = createOpening(room, 'door', { wall: 'top' })
    expect(applyOpeningPatch(room, door, { offset: 99 }).offset).toBeCloseTo(4 - 0.4 - 0.1)
    expect(applyOpeningPatch(room, door, { width: 10 }).width).toBeCloseTo(3.8)
    expect(applyOpeningPatch(room, door, { hinge: 'meio', swing: 'out' })).toMatchObject({ hinge: 'start', swing: 'out' })
    const win = createOpening(room, 'window', { wall: 'top' })
    expect(applyOpeningPatch(room, win, { sill: 2.5, height: 2 })).toMatchObject({ sill: 2.4, height: 0.3 })
  })

  it('encolher a divisão traz as aberturas para dentro das paredes', () => {
    const door = createOpening(room, 'door', { wall: 'top', preferred: 3.4 })
    const smaller = applyRoomPatch({ ...room, openings: [door] }, { width: 2 })
    expect(smaller.openings[0].offset).toBeCloseTo(2 - 0.4 - 0.1)
    // Sem mudanças nas aberturas, o objeto mantém-se (sem entradas falsas no histórico).
    const same = { ...room, openings: [createOpening(room, 'door')] }
    expect(applyRoomPatch(same, {}).openings).toBe(same.openings)
  })
})

describe('esquema v2', () => {
  it('migra um projeto v1 para v2 com paredes sem aberturas e sem perfil de acessibilidade', () => {
    const project = createProject()
    const { openings, ...roomV1 } = project.room
    const { accessibility, ...settingsV1 } = project.settings
    expect(openings).toEqual([])
    expect(accessibility).toBe('none')
    const v1 = { ...project, schemaVersion: 1, room: roomV1, settings: settingsV1 }
    const result = migrateProject(v1)
    expect(result.ok).toBe(true)
    expect(result.migrated).toBe(true)
    expect(result.project.room.openings).toEqual([])
    expect(result.project.settings.accessibility).toBe('none')
    expect(validateProject(result.project).valid).toBe(true)
  })

  it('guarda e lê portas e janelas', () => {
    const project = createProject()
    const door = createOpening(project.room, 'door')
    const saved = { ...project, room: { ...project.room, openings: [door] } }
    const parsed = parseProject(serializeProject(saved))
    expect(parsed.ok).toBe(true)
    expect(parsed.project.room.openings).toEqual([door])
  })

  it('recusa aberturas inválidas', () => {
    const project = createProject()
    const bad = { ...project, room: { ...project.room, openings: [{ id: 'o', type: 'porta', wall: 'meio' }] } }
    const { valid, errors } = validateProject(bad)
    expect(valid).toBe(false)
    expect(errors.map((e) => e.path)).toEqual(expect.arrayContaining(['room.openings[0].type', 'room.openings[0].wall']))
  })
})
