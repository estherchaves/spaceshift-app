import { Copy, Lock, LockOpen, RotateCcw, RotateCw, Trash2, Truck } from 'lucide-react'
import { useState } from 'react'
import { Button, ColorField, FieldGrid, IconButton, NumberField, PanelSection } from '@/components/ui'
import { DEFAULT_SIZE_BOUNDS, FURNITURE_CATEGORIES, LIMITS } from '@/core/model'
import { getCatalogEntry, getSizeBounds } from '@/data/catalog/furniture.js'
import { FINISHES } from '@/data/catalog/finishes.js'
import { deleteSelected, duplicateSelected, rotateSelected, toggleLockSelected } from '@/store/commands.js'
import { IssueList } from '@/features/analysis/IssueList.jsx'
import { useProjectStore } from '@/store/projectStore.js'
import { useLayoutAnalysis } from '@/store/selectors.js'
import { DeliveryDialog } from '@/features/delivery/DeliveryDialog.jsx'
import { FinishPicker } from './FinishPicker.jsx'
import './ItemInspector.css'

const cm = (m) => Math.round(m * 1000) / 10
const LOCKED_REASON = 'Desbloqueie o móvel para o alterar'

/**
 * Propriedades do móvel selecionado com valores exatos. Mostra o estado em
 * tempo real, também durante um arrasto na planta.
 */
export function ItemInspector({ item }) {
  const updateItem = useProjectStore((state) => state.updateItem)
  const entry = getCatalogEntry(item.catalogId)
  const bounds = getSizeBounds(item.catalogId, DEFAULT_SIZE_BOUNDS)
  const fixed = (key) => bounds.min[key] === bounds.max[key]
  const update = (patch) => updateItem(item.id, patch)
  const locked = item.locked
  const finishes = entry?.finishes ?? []
  const elevated = (entry?.elevation ?? 0) > 0 || item.elevation > 0
  const analysis = useLayoutAnalysis()
  const issues = analysis.issues.filter((issue) => issue.itemIds.includes(item.id))
  const [deliveryOpen, setDeliveryOpen] = useState(false)

  return (
    <div className="item-inspector" data-locked={locked || undefined}>
      <div className="item-inspector__header">
        <span className="item-inspector__swatch" style={{ background: item.color }} aria-hidden="true" />
        <div className="item-inspector__title">
          <p className="item-inspector__name">{item.name}</p>
          <p className="item-inspector__category">
            {FURNITURE_CATEGORIES[item.category].label}
            {entry?.price != null && ` · ${new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(entry.price)}`}
          </p>
        </div>
        {locked && (
          <span className="item-inspector__locked" role="status">
            <Lock size={12} strokeWidth={2} aria-hidden="true" /> Bloqueado
          </span>
        )}
      </div>

      {issues.length > 0 && (
        <PanelSection title="Problemas">
          <IssueList issues={issues} compact lockedIds={locked ? new Set([item.id]) : undefined} />
        </PanelSection>
      )}

      <PanelSection title="Posição">
        <FieldGrid>
          <NumberField label="X" unit="m" value={item.position.x} step={0.01} disabled={locked} onCommit={(x) => update({ position: { x } })} />
          <NumberField label="Z" unit="m" value={item.position.z} step={0.01} disabled={locked} onCommit={(z) => update({ position: { z } })} />
        </FieldGrid>
        <div className="item-inspector__rotation">
          <NumberField
            label="Rotação"
            unit="°"
            value={item.rotation}
            precision={1}
            step={1}
            disabled={locked}
            onCommit={(rotation) => update({ rotation })}
          />
          <IconButton icon={RotateCcw} label="Rodar para a esquerda" shortcut="Shift+R" disabled={locked} disabledReason={LOCKED_REASON} onClick={() => rotateSelected(-1)} />
          <IconButton icon={RotateCw} label="Rodar para a direita" shortcut="R" disabled={locked} disabledReason={LOCKED_REASON} tooltipAlign="end" onClick={() => rotateSelected(1)} />
        </div>
        <p className="item-inspector__hint">X e Z indicam o centro do móvel, medidos a partir do canto superior esquerdo da divisão.</p>
      </PanelSection>

      <PanelSection title="Dimensões">
        <FieldGrid columns={3}>
          {[
            ['width', 'Comprimento'],
            ['depth', 'Largura'],
            ['height', 'Altura'],
          ].map(([key, label]) => (
            <NumberField
              key={key}
              label={label}
              unit="cm"
              value={cm(item.dimensions[key])}
              min={cm(bounds.min[key])}
              max={cm(bounds.max[key])}
              precision={1}
              step={1}
              disabled={locked || fixed(key)}
              onCommit={(value) => update({ dimensions: { [key]: value / 100 } })}
            />
          ))}
        </FieldGrid>
        {elevated && (
          <NumberField
            label="Altura ao chão"
            unit="cm"
            value={cm(item.elevation)}
            min={LIMITS.elevation.min * 100}
            max={LIMITS.elevation.max * 100}
            precision={0}
            step={5}
            disabled={locked}
            onCommit={(value) => update({ elevation: value / 100 })}
          />
        )}
        <Button icon={Truck} className="item-inspector__delivery" onClick={() => setDeliveryOpen(true)}>
          Passa pela porta?
        </Button>
        <p className="item-inspector__hint">
          {['width', 'depth', 'height'].every(fixed)
            ? 'Este modelo tem medidas fixas.'
            : 'Também pode redimensionar com as pegas na planta, dentro dos limites do modelo.'}
        </p>
      </PanelSection>

      {deliveryOpen && <DeliveryDialog open onClose={() => setDeliveryOpen(false)} item={item} />}

      <PanelSection title="Acabamento">
        {finishes.length > 0 && (
          <FinishPicker
            finishes={finishes}
            value={item.finish}
            disabled={locked}
            onChange={(finish) => update({ finish, color: FINISHES[finish].color })}
          />
        )}
        <ColorField
          label="Cor"
          value={item.color}
          swatches={finishes.map((key) => ({ value: FINISHES[key].color, label: FINISHES[key].label }))}
          onChange={(color) => !locked && update({ color })}
        />
      </PanelSection>

      <div className="item-inspector__actions">
        <Button icon={Copy} onClick={duplicateSelected} title="Duplicar (Ctrl+D)">
          Duplicar
        </Button>
        <Button
          icon={locked ? LockOpen : Lock}
          aria-pressed={locked}
          onClick={toggleLockSelected}
          title={locked ? 'Desbloquear (L)' : 'Bloquear (L)'}
        >
          {locked ? 'Desbloquear' : 'Bloquear'}
        </Button>
        <Button variant="danger" icon={Trash2} disabled={locked} disabledReason={LOCKED_REASON} tooltipAlign="end" onClick={deleteSelected}>
          Eliminar
        </Button>
      </div>
    </div>
  )
}
