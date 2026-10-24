import { ArrowDown, ArrowUp, Check, DoorOpen, Footprints, Plus, Trash2, TriangleAlert, X } from 'lucide-react'
import { useMemo } from 'react'
import { Button, Dialog, FieldGrid, IconButton, NumberField, Select, Switch } from '@/components/ui'
import { checkDelivery, describeCarry, stepHasTurn } from '@/core/analysis'
import { deliverySteps, entryDoor, openingLabels, ROUTE_LIMITS, ROUTE_STEP_TYPES, WALL_LABELS } from '@/core/model'
import { formatCentimetres } from '@/core/units/units.js'
import { useProjectStore } from '@/store/projectStore.js'
import { StepDiagram } from './StepDiagram.jsx'
import './DeliveryDialog.css'

const cm = (m) => Math.round(m * 1000) / 10
const STEP_ICONS = { door: DoorOpen, corridor: Footprints, stairs: StairsIcon }

/**
 * «Passa pela porta?»: verifica se o móvel selecionado chega à divisão,
 * passo a passo (porta do prédio, escadas, corredor e a porta da divisão).
 * O caminho fica guardado na divisão e serve para todos os móveis.
 */
export function DeliveryDialog({ open, onClose, item }) {
  const room = useProjectStore((state) => state.project.room)
  const steps = useMemo(() => deliverySteps(room), [room])
  const result = useMemo(() => checkDelivery(item.dimensions, steps), [item.dimensions, steps])
  const { width, depth, height } = item.dimensions
  const addRouteStep = useProjectStore((state) => state.addRouteStep)
  const routeSteps = room.route?.steps ?? []
  const full = routeSteps.length >= ROUTE_LIMITS.steps

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Passa pela porta?"
      description={`${item.name} · ${cm(width)} × ${cm(depth)} × ${cm(height)} cm`}
      footer={
        <>
          <p className="delivery__method">
            Para cada passo, experimentam-se as seis maneiras de pegar no móvel e, nas portas, também inclinado. A folga é o que se podia
            acrescentar a todas as medidas e ainda passar.
          </p>
          <Button variant="primary" onClick={onClose}>
            Fechar
          </Button>
        </>
      }
    >
      <Verdict item={item} result={result} />

      <ol className="delivery__steps">
        {result.steps.map((r, index) =>
          r.step.openingId ? (
            <EntryStep key={r.step.id} index={index} result={r} room={room} tightest={index === result.tightest && result.steps.length > 1} />
          ) : (
            <RouteStep
              key={r.step.id}
              index={index}
              result={r}
              first={index === 0}
              last={index === routeSteps.length - 1}
              tightest={index === result.tightest && result.steps.length > 1}
            />
          ),
        )}
      </ol>
      {!entryDoor(room) && (
        <p className="delivery__note" role="note">
          A divisão ainda não tem portas. Acrescente uma em Divisão › Portas e janelas para a incluir no caminho.
        </p>
      )}

      <div className="delivery__add" role="group" aria-label="Acrescentar ao caminho">
        <span className="delivery__add-label">Acrescentar antes da divisão:</span>
        {Object.entries(ROUTE_STEP_TYPES).map(([type, preset]) => (
          <Button key={type} size="sm" icon={Plus} disabled={full} disabledReason={`Máximo de ${ROUTE_LIMITS.steps} passos`} onClick={() => addRouteStep(type)}>
            {preset.label}
          </Button>
        ))}
      </div>
    </Dialog>
  )
}

function Verdict({ item, result }) {
  if (result.steps.length === 0) {
    return (
      <p className="delivery__verdict" data-state="empty">
        Acrescente os passos do caminho até à divisão (porta do prédio, escada, corredor) para saber se o móvel passa.
      </p>
    )
  }
  const tight = result.steps[result.tightest]
  if (result.fits) {
    return (
      <p className="delivery__verdict" data-state="ok" role="status">
        <Check size={18} strokeWidth={2.25} aria-hidden="true" />
        <span>
          <strong>Passa.</strong> {item.name} chega à divisão. O sítio mais apertado é {tight.step.label.toLowerCase()}, com{' '}
          {formatCentimetres(tight.margin)} de folga.
        </span>
      </p>
    )
  }
  const blocked = result.steps.filter((r) => !r.fits)
  const first = blocked[0]
  const more = blocked.length > 1 ? ` (e em mais ${blocked.length - 1} ${blocked.length > 2 ? 'sítios' : 'sítio'})` : ''
  const hint =
    first.step.type === 'door'
      ? 'Tirar a porta das dobradiças, desmontar os pés ou escolher um modelo mais pequeno pode resolver.'
      : 'Desmontar o móvel ou escolher um modelo mais pequeno pode resolver.'
  return (
    <p className="delivery__verdict" data-state="fail" role="status">
      <X size={18} strokeWidth={2.25} aria-hidden="true" />
      <span>
        <strong>Não passa</strong> em {first.step.label.toLowerCase()}
        {more}: faltam {formatCentimetres(-first.margin)}. {hint}
      </span>
    </p>
  )
}

