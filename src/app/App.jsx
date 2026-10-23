import { Box } from 'lucide-react'
import { useMemo } from 'react'
import {
  createProject,
  FURNITURE_CATEGORIES,
  ROOM_TYPES,
  roomArea,
  SCHEMA_VERSION,
  validateProject,
} from '@/core/model'
import { formatArea, formatLength } from '@/core/units/units.js'
import './App.css'

/**
 * Ecrã provisório da Fase 1: confirma que o modelo de dados funciona no
 * browser. É substituído pelo layout do editor na Fase 2.
 */
export default function App() {
  const project = useMemo(() => createProject({ name: 'Projeto de exemplo', roomType: 'living' }), [])
  const { valid } = validateProject(project)
  const { room } = project

  return (
    <main className="foundation">
      <header className="foundation__brand">
        <Box size={22} strokeWidth={1.75} aria-hidden="true" />
        <h1>SpaceShift</h1>
      </header>
      <p className="foundation__lead">Fundações da aplicação: modelo de dados, coordenadas e geometria.</p>

      <dl className="foundation__facts" aria-label="Projeto de exemplo">
        <div>
          <dt>Divisão</dt>
          <dd>{ROOM_TYPES[room.type].label}</dd>
        </div>
        <div>
          <dt>Dimensões</dt>
          <dd>
            {formatLength(room.width)} × {formatLength(room.depth)}
          </dd>
        </div>
        <div>
          <dt>Área</dt>
          <dd>{formatArea(roomArea(room))}</dd>
        </div>
        <div>
          <dt>Categorias de móveis</dt>
          <dd>{Object.keys(FURNITURE_CATEGORIES).length}</dd>
        </div>
        <div>
          <dt>Esquema de dados</dt>
          <dd>
            v{SCHEMA_VERSION} · {valid ? 'válido' : 'inválido'}
          </dd>
        </div>
      </dl>
    </main>
  )
}
