import { Box, Eye, Maximize, PanelTop } from 'lucide-react'
import { IconButton } from '@/components/ui'

/** Vistas rápidas da câmara 3D. */
export function SceneToolbar({ onView }) {
  return (
    <div className="scene3d__toolbar" role="toolbar" aria-label="Vista 3D">
      <IconButton icon={Box} label="Perspetiva" size="sm" tooltipPlacement="top" onClick={() => onView('perspective')} />
      <IconButton icon={PanelTop} label="Vista de cima" size="sm" tooltipPlacement="top" onClick={() => onView('top')} />
      <IconButton icon={Eye} label="Frontal" size="sm" tooltipPlacement="top" onClick={() => onView('front')} />
      <span className="scene3d__divider" aria-hidden="true" />
      <IconButton icon={Maximize} label="Enquadrar divisão" size="sm" tooltipPlacement="top" onClick={() => onView('fit')} />
    </div>
  )
}
