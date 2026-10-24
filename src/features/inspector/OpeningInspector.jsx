import { AppWindow, DoorOpen, Trash2 } from 'lucide-react'
import { Button, FieldGrid, NumberField, PanelSection, SegmentedControl, Select } from '@/components/ui'
import { OPENING_LIMITS, openingLabels, WALL_LABELS, WALL_SIDES, wallFrame } from '@/core/model'
import { IssueList } from '@/features/analysis/IssueList.jsx'
import { deleteSelected } from '@/store/commands.js'
import { useProjectStore } from '@/store/projectStore.js'
import { useLayoutAnalysis } from '@/store/selectors.js'
import './ItemInspector.css'

const cm = (m) => Math.round(m * 1000) / 10
const WALL_OPTIONS = WALL_SIDES.map((value) => ({ value, label: `Parede ${WALL_LABELS[value]}` }))

/** Nomes do lado da dobradiça tal como se vê na planta. */
function hingeOptions(wall) {
  const horizontal = wall === 'top' || wall === 'bottom'
  return [
    { value: 'start', label: horizontal ? 'Esquerda' : 'Em cima' },
    { value: 'end', label: horizontal ? 'Direita' : 'Em baixo' },
  ]
}

/**
 * Propriedades da porta ou janela selecionada. A posição é a distância do
 * canto (início da parede) à aresta da abertura, como se mede numa obra.
 */
export function OpeningInspector({ opening }) {
  const room = useProjectStore((state) => state.project.room)
  const updateOpening = useProjectStore((state) => state.updateOpening)
  const update = (patch) => updateOpening(opening.id, patch)
  const isDoor = opening.type === 'door'
  const label = openingLabels(room.openings ?? []).get(opening.id) ?? (isDoor ? 'Porta' : 'Janela')
  const length = wallFrame(room, opening.wall).length
  const edge = opening.offset - opening.width / 2
  const analysis = useLayoutAnalysis()
  const issues = analysis.issues.filter((issue) => issue.openingIds?.includes(opening.id))
  const Icon = isDoor ? DoorOpen : AppWindow

  return (
    <div className="item-inspector">
      <div className="item-inspector__header">
        <span className="item-inspector__icon" aria-hidden="true">
          <Icon size={16} strokeWidth={1.75} />
        </span>
        <div className="item-inspector__title">
          <p className="item-inspector__name">{label}</p>
          <p className="item-inspector__category">Parede {WALL_LABELS[opening.wall]}</p>
        </div>
      </div>

      {issues.length > 0 && (
        <PanelSection title="Problemas">
          <IssueList issues={issues} compact />
        </PanelSection>
      )}

      <PanelSection title="Posição">
        <Select label="Parede" value={opening.wall} options={WALL_OPTIONS} onChange={(wall) => update({ wall })} />
        <NumberField
          label={opening.wall === 'top' || opening.wall === 'bottom' ? 'Distância ao canto esquerdo' : 'Distância ao canto de cima'}
          unit="cm"
          value={cm(edge)}
          min={0}
          max={cm(length - opening.width)}
          precision={0}
          step={5}
          onCommit={(value) => update({ offset: value / 100 + opening.width / 2 })}
        />
        <p className="item-inspector__hint">Também pode arrastar a abertura na planta, ao longo das paredes.</p>
      </PanelSection>

      <PanelSection title="Medidas">
        <FieldGrid columns={isDoor ? 2 : 3}>
          <NumberField
            label="Largura"
            unit="cm"
            value={cm(opening.width)}
            min={OPENING_LIMITS.width.min * 100}
            max={cm(length)}
            precision={0}
            step={5}
            onCommit={(value) => update({ width: value / 100 })}
          />
          <NumberField
            label="Altura"
            unit="cm"
            value={cm(opening.height)}
            min={OPENING_LIMITS.height.min * 100}
            max={cm(room.wallHeight - opening.sill)}
            precision={0}
            step={5}
            onCommit={(value) => update({ height: value / 100 })}
          />
          {!isDoor && (
            <NumberField
              label="Peitoril"
              unit="cm"
              value={cm(opening.sill)}
              min={0}
              max={cm(room.wallHeight - OPENING_LIMITS.height.min)}
              precision={0}
              step={5}
              onCommit={(value) => update({ sill: value / 100 })}
            />
          )}
        </FieldGrid>
        <p className="item-inspector__hint">
          {isDoor
            ? 'Largura livre do vão: é a medida que conta para saber se um móvel passa.'
            : 'O peitoril é a altura do chão até à janela. Móveis mais altos à frente dela são assinalados.'}
        </p>
      </PanelSection>

      {isDoor && (
        <PanelSection title="Abertura">
          <SegmentedControl
            label="Abre para"
            size="full"
            value={opening.swing}
            onChange={(swing) => update({ swing })}
            options={[
              { value: 'in', label: 'Para dentro' },
              { value: 'out', label: 'Para fora' },
            ]}
          />
          <SegmentedControl label="Lado da dobradiça" size="full" value={opening.hinge} onChange={(hinge) => update({ hinge })} options={hingeOptions(opening.wall)} />
          <p className="item-inspector__hint">A área que a folha varre ao abrir para dentro tem de ficar livre de móveis.</p>
        </PanelSection>
      )}

      <div className="item-inspector__actions">
        <Button variant="danger" icon={Trash2} onClick={deleteSelected}>
          Eliminar {isDoor ? 'porta' : 'janela'}
        </Button>
      </div>
    </div>
  )
}
