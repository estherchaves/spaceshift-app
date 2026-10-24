import { useSyncExternalStore } from 'react'

/*
 * Rotas por hash, sem dependências e compatíveis com qualquer alojamento
 * estático (GitHub Pages, Netlify…):
 *   #/                    → lista de projetos
 *   #/projeto/<id>        → editor desse projeto
 * Recarregar a página reabre o mesmo projeto e o botão Recuar do browser
 * volta à lista.
 */

export function parseRoute(hash) {
  const path = hash.replace(/^#/, '') || '/'
  const match = path.match(/^\/projeto\/([^/?#]+)\/?$/)
  if (match) return { name: 'editor', projectId: decodeURIComponent(match[1]) }
  return { name: 'projects' }
}

export const projectsPath = () => '#/'
export const editorPath = (projectId) => `#/projeto/${encodeURIComponent(projectId)}`

export function navigate(path, { replace = false } = {}) {
  if (window.location.hash === path) return
  if (replace) {
    window.history.replaceState(null, '', path)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else {
    window.location.hash = path
  }
}

const subscribe = (callback) => {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}

export function useHash() {
  return useSyncExternalStore(subscribe, () => window.location.hash)
}
