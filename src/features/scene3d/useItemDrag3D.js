import { useThree } from '@react-three/fiber'
import { useRef } from 'react'
import { moveItem } from '@/core/editing'
import { findItem } from '@/core/model'
import { useEditorStore } from '@/store/editorStore.js'
import { useProjectStore } from '@/store/projectStore.js'
import { intersectFloor } from './room/roomGeometry.js'

/** Distância (px) a partir da qual um clique passa a ser um arrasto (igual à planta). */
const DRAG_THRESHOLD = 3

/**
 * Gestos sobre um móvel na cena 3D: clicar seleciona, arrastar move-o no
 * plano horizontal à altura do ponto agarrado (Alt desliga o snap).
 * Tal como na planta, durante o gesto só se escreve a pré-visualização em
 * `editorStore.interaction`; o documento muda uma única vez, ao largar.
 * As duas vistas leem `useDisplayedItems`, por isso a planta acompanha.
 */
export function useItemDrag3D(itemId) {
  // Lido no momento do gesto: os controlos só existem depois do primeiro render.
  const getThree = useThree((state) => state.get)
  const gesture = useRef(null)

  const setCursor = (cursor) => {
    getThree().gl.domElement.style.cursor = cursor
  }
  const setOrbitEnabled = (enabled) => {
    const { controls } = getThree()
    if (controls) controls.enabled = enabled
  }

  const onPointerDown = (e) => {
    if (e.button !== 0) return
    e.stopPropagation()
    const { project } = useProjectStore.getState()
    const item = findItem(project, itemId)
    if (!item) return
    useEditorStore.getState().selectItem(item.id)
    if (item.locked) return
    const grabHeight = e.point.y
    const start = intersectFloor(e.ray.origin.toArray(), e.ray.direction.toArray(), grabHeight)
    if (!start) return
    e.target.setPointerCapture(e.pointerId)
    gesture.current = { item, start, grabHeight, client: [e.nativeEvent.clientX, e.nativeEvent.clientY], moved: false }
    setOrbitEnabled(false)
  }

  const onPointerMove = (e) => {
    const g = gesture.current
    if (!g) return
    e.stopPropagation()
    const { clientX, clientY } = e.nativeEvent
    if (!g.moved && Math.hypot(clientX - g.client[0], clientY - g.client[1]) < DRAG_THRESHOLD) return
    const point = intersectFloor(e.ray.origin.toArray(), e.ray.direction.toArray(), g.grabHeight)
    if (!point) return
    g.moved = true
    setCursor('grabbing')
    const { settings } = useProjectStore.getState().project
    const delta = { x: point.x - g.start.x, z: point.z - g.start.z }
    const position = moveItem(g.item, g.item.position, delta, {
      gridSize: settings.gridSize,
      snap: settings.snapToGrid && !e.altKey,
    })
    useEditorStore.getState().setInteraction({ type: 'move', itemId: g.item.id, preview: { position } })
  }

  const finish = (e, commit) => {
    const g = gesture.current
    if (!g) return
    gesture.current = null
    e.stopPropagation()
    e.target.releasePointerCapture?.(e.pointerId)
    setOrbitEnabled(true)
    setCursor('grab')
    const editor = useEditorStore.getState()
    const preview = editor.interaction?.itemId === g.item.id ? editor.interaction.preview : null
    if (commit && g.moved && preview) useProjectStore.getState().updateItem(g.item.id, preview)
    editor.setInteraction(null)
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: (e) => finish(e, true),
    onPointerCancel: (e) => finish(e, false),
    onPointerOver: (e) => {
      e.stopPropagation()
      if (!gesture.current) setCursor(findItem(useProjectStore.getState().project, itemId)?.locked ? 'pointer' : 'grab')
    },
    onPointerOut: () => {
      if (!gesture.current) setCursor('')
    },
  }
}
