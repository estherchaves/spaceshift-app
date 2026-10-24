import { useEffect, useLayoutEffect, useRef } from 'react'
import { screenToWorld } from '@/core/coordinates/viewport.js'
import { moveItem, resizeFromHandle, rotationFromPointer } from '@/core/editing'
import { DEFAULT_SIZE_BOUNDS, findItem } from '@/core/model'
import { getSizeBounds } from '@/data/catalog/furniture.js'
import { useEditorStore } from '@/store/editorStore.js'
import { useProjectStore } from '@/store/projectStore.js'

/** Distância (px) a partir da qual um clique passa a ser um arrasto. */
const DRAG_THRESHOLD = 3
const WHEEL_ZOOM_SPEED = 0.0015
const PINCH_ZOOM_SPEED = 0.01

/**
 * Gestos do rato/toque sobre a planta:
 *  - clicar num móvel seleciona-o; arrastar move-o (Alt desliga o snap);
 *  - pegas: rodar (Shift = rotação livre) e redimensionar;
 *  - arrastar o fundo, botão do meio ou Espaço + arrastar desloca a vista;
 *  - clicar no fundo sem arrastar limpa a seleção;
 *  - roda do rato / pinça no trackpad faz zoom no ponto do cursor.
 *
 * Durante o gesto só se atualiza a pré-visualização (editorStore); o
 * documento é alterado uma única vez ao largar.
 */
export function usePlanPointer({ svgRef, viewport, pan, zoomBy }) {
  const gesture = useRef(null)
  const spaceDown = useRef(false)
  const viewportRef = useRef(viewport)
  useLayoutEffect(() => {
    viewportRef.current = viewport
  })
  // O <svg> só existe depois de a área ter tamanho; o efeito da roda volta a
  // correr quando isso acontece.
  const hasSvg = viewport !== null

  // Espaço mantido = modo deslocação (como nas ferramentas de desenho).
  useEffect(() => {
    const down = (e) => {
      if (e.code === 'Space' && !(e.target instanceof Element && e.target.closest('input, textarea, select, button'))) {
        spaceDown.current = true
      }
    }
    const up = (e) => {
      if (e.code === 'Space') spaceDown.current = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // A roda precisa de um listener não passivo para impedir o scroll da página.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return undefined
    const onWheel = (e) => {
      e.preventDefault()
      const rect = svg.getBoundingClientRect()
      const speed = e.ctrlKey ? PINCH_ZOOM_SPEED : WHEEL_ZOOM_SPEED
      zoomBy(Math.exp(-e.deltaY * speed), { x: e.clientX - rect.left, y: e.clientY - rect.top })
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [svgRef, zoomBy, hasSvg])

  const localPoint = (e) => {
    const rect = svgRef.current.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const onPointerDown = (e) => {
    if (!viewportRef.current || (e.button !== 0 && e.button !== 1)) return
    const screen = localPoint(e)
    const world = screenToWorld(viewportRef.current, screen)
    const target = e.target instanceof Element ? e.target.closest('[data-handle], [data-item-id]') : null
    const { project } = useProjectStore.getState()
    const editor = useEditorStore.getState()

    if (e.button === 1 || spaceDown.current || !target) {
      gesture.current = { type: 'pan', start: screen, last: screen, moved: false }
    } else if (target.dataset.handle) {
      const item = findItem(project, editor.selectedItemId)
      if (!item || item.locked) return
      const [type, id] = target.dataset.handle.split(':')
      gesture.current = {
        type,
        item,
        handle: type === 'resize' ? { sx: Number(target.dataset.sx), sz: Number(target.dataset.sz), id } : null,
        start: screen,
        moved: true,
      }
    } else {
      const item = findItem(project, target.dataset.itemId)
      if (!item) return
      editor.selectItem(item.id)
      if (item.locked) return
      gesture.current = { type: 'move', item, start: screen, startWorld: world, moved: false }
    }
    // preventDefault impede a seleção de texto, mas também a mudança de foco:
    // passamos o foco ao móvel clicado (para o teclado atuar nele) ou largamos
    // o foco de botões/campos quando se clica no fundo.
    e.preventDefault()
    const focusTarget = target?.closest('[data-item-id]')
    if (focusTarget) focusTarget.focus({ preventScroll: true })
    else if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur?.()
    svgRef.current.setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e) => {
    const g = gesture.current
    if (!g) return
    const screen = localPoint(e)
    if (!g.moved && Math.hypot(screen.x - g.start.x, screen.y - g.start.y) < DRAG_THRESHOLD) return
    g.moved = true

    const editor = useEditorStore.getState()
    if (g.type === 'pan') {
      pan(screen.x - g.last.x, screen.y - g.last.y)
      g.last = screen
      if (editor.interaction?.type !== 'pan') editor.setInteraction({ type: 'pan' })
      return
    }

    const world = screenToWorld(viewportRef.current, screen)
    const { settings } = useProjectStore.getState().project
    const snap = settings.snapToGrid && !e.altKey
    let preview
    if (g.type === 'move') {
      const delta = { x: world.x - g.startWorld.x, z: world.z - g.startWorld.z }
      preview = { position: moveItem(g.item, g.item.position, delta, { gridSize: settings.gridSize, snap }) }
    } else if (g.type === 'rotate') {
      preview = { rotation: rotationFromPointer(g.item.position, world, { step: settings.rotationStep, free: e.shiftKey }) }
    } else if (g.type === 'resize') {
      const bounds = getSizeBounds(g.item.catalogId, DEFAULT_SIZE_BOUNDS)
      preview = resizeFromHandle(g.item, g.handle, world, { bounds, gridSize: settings.gridSize, snap })
    }
    editor.setInteraction({ type: g.type, itemId: g.item.id, preview })
  }

  const finish = (e, commit) => {
    const g = gesture.current
    if (!g) return
    gesture.current = null
    svgRef.current?.releasePointerCapture?.(e.pointerId)
    const editor = useEditorStore.getState()
    if (commit) {
      if (g.type === 'pan' && !g.moved) editor.selectItem(null)
      const preview = editor.interaction?.itemId === g.item?.id ? editor.interaction?.preview : null
      if (preview) useProjectStore.getState().updateItem(g.item.id, preview)
    }
    editor.setInteraction(null)
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: (e) => finish(e, true),
    onPointerCancel: (e) => finish(e, false),
  }
}
