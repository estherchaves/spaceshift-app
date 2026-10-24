import { MonitorOff, RotateCcw, Square, TriangleAlert } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { Button, EmptyState } from '@/components/ui'
import { useEditorStore } from '@/store/editorStore.js'
import { SceneErrorBoundary } from './SceneErrorBoundary.jsx'
import { isWebGLAvailable } from './webgl.js'
import './Scene3D.css'

// O Three.js só é descarregado quando a vista 3D é aberta pela primeira vez.
const Scene3D = lazy(() => import('./Scene3D.jsx'))

/** Área da vista 3D: verifica o WebGL, carrega a cena em diferido e isola erros. */
export function SceneView() {
  const [webgl] = useState(isWebGLAvailable)
  const setViewMode = useEditorStore((state) => state.setViewMode)
  const backTo2d = (
    <Button icon={Square} onClick={() => setViewMode('2d')}>
      Voltar à planta 2D
    </Button>
  )

  if (!webgl) {
    return (
      <section className="scene-view" aria-label="Vista 3D">
        <div className="scene-view__state">
          <EmptyState icon={MonitorOff} title="A vista 3D não está disponível neste navegador" action={backTo2d}>
            É preciso WebGL, que parece estar desativado ou não ser suportado. A planta 2D continua a funcionar
            normalmente.
          </EmptyState>
        </div>
      </section>
    )
  }

  return (
    <section className="scene-view" aria-label="Vista 3D">
      <SceneErrorBoundary
        fallback={(retry) => (
          <div className="scene-view__state">
            <EmptyState
              icon={TriangleAlert}
              title="Não foi possível mostrar a cena 3D"
              action={
                <div className="scene-view__actions">
                  <Button icon={RotateCcw} onClick={retry}>
                    Tentar novamente
                  </Button>
                  {backTo2d}
                </div>
              }
            >
              O teu projeto não foi afetado. Podes tentar de novo ou continuar na planta 2D.
            </EmptyState>
          </div>
        )}
      >
        <Suspense
          fallback={
            <div className="scene-view__state">
              <p className="scene-view__loading" role="status">
                <span className="scene-view__spinner" aria-hidden="true" />A preparar a cena 3D…
              </p>
            </div>
          }
        >
          <Scene3D />
        </Suspense>
      </SceneErrorBoundary>
    </section>
  )
}
