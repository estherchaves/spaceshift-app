import ReactThreeTestRenderer from '@react-three/test-renderer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFurnitureItem, createOpening, createRoom, findItem } from '@/core/model'
import { getCatalogEntry } from '@/data/catalog/furniture.js'
import { resetEditorStore, useEditorStore } from '@/store/editorStore.js'
import { resetProjectStore, useProjectStore } from '@/store/projectStore.js'
import { Furniture3D } from './Furniture3D.jsx'
import { buildFurnitureParts } from './models/furnitureModels.js'
import { FurnitureModel } from './models/FurnitureModel.jsx'
import { Room3D } from './room/Room3D.jsx'

/*
 * Testes do grafo de cena com @react-three/test-renderer: monta os
 * componentes R3F sem WebGL e inspeciona os objetos Three.js criados.
 */

beforeEach(() => {
  resetProjectStore()
  resetEditorStore()
  // Sem canvas 2D no jsdom: o chão usa a cor lisa.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
})
afterEach(() => vi.restoreAllMocks())

const meshes = (renderer) => renderer.scene.findAll((node) => node.type === 'Mesh')

describe('FurnitureModel', () => {
  it('cria uma mesh por peça do modelo', async () => {
    const dims = { width: 2.2, depth: 0.95, height: 0.82 }
    const renderer = await ReactThreeTestRenderer.create(
      <FurnitureModel modelKey="sofa" {...dims} color="#8a8f87" finish="linen" />,
    )
    expect(meshes(renderer)).toHaveLength(buildFurnitureParts('sofa', dims).length)
  })

  it('aplica a cor e o acabamento ao material principal', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <FurnitureModel modelKey="rug" width={2} depth={1.4} height={0.01} color="#336699" finish="wool" />,
    )
    const [rug] = meshes(renderer)
    expect(rug.instance.material.color.getHexString()).toBe(new rug.instance.material.color.constructor('#336699').getHexString())
    expect(rug.instance.material.roughness).toBeCloseTo(0.98)
    expect(rug.instance.castShadow).toBe(true)
  })
})

describe('Furniture3D', () => {
  const sofa = createFurnitureItem(getCatalogEntry('sofa-3'), { position: { x: 2, z: 1.5 }, rotation: 90 })

  it('posiciona e roda o móvel como na planta', async () => {
    const renderer = await ReactThreeTestRenderer.create(<Furniture3D item={sofa} ceilingHeight={2.7} />)
    const group = renderer.scene.children[0].instance
    expect(group.position.toArray()).toEqual([2, 0, 1.5])
    expect(group.rotation.y).toBeCloseTo(-Math.PI / 2)
    expect(group.userData.state).toBeNull()
  })

  it('marca seleção, erro e aviso (o erro tem prioridade)', async () => {
    const selected = await ReactThreeTestRenderer.create(<Furniture3D item={sofa} selected ceilingHeight={2.7} />)
    expect(selected.scene.children[0].instance.userData.state).toBe('selected')
    const conflict = await ReactThreeTestRenderer.create(<Furniture3D item={sofa} selected status="error" ceilingHeight={2.7} />)
    expect(conflict.scene.children[0].instance.userData.state).toBe('conflict')
    const warning = await ReactThreeTestRenderer.create(<Furniture3D item={sofa} status="warning" ceilingHeight={2.7} />)
    expect(warning.scene.children[0].instance.userData.state).toBe('warning')
  })

  it('a pegada realçada segue a forma real da mesa redonda', async () => {
    const table = createFurnitureItem(getCatalogEntry('round-table'))
    const renderer = await ReactThreeTestRenderer.create(<Furniture3D item={table} status="error" ceilingHeight={2.7} />)
    const footprint = meshes(renderer).find((m) => m.instance.geometry.type === 'ShapeGeometry')
    footprint.instance.geometry.computeBoundingBox()
    const box = footprint.instance.geometry.boundingBox
    expect(box.max.x - box.min.x).toBeCloseTo(1.1, 2)
    // Uma elipse ocupa π/4 do retângulo: a geometria tem muitos vértices, não 4.
    expect(footprint.instance.geometry.attributes.position.count).toBeGreaterThan(32)
  })

  it('o candeeiro suspenso tem um cabo até ao teto', async () => {
    const pendant = createFurnitureItem(getCatalogEntry('pendant-lamp'))
    const renderer = await ReactThreeTestRenderer.create(<Furniture3D item={pendant} ceilingHeight={2.7} />)
    const cord = meshes(renderer).find((m) => m.instance.geometry.type === 'CylinderGeometry' && m.instance.geometry.parameters.radiusTop === 0.004)
    const top = pendant.elevation + pendant.dimensions.height
    expect(cord.instance.geometry.parameters.height).toBeCloseTo(2.7 - top)
  })

  it('arrastar no 3D pré-visualiza o movimento e grava-o ao largar', async () => {
    const id = useProjectStore.getState().addFromCatalog('sofa-3')
    const item = findItem(useProjectStore.getState().project, id)
    const renderer = await ReactThreeTestRenderer.create(<Furniture3D item={item} ceilingHeight={2.7} />)
    const target = renderer.scene.findAll((node) => node.type === 'Group')[1]
    // Raios verticais: o ponto agarrado no plano horizontal é (x, z).
    const pointer = (x, z) => ({
      button: 0,
      pointerId: 1,
      point: { y: 0.4 },
      ray: { origin: { toArray: () => [x, 5, z] }, direction: { toArray: () => [0, -1, 0] } },
      target: { setPointerCapture: () => {}, releasePointerCapture: () => {} },
      nativeEvent: { clientX: x * 100, clientY: z * 100 },
    })
    const start = item.position
    await renderer.fireEvent(target, 'onPointerDown', pointer(start.x, start.z))
    expect(useEditorStore.getState().selectedItemId).toBe(item.id)

    await renderer.fireEvent(target, 'onPointerMove', pointer(start.x + 0.5, start.z - 0.3))
    const { interaction } = useEditorStore.getState()
    expect(interaction).toMatchObject({ type: 'move', itemId: item.id })
    expect(interaction.preview.position.x).toBeCloseTo(start.x + 0.5)
    expect(interaction.preview.position.z).toBeCloseTo(start.z - 0.3)
    expect(findItem(useProjectStore.getState().project, item.id).position).toEqual(start)

    await renderer.fireEvent(target, 'onPointerUp', pointer(start.x + 0.5, start.z - 0.3))
    expect(useEditorStore.getState().interaction).toBeNull()
    const moved = findItem(useProjectStore.getState().project, item.id).position
    expect(moved.x).toBeCloseTo(start.x + 0.5)
    expect(moved.z).toBeCloseTo(start.z - 0.3)
  })

  it('um móvel bloqueado seleciona-se mas não se arrasta', async () => {
    const id = useProjectStore.getState().addFromCatalog('desk')
    useProjectStore.getState().updateItem(id, { locked: true })
    const item = findItem(useProjectStore.getState().project, id)
    const renderer = await ReactThreeTestRenderer.create(<Furniture3D item={item} ceilingHeight={2.7} />)
    const target = renderer.scene.findAll((node) => node.type === 'Group')[1]
    const event = {
      button: 0,
      point: { y: 0.7 },
      ray: { origin: { toArray: () => [0, 5, 0] }, direction: { toArray: () => [0, -1, 0] } },
      target: { setPointerCapture: () => {} },
      nativeEvent: { clientX: 0, clientY: 0 },
    }
    await renderer.fireEvent(target, 'onPointerDown', event)
    await renderer.fireEvent(target, 'onPointerMove', { ...event, nativeEvent: { clientX: 80, clientY: 0 } })
    expect(useEditorStore.getState().selectedItemId).toBe(item.id)
    expect(useEditorStore.getState().interaction).toBeNull()
  })
})