function Outcome({ result, tightest }) {
  return (
    <div className="delivery-step__outcome" data-fits={result.fits}>
      {result.fits ? <Check size={14} strokeWidth={2.25} aria-hidden="true" /> : <TriangleAlert size={14} strokeWidth={2} aria-hidden="true" />}
      <span>
        {!result.fits
          ? `Não passa: faltam ${formatCentimetres(-result.margin)}`
          : result.margin < 0.02
            ? `Passa à justa, ${describeCarry(result.how)}`
            : `Passa ${describeCarry(result.how)}, ${formatCentimetres(result.margin)} de folga`}
        {tightest && result.fits && ' · o mais apertado'}
      </span>
    </div>
  )
}

function RouteStep({ index, result, first, last, tightest }) {
  const { step } = result
  const updateRouteStep = useProjectStore((state) => state.updateRouteStep)
  const removeRouteStep = useProjectStore((state) => state.removeRouteStep)
  const moveRouteStep = useProjectStore((state) => state.moveRouteStep)
  const update = (patch) => updateRouteStep(step.id, patch)
  const Icon = STEP_ICONS[step.type]
  const turn = stepHasTurn(step)

  return (
    <li className="delivery-step" data-fits={result.fits}>
      <span className="delivery-step__index" aria-hidden="true">
        {index + 1}
      </span>
      <div className="delivery-step__main">
        <div className="delivery-step__head">
          <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
          <input
            key={step.label}
            className="delivery-step__name"
            defaultValue={step.label}
            aria-label={`Nome do passo ${index + 1}`}
            maxLength={ROUTE_LIMITS.label}
            onBlur={(event) => update({ label: event.target.value })}
            onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
          />
          <div className="delivery-step__tools">
            <IconButton icon={ArrowUp} size="sm" label="Mover para cima" disabled={first} onClick={() => moveRouteStep(step.id, -1)} />
            <IconButton icon={ArrowDown} size="sm" label="Mover para baixo" disabled={last} onClick={() => moveRouteStep(step.id, 1)} />
            <IconButton icon={Trash2} size="sm" label={`Retirar ${step.label}`} tooltipAlign="end" onClick={() => removeRouteStep(step.id)} />
          </div>
        </div>
        <FieldGrid columns={step.type === 'corridor' && turn ? 3 : 2}>
          <NumberField
            label={step.type === 'stairs' ? 'Largura livre' : turn ? 'Largura antes' : 'Largura livre'}
            unit="cm"
            precision={0}
            value={cm(step.width)}
            min={ROUTE_LIMITS.width.min * 100}
            max={ROUTE_LIMITS.width.max * 100}
            onCommit={(v) => update({ width: v / 100 })}
          />
          {step.type === 'corridor' && turn && (
            <NumberField
              label="Largura depois"
              unit="cm"
              precision={0}
              value={cm(step.widthAfter ?? step.width)}
              min={ROUTE_LIMITS.width.min * 100}
              max={ROUTE_LIMITS.width.max * 100}
              onCommit={(v) => update({ widthAfter: v / 100 })}
            />
          )}
          <NumberField
            label={step.type === 'stairs' ? 'Altura livre' : 'Altura'}
            unit="cm"
            precision={0}
            value={cm(step.height)}
            min={ROUTE_LIMITS.height.min * 100}
            max={ROUTE_LIMITS.height.max * 100}
            onCommit={(v) => update({ height: v / 100 })}
          />
        </FieldGrid>
        {step.type !== 'door' && (
          <Switch
            label={step.type === 'stairs' ? 'Patamar com curva a 90°' : 'Curva a 90°'}
            checked={Boolean(step.turn)}
            onChange={(checked) => update({ turn: checked })}
          />
        )}
        <Outcome result={result} tightest={tightest} />
      </div>
      <StepDiagram step={step} result={result} />
    </li>
  )
}

function EntryStep({ index, result, room, tightest }) {
  const setEntryDoor = useProjectStore((state) => state.setEntryDoor)
  const doors = (room.openings ?? []).filter((o) => o.type === 'door')
  const labels = openingLabels(room.openings ?? [])
  const door = entryDoor(room)
  return (
    <li className="delivery-step" data-fits={result.fits} data-entry>
      <span className="delivery-step__index" aria-hidden="true">
        {index + 1}
      </span>
      <div className="delivery-step__main">
        <div className="delivery-step__head">
          <DoorOpen size={16} strokeWidth={1.75} aria-hidden="true" />
          <span className="delivery-step__title">{result.step.label}</span>
        </div>
        {doors.length > 1 ? (
          <Select
            label="Porta de entrada"
            value={door.id}
            onChange={setEntryDoor}
            options={doors.map((d) => ({ value: d.id, label: `${labels.get(d.id)} · parede ${WALL_LABELS[d.wall]} · ${cm(d.width)} cm` }))}
          />
        ) : (
          <p className="delivery-step__meta">
            Parede {WALL_LABELS[door.wall]} · {cm(door.width)} × {cm(door.height)} cm. As medidas mudam-se na própria porta.
          </p>
        )}
        <Outcome result={result} tightest={tightest} />
      </div>
      <StepDiagram step={result.step} result={result} />
    </li>
  )
}

/** Ícone de escada (o lucide não tem um simples). */
function StairsIcon({ size = 16, strokeWidth = 1.75, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d="M3 20h5v-5h5v-5h5V5h3" />
    </svg>
  )
}
