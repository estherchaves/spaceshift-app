import { Footprints, Magnet, Maximize, Minus, Plus } from 'lucide-react'
import { IconButton } from '@/components/ui'

export const ZOOM_STEP = 1.25

/** Controlos flutuantes da planta: zoom, enquadrar, snap e zona de circulação. */
export function ZoomControls({ zoomPercent, onZoomIn, onZoomOut, onFit, snap, onToggleSnap, circulation, onToggleCirculation }) {
  return (
    <div className="plan-toolbar" role="toolbar" aria-label="Vista da planta">
      <IconButton icon={Minus} label="Afastar" shortcut="−" size="sm" tooltipPlacement="top" onClick={onZoomOut} />
      <button type="button" className="plan-toolbar__zoom" onClick={onFit} aria-label={`Zoom ${zoomPercent}%. Clique para enquadrar.`}>
        {zoomPercent}%
      </button>
      <IconButton icon={Plus} label="Aproximar" shortcut="+" size="sm" tooltipPlacement="top" onClick={onZoomIn} />
      <span className="plan-toolbar__divider" aria-hidden="true" />
      <IconButton icon={Maximize} label="Enquadrar divisão" shortcut="0" size="sm" tooltipPlacement="top" onClick={onFit} />
      <IconButton
        icon={Magnet}
        label={snap ? 'Snap à grelha ativo' : 'Snap à grelha desligado'}
        shortcut="G"
        size="sm"
        tooltipPlacement="top"
        aria-pressed={snap}
        className="plan-toolbar__snap"
        onClick={onToggleSnap}
      />
      <IconButton
        icon={Footprints}
        label={circulation ? 'Esconder zona de circulação' : 'Mostrar zona de circulação'}
        shortcut="C"
        size="sm"
        tooltipPlacement="top"
        tooltipAlign="end"
        aria-pressed={circulation}
        className="plan-toolbar__snap"
        onClick={onToggleCirculation}
      />
    </div>
  )
}
