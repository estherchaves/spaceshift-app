import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { panBy, zoomAt } from '@/core/coordinates/viewport.js'
import { fitRoom } from './planGeometry.js'

/**
 * Estado da câmara 2D (zoom + deslocação).
 * Enquanto o utilizador não mexer na vista, a divisão fica sempre
 * enquadrada (acompanha o tamanho da janela e as medidas da divisão).
 * Depois de um zoom ou deslocação manual, a vista mantém-se até pedir
 * "Enquadrar" outra vez.
 */
export function useViewport(room, size) {
  const [manual, setManual] = useState(null)
  const ready = size.width > 0 && size.height > 0
  const fitted = useMemo(() => (ready ? fitRoom(room, size) : null), [ready, room, size])
  const viewport = manual ?? fitted

  // Refs para que os callbacks sejam estáveis e usem sempre o estado atual.
  const fittedRef = useRef(fitted)
  const sizeRef = useRef(size)
  useLayoutEffect(() => {
    fittedRef.current = fitted
    sizeRef.current = size
  })

  const zoomBy = useCallback((factor, anchor) => {
    const { width, height } = sizeRef.current
    const point = anchor ?? { x: width / 2, y: height / 2 }
    setManual((current) => {
      const base = current ?? fittedRef.current
      return base ? zoomAt(base, point, factor) : current
    })
  }, [])

  const pan = useCallback((dx, dy) => {
    setManual((current) => {
      const base = current ?? fittedRef.current
      return base ? panBy(base, dx, dy) : current
    })
  }, [])

  const fit = useCallback(() => setManual(null), [])

  return {
    viewport,
    zoomBy,
    pan,
    fit,
    isFitted: manual === null,
    zoomPercent: viewport && fitted ? Math.round((viewport.scale / fitted.scale) * 100) : 100,
  }
}
