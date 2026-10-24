import { useCallback, useEffect, useState } from 'react'
import { getRepository } from '@/services/persistence'

/** Lista de projetos guardados; `reload()` volta a ler depois de cada ação. */
export function useProjects() {
  const [version, setVersion] = useState(0)
  const [state, setState] = useState({ status: 'loading', projects: [], error: null })

  useEffect(() => {
    let cancelled = false
    getRepository()
      .list()
      .then((projects) => !cancelled && setState({ status: 'ready', projects, error: null }))
      .catch((error) => !cancelled && setState({ status: 'error', projects: [], error: error?.message ?? 'Não foi possível ler os projetos.' }))
    return () => {
      cancelled = true
    }
  }, [version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  return { ...state, reload, persistent: getRepository().persistent }
}
