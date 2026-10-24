import { Copy, EllipsisVertical, FileJson, FolderOpen, Pencil, TriangleAlert, Trash2 } from 'lucide-react'
import { useId } from 'react'
import { IconButton, Menu } from '@/components/ui'
import { ROOM_TYPES } from '@/core/model'
import { formatArea, formatLength } from '@/core/units/units.js'
import { StaticPlan } from '@/features/editor2d/StaticPlan.jsx'
import { formatRelativeTime } from '@/utils/time.js'
import './ProjectCard.css'

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

/** Cartão de um projeto guardado: miniatura da planta, medidas e ações. */
export function ProjectCard({ summary, onOpen, onRename, onDuplicate, onExport, onDelete }) {
  const metaId = useId()
  if (summary.broken) {
    return (
      <article className="project-card project-card--broken" aria-label="Projeto danificado">
        <div className="project-card__preview project-card__preview--broken">
          <TriangleAlert size={22} strokeWidth={1.5} aria-hidden="true" />
        </div>
        <div className="project-card__body">
          <h2 className="project-card__name">Projeto danificado</h2>
          <p className="project-card__meta">{summary.error}</p>
        </div>
        <div className="project-card__menu">
          <IconButton icon={Trash2} label="Eliminar projeto danificado" onClick={() => onDelete(summary)} />
        </div>
      </article>
    )
  }

  const room = summary.preview?.room
  const type = ROOM_TYPES[summary.roomType]?.label ?? 'Divisão'
  return (
    <article className="project-card">
      <div className="project-card__preview">
        {room && (
          <StaticPlan
            className="project-card__plan"
            room={room}
            items={summary.preview.items}
            width={320}
            height={190}
            padding={18}
          />
        )}
      </div>
      <div className="project-card__body">
        <h2 className="project-card__name">
          <button type="button" className="project-card__open" onClick={() => onOpen(summary)} aria-describedby={metaId}>
            {summary.name}
          </button>
        </h2>
        <div id={metaId} className="project-card__details">
          <p className="project-card__meta">
            {type}
            {room && ` · ${formatLength(room.width)} × ${formatLength(room.depth)}`}
          </p>
          <p className="project-card__meta">
            {room && `${formatArea(room.width * room.depth)} · `}
            {plural(summary.itemCount, 'móvel', 'móveis')}
            {summary.layoutCount > 1 && ` · ${plural(summary.layoutCount, 'disposição', 'disposições')}`}
          </p>
          <p className="project-card__meta project-card__meta--subtle">
            <time dateTime={summary.updatedAt}>Editado {formatRelativeTime(summary.updatedAt)}</time>
          </p>
        </div>
      </div>
      <div className="project-card__menu">
        <Menu
          label={`Ações de ${summary.name}`}
          trigger={(props) => <IconButton icon={EllipsisVertical} label={`Mais ações para ${summary.name}`} tooltipAlign="end" {...props} />}
          items={[
            { label: 'Abrir', icon: FolderOpen, onSelect: () => onOpen(summary) },
            { label: 'Mudar o nome', icon: Pencil, onSelect: () => onRename(summary) },
            { label: 'Duplicar', icon: Copy, onSelect: () => onDuplicate(summary) },
            { label: 'Exportar JSON', icon: FileJson, onSelect: () => onExport(summary) },
            'separator',
            { label: 'Eliminar', icon: Trash2, danger: true, onSelect: () => onDelete(summary) },
          ]}
        />
      </div>
    </article>
  )
}
