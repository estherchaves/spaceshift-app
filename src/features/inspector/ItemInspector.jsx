import { Copy, RotateCcw, RotateCw, Trash2 } from 'lucide-react'
import { Button, FieldGrid, IconButton, NumberField, PanelSection } from '@/components/ui'
import { DEFAULT_SIZE_BOUNDS, FURNITURE_CATEGORIES } from '@/core/model'
import { getSizeBounds } from '@/data/catalog/furniture.js'
import { deleteSelected, duplicateSelected, rotateSelected } from '@/store/commands.js'
import { useProjectStore } from '@/store/projectStore.js'
import './ItemInspector.css'

const cm = (m) => Math.round(m * 1000) / 10

/**
 * Propriedades do móvel selecionado com valores exatos. Mostra o estado
 * em tempo real (também durante um arrasto na planta). Cor, acabamento e
 * bloqueio chegam na Fase 4.
 */
export function ItemInspector({ item }) {
  const updateItem = useProjectStore((state) => state.updateItem)
  const bounds = getSizeBounds(item.catalogId, DEFAULT_SIZE_BOUNDS)
  const fixed = (key) => bounds.min[key] === bounds.max[key]
  const update = (patch) => updateItem(item.id, patch)
  const disabled = item.locked

  return (
    <div className="item-inspector">
      <div className="item-inspector__header">
        <span className="item-inspector__swatch" style={{ background: item.color }} aria-hidden="true" />
        <div>
          <p className="item-inspector__name">{item.name}</p>
          <p className="item-inspector__category">{FURNITURE_CATEGORIES[item.category].label}</p>
        </div>
      </div>

      <PanelSection title="Posição">
        <FieldGrid>
          <NumberField label="X" unit="m" value={item.position.x} step={0.01} disabled={disabled} onCommit={(x) => update({ position: { x } })} />
          <NumberField label="Z" unit="m" value={item.position.z} step={0.01} disabled={disabled} onCommit={(z) => update({ position: { z } })} />
        </FieldGrid>
        <div className="item-inspector__rotation">
          <NumberField
            label="Rotação"
            unit="°"
            value={item.rotation}
            precision={1}
            step={1}
            disabled={disabled}
            onCommit={(rotation) => update({ rotation })}
          />
          <IconButton icon={RotateCcw} label="Rodar para a esquerda" shortcut="Shift+R" disabled={disabled} onClick={() => rotateSelected(-1)} />
          <IconButton icon={RotateCw} label="Rodar para a direita" shortcut="R" disabled={disabled} onClick={() => rotateSelected(1)} />
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
              disabled={disabled || fixed(key)}
              onCommit={(value) => update({ dimensions: { [key]: value / 100 } })}
            />
          ))}
        </FieldGrid>
        <p className="item-inspector__hint">
          {['width', 'depth', 'height'].every(fixed)
            ? 'Este modelo tem medidas fixas.'
            : 'Também pode redimensionar com as pegas na planta, dentro dos limites do modelo.'}
        </p>
      </PanelSection>

      <div className="item-inspector__actions">
        <Button icon={Copy} onClick={duplicateSelected}>
          Duplicar
        </Button>
        <Button variant="danger" icon={Trash2} disabled={disabled} onClick={deleteSelected}>
          Eliminar
        </Button>
      </div>
    </div>
  )
}
