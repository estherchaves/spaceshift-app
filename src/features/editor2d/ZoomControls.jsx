import { Footprints, Magnet, Maximize, Minus, Plus, Route } from 'lucide-react'
import { IconButton } from '@/components/ui'

export const ZOOM_STEP = 1.25

/** Controlos flutuantes da planta: zoom, enquadrar, snap, zona de circulação e percurso a pé. */
export function ZoomControls({ zoomPercent, onZoomIn, onZoomOut, onFit, snap, onToggleSnap, circulation, onToggleCirculation, walk, onToggleWalk }) {
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
        aria-pressed={circulation}
        className="plan-toolbar__snap"
        onClick={onToggleCirculation}
      />
      <IconButton
        icon={Route}
        label={walk ? 'Fechar percurso a pé' : 'Percurso a pé entre dois pontos'}
        shortcut="P"
        size="sm"
        tooltipPlacement="top"
        tooltipAlign="end"
        aria-pressed={Boolean(walk)}
        className="plan-toolbar__snap"
        onClick={onToggleWalk}
      />
    </div>
  )
}
