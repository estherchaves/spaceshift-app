import { useLayoutEffect, useRef, useState } from 'react'

/**
 * Mede um elemento e volta a medir quando o seu tamanho muda
 * (redimensionar a janela, abrir/fechar painéis).
 * @returns {[import('react').RefObject<HTMLElement>, {width: number, height: number}]}
 */
export function useElementSize() {
  const ref = useRef(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return undefined
    const update = (width, height) =>
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }))
    const rect = element.getBoundingClientRect()
    update(rect.width, rect.height)
    if (typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(([entry]) => {
      update(entry.contentRect.width, entry.contentRect.height)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return [ref, size]
}