describe('Room3D', () => {
  it('cria o chão e as quatro paredes com as medidas da divisão', async () => {
    const room = createRoom({ width: 4.2, depth: 3.1, wallHeight: 2.6 })
    const renderer = await ReactThreeTestRenderer.create(<Room3D room={room} />)
    const floor = renderer.scene.find((n) => n.instance.name === 'floor').instance
    expect(floor.geometry.parameters).toMatchObject({ width: 4.2, height: 3.1 })
    expect(floor.position.toArray()).toEqual([2.1, 0, 1.55])
    const walls = meshes(renderer).filter((m) => m.instance.name.startsWith('wall:'))
    expect(walls).toHaveLength(4)
    expect(walls.every((w) => w.instance.scale.y === 2.6)).toBe(true)
  })

  it('corta as paredes viradas para a câmara', async () => {
    const room = createRoom({ width: 4, depth: 3 })
    const renderer = await ReactThreeTestRenderer.create(<Room3D room={room} />, { camera: { position: [10, 5, -4] } })
    await renderer.advanceFrames(1, 0.016)
    const wall = (id) => renderer.scene.find((n) => n.instance.name === `wall:${id}:s0`).instance
    expect(wall('east').userData.cut).toBe(true)
    expect(wall('north').userData.cut).toBe(true)
    expect(wall('north').scale.y).toBeLessThan(0.2)
    expect(wall('south').userData.cut).toBe(false)
    expect(wall('west').scale.y).toBe(room.wallHeight)
  })

  it('abre vãos para portas e janelas e mostra a folha da porta e o vidro', async () => {
    const base = createRoom({ width: 4, depth: 3 })
    const door = createOpening(base, 'door', { wall: 'bottom' })
    const win = createOpening({ ...base, openings: [door] }, 'window', { wall: 'left' })
    const room = { ...base, openings: [door, win] }
    const renderer = await ReactThreeTestRenderer.create(<Room3D room={room} />)
    const names = meshes(renderer).map((m) => m.instance.name)
    // Sul: dois troços inteiros + um por cima da porta; oeste: dois troços + baixo + cima da janela.
    expect(names.filter((n) => n.startsWith('wall:south'))).toHaveLength(3)
    expect(names.filter((n) => n.startsWith('wall:west'))).toHaveLength(4)
    expect(names).toContain(`door:${door.id}`)
    expect(names).toContain(`window:${win.id}`)
  })
})
