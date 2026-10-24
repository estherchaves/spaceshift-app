import { AppWindow, DoorOpen } from 'lucide-react'
import { Button, ColorField, FieldGrid, NumberField, PanelSection, Select, Switch } from '@/components/ui'
import { ACCESSIBILITY_PROFILES, FLOOR_MATERIALS, LIMITS, openingLabels, ROOM_TYPES, WALL_LABELS } from '@/core/model'
import { formatCentimetres } from '@/core/units/units.js'
import { addOpening } from '@/store/commands.js'
import { useEditorStore } from '@/store/editorStore.js'
import { notify } from '@/store/toastStore.js'
import { selectRoom, selectSettings } from '@/store/selectors.js'
import { useProjectStore } from '@/store/projectStore.js'
import './RoomInspector.css'

const ROOM_TYPE_OPTIONS = Object.entries(ROOM_TYPES).map(([value, { label }]) => ({ value, label }))
const FLOOR_OPTIONS = Object.entries(FLOOR_MATERIALS).map(([value, { label }]) => ({ value, label }))
const GRID_OPTIONS = [0.05, 0.1, 0.25, 0.5].map((size) => ({ value: String(size), label: `${size * 100} cm` }))

const WALL_SWATCHES = [
  { value: '#f2f0eb', label: 'Branco quente' },
  { value: '#e4dfd5', label: 'Areia' },
  { value: '#cfd4cc', label: 'Sálvia' },
  { value: '#c9d3dc', label: 'Azul névoa' },
  { value: '#d9c3b4', label: 'Terracota suave' },
  { value: '#4a4d52', label: 'Grafite' },
]

const ACCESSIBILITY_OPTIONS = Object.entries(ACCESSIBILITY_PROFILES).map(([value, { label }]) => ({ value, label }))

const FLOOR_SWATCHES = Object.values(FLOOR_MATERIALS).map(({ label, color }) => ({ value: color, label }))

export function RoomInspector() {
  const room = useProjectStore(selectRoom)
  const settings = useProjectStore(selectSettings)
  const updateRoom = useProjectStore((state) => state.updateRoom)
  const updateSettings = useProjectStore((state) => state.updateSettings)

  return (
    <div className="room-inspector">
      <PanelSection title="Divisão">
        <Select
          label="Tipo de divisão"
          value={room.type}
          options={ROOM_TYPE_OPTIONS}
          onChange={(type) => updateRoom({ type })}
        />
        <FieldGrid>
          <NumberField
            label="Comprimento"
            unit="m"
            value={room.width}
            min={LIMITS.room.min}
            max={LIMITS.room.max}
            step={0.1}
            onCommit={(width) => updateRoom({ width })}
          />
          <NumberField
            label="Largura"
            unit="m"
            value={room.depth}
            min={LIMITS.room.min}
            max={LIMITS.room.max}
            step={0.1}
            onCommit={(depth) => updateRoom({ depth })}
          />
        </FieldGrid>
        <FieldGrid>
          <NumberField
            label="Altura do teto"
            unit="m"
            value={room.wallHeight}
            min={LIMITS.wallHeight.min}
            max={LIMITS.wallHeight.max}
            step={0.05}
            onCommit={(wallHeight) => updateRoom({ wallHeight })}
          />
          <NumberField
            label="Espessura da parede"
            unit="cm"
            value={Math.round(room.wallThickness * 100)}
            min={LIMITS.wallThickness.min * 100}
            max={LIMITS.wallThickness.max * 100}
            step={1}
            precision={0}
            onCommit={(cm) => updateRoom({ wallThickness: cm / 100 })}
          />
        </FieldGrid>
      </PanelSection>

      <OpeningsSection room={room} />

      <PanelSection title="Acabamentos">
        <ColorField
          label="Cor das paredes"
          description="Aplicada às paredes na vista 3D; na planta as paredes são desenhadas a cheio."
          value={room.wallColor}
          swatches={WALL_SWATCHES}
          onChange={(wallColor) => updateRoom({ wallColor })}
        />
        <Select
          label="Material do chão"
          value={room.floorMaterial}
          options={FLOOR_OPTIONS}
          onChange={(floorMaterial) => updateRoom({ floorMaterial })}
        />
        <ColorField
          label="Cor do chão"
          value={room.floorColor}
          swatches={FLOOR_SWATCHES}
          onChange={(floorColor) => updateRoom({ floorColor })}
        />
      </PanelSection>

      <PanelSection title="Editor">
        <Select
          label="Grelha"
          value={String(settings.gridSize)}
          options={
            GRID_OPTIONS.some((o) => o.value === String(settings.gridSize))
              ? GRID_OPTIONS
              : [...GRID_OPTIONS, { value: String(settings.gridSize), label: `${settings.gridSize * 100} cm` }]
          }
          onChange={(value) => updateSettings({ gridSize: Number(value) })}
        />
        <Switch
          label="Ajustar à grelha"
          description="Os móveis encaixam na grelha ao mover."
          checked={settings.snapToGrid}
          onChange={(snapToGrid) => updateSettings({ snapToGrid })}
        />
        <NumberField
          label="Passagem mínima sugerida"
          unit="m"
          value={settings.circulationMin}
          min={LIMITS.circulationMin.min}
          max={LIMITS.circulationMin.max}
          step={0.05}
          onCommit={(circulationMin) => updateSettings({ circulationMin })}
        />
        <p className="room-inspector__note">
          Usada para avisos de circulação. É uma orientação de conforto, não uma garantia de conformidade legal.
        </p>
        <Select
          label="Acessibilidade"
          value={settings.accessibility}
          options={ACCESSIBILITY_OPTIONS}
          onChange={(accessibility) => updateSettings({ accessibility })}
        />
        {ACCESSIBILITY_PROFILES[settings.accessibility]?.description && (
          <p className="room-inspector__note">{ACCESSIBILITY_PROFILES[settings.accessibility].description}</p>
        )}
      </PanelSection>
    </div>
  )
}

function OpeningsSection({ room }) {
  const openings = room.openings ?? []
  const labels = openingLabels(openings)
  const selectOpening = useEditorStore((state) => state.selectOpening)
  const add = (type) => {
    if (openings.length >= LIMITS.openingsPerRoom || !addOpening(type)) {
      notify('Não há espaço livre nas paredes para mais uma abertura.', { tone: 'error' })
    }
  }
  return (
    <PanelSection title="Portas e janelas">
      {openings.length > 0 ? (
        <ul className="room-inspector__openings">
          {openings.map((opening) => {
            const Icon = opening.type === 'door' ? DoorOpen : AppWindow
            return (
              <li key={opening.id}>
                <button type="button" className="room-inspector__opening" onClick={() => selectOpening(opening.id)}>
                  <Icon size={15} strokeWidth={1.75} aria-hidden="true" />
                  <span className="room-inspector__opening-name">{labels.get(opening.id)}</span>
                  <span className="room-inspector__opening-meta">
                    {formatCentimetres(opening.width)} · parede {WALL_LABELS[opening.wall]}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="room-inspector__note">Acrescente a porta de entrada para a análise saber por onde se entra.</p>
      )}
      <FieldGrid>
        <Button icon={DoorOpen} onClick={() => add('door')}>
          Porta
        </Button>
        <Button icon={AppWindow} onClick={() => add('window')}>
          Janela
        </Button>
      </FieldGrid>
    </PanelSection>
  )
}
