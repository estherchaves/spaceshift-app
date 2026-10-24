import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './Menu.css'

/**
 * Menu de ações a partir de um botão. Abre com clique, Enter, Espaço ou
 * seta para baixo; as setas percorrem as opções, Escape fecha e devolve o
 * foco ao botão, um clique fora também fecha.
 *
 * @param {{trigger: (props: object) => import('react').ReactNode,
 *   items: ({label: string, icon?: any, onSelect: () => void, danger?: boolean, disabled?: boolean, hint?: string}|'separator')[],
 *   align?: 'start'|'end', label: string}} props
 */
export function Menu({ trigger, items, align = 'end', label, placement = 'bottom' }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState(null)
  const menuId = useId()
  const rootRef = useRef(null)
  const listRef = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onScrollOrResize = () => setOpen(false)
    window.addEventListener('resize', onScrollOrResize)
    listRef.current?.querySelector('[role="menuitem"]:not([aria-disabled="true"])')?.focus()
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target) && !listRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open])

  const close = (refocus = true) => {
    setOpen(false)
    if (refocus) triggerRef.current?.focus()
  }

  const onListKeyDown = (event) => {
    const options = [...listRef.current.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])')]
    const index = options.indexOf(document.activeElement)
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const delta = event.key === 'ArrowDown' ? 1 : -1
      options[(index + delta + options.length) % options.length]?.focus()
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      options[event.key === 'Home' ? 0 : options.length - 1]?.focus()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close()
    } else if (event.key === 'Tab') {
      close(false)
    }
  }

  return (
    <div className="menu" ref={rootRef}>
      {trigger({
        ref: triggerRef,
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        'aria-controls': open ? menuId : undefined,
        onClick: (event) => {
          event.stopPropagation()
          if (!open) setPosition(anchorFor(event.currentTarget, align, placement))
          setOpen((value) => !value)
        },
        onKeyDown: (event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setPosition(anchorFor(event.currentTarget, align, placement))
            setOpen(true)
          }
        },
      })}
      {open &&
        createPortal(
        <div
          ref={listRef}
          id={menuId}
          className="menu__list"
          data-align={align}
          data-placement={placement}
          role="menu"
          aria-label={label}
          style={position ?? undefined}
          onKeyDown={onListKeyDown}
        >
          {items.map((item, i) =>
            item === 'separator' ? (
              <div key={`sep${i}`} className="menu__separator" role="separator" />
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                tabIndex={-1}
                className="menu__item"
                data-danger={item.danger || undefined}
                aria-disabled={item.disabled || undefined}
                onClick={(event) => {
                  event.stopPropagation()
                  if (item.disabled) return
                  close(false)
                  item.onSelect()
                }}
              >
                {item.icon && <item.icon size={15} strokeWidth={1.75} aria-hidden="true" />}
                <span className="menu__label">{item.label}</span>
                {item.hint && <span className="menu__hint">{item.hint}</span>}
              </button>
            ),
          )}
        </div>,
        document.body,
      )}
    </div>
  )
}

/**
 * Posição fixa a partir do botão: o menu não fica cortado por
 * contentores com scroll (ex.: a barra de disposições).
 */
function anchorFor(trigger, align, placement) {
  const rect = trigger.getBoundingClientRect()
  const style = { position: 'fixed' }
  if (placement === 'top') Object.assign(style, { top: 'auto', bottom: window.innerHeight - rect.top + 6 })
  else style.top = rect.bottom + 6
  if (align === 'start') style.left = Math.max(8, rect.left)
  else style.right = Math.max(8, window.innerWidth - rect.right)
  return style
}
