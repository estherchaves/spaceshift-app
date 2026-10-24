import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { getActiveLayout } from '@/core/model'
import { PrintSheet } from './PrintSheet.jsx'

/*
 * Impressão da ficha do projeto. Carregado só quando se imprime. A ficha
 * é montada num contentor à parte do <body>, o browser abre o diálogo de
 * impressão e, quando fecha, o contentor desaparece.
 */

let current = null

function cleanup() {
  current?.root.unmount()
  current?.container.remove()
  current = null
}

/** Monta a ficha da disposição ativa e abre a impressão. */
export function printProjectSheet(project, { date = new Date(), print = () => window.print() } = {}) {
  cleanup()
  const container = document.createElement('div')
  container.className = 'print-root'
  document.body.append(container)
  const root = createRoot(container)
  current = { root, container }
  flushSync(() => root.render(<PrintSheet project={project} layout={getActiveLayout(project)} date={date} />))
  window.addEventListener('afterprint', cleanup, { once: true })
  print()
}
