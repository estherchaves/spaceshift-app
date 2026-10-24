import { Magnet, Maximize, Minus, Plus } from 'lucide-react'
import { IconButton } from '@/components/ui'

export const ZOOM_STEP = 1.25

/** Controlos flutuantes da planta: zoom, enquadrar e snap. */
export function ZoomControls({ zoomPercent, onZoomIn, onZoomOut, onFit, snap, onToggleSnap }) {
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
    </div>
  )
}
