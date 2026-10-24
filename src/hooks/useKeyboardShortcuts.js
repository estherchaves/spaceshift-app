import { useEffect, useRef } from 'react'

/** Verdadeiro quando o foco está num sítio onde o utilizador escreve. */
export function isEditableTarget(target) {
  if (!(target instanceof Element)) return false
  if (target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return true
  return false
}

/**
 * Atalhos de teclado globais. Cada atalho é `{ key, ctrl?, shift?, handler }`
 * (`ctrl` aceita Ctrl ou ⌘). Atalhos sem modificadores são ignorados
 * enquanto se escreve num campo, para não roubar teclas como Delete ou setas.
 * `shift` indefinido aceita as duas variantes. Com um diálogo modal aberto
 * nenhum atalho dispara: Delete não pode apagar o móvel que está por trás.
 */
export function useKeyboardShortcuts(shortcuts, { enabled = true } = {}) {
  const ref = useRef(shortcuts)
  useEffect(() => {
    ref.current = shortcuts
  })

  useEffect(() => {
    if (!enabled) return undefined
    const onKeyDown = (event) => {
      if (event.defaultPrevented || event.isComposing) return
      if (document.querySelector('[aria-modal="true"]')) return
      const ctrl = event.ctrlKey || event.metaKey
      if (isEditableTarget(event.target) && !ctrl) return
      for (const shortcut of ref.current) {
        const keys = Array.isArray(shortcut.key) ? shortcut.key : [shortcut.key]
        if (!keys.some((k) => k.toLowerCase() === event.key.toLowerCase())) continue
        if (Boolean(shortcut.ctrl) !== ctrl) continue
        if (shortcut.shift !== undefined && shortcut.shift !== event.shiftKey) continue
        if (event.altKey && !shortcut.alt) continue
        if (shortcut.handler(event) !== false) event.preventDefault()
        return
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
