import { useEffect } from 'react'
import { getRepository } from '@/services/persistence'
import { startAutosave } from '@/store/autosave.js'

/**
 * Liga a gravação automática enquanto o editor está aberto. Grava também
 * quando a página é escondida (mudar de separador, fechar no telemóvel)
 * ou fechada, e ao sair do editor.
 */
export function useEditorPersistence() {
  useEffect(() => {
    const autosave = startAutosave({ repository: getRepository() })
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') autosave.flush()
    }
    const onPageHide = () => autosave.flush()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
      autosave.flush()
      autosave.stop()
    }
  }, [])
}
