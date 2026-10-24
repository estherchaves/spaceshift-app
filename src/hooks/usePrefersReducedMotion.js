import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function getMedia() {
  return typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(QUERY) : null
}

function subscribe(callback) {
  const media = getMedia()
  media?.addEventListener('change', callback)
  return () => media?.removeEventListener('change', callback)
}

/** Verdadeiro quando o sistema pede menos movimento (o CSS já trata das transições). */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => getMedia()?.matches ?? false,
    () => false,
  )
}
