/** Versão atual do esquema de projeto. Incrementar ⇒ adicionar migração. */
export const SCHEMA_VERSION = 2

export const PROJECT_FILE_FORMAT = 'spaceshift.project'

export const ROOM_TYPES = {
  living: { label: 'Sala de estar', width: 5, depth: 4 },
  bedroom: { label: 'Quarto', width: 4, depth: 3.5 },
  kitchen: { label: 'Cozinha', width: 3.5, depth: 3 },
  dining: { label: 'Sala de jantar', width: 4, depth: 3.5 },
  office: { label: 'Escritório', width: 3, depth: 3 },
  kids: { label: 'Quarto de criança', width: 3.2, depth: 3 },
  bathroom: { label: 'Casa de banho', width: 2.5, depth: 2 },
  other: { label: 'Outra divisão', width: 4, depth: 4 },
}

export const FURNITURE_CATEGORIES = {
  sofas: { label: 'Sofás' },
  beds: { label: 'Camas' },
  tables: { label: 'Mesas' },
  chairs: { label: 'Cadeiras' },
  storage: { label: 'Armários' },
  kitchen: { label: 'Cozinha' },
  media: { label: 'TV' },
  lighting: { label: 'Iluminação' },
  decor: { label: 'Decoração' },
}

export const FLOOR_MATERIALS = {
  oak: { label: 'Carvalho', color: '#c9a77c' },
  walnut: { label: 'Nogueira', color: '#7a5a43' },
  concrete: { label: 'Microcimento', color: '#b9b6b0' },
  tile: { label: 'Mosaico', color: '#e6e2da' },
  carpet: { label: 'Alcatifa', color: '#a59e94' },
}

/** Limites de validação (m). Evitam valores absurdos ou divisões por zero. */
export const LIMITS = {
  room: { min: 1, max: 30 },
  wallHeight: { min: 2, max: 6 },
  wallThickness: { min: 0.05, max: 0.6 },
  item: { min: 0.05, max: 10 },
  // Tapetes e outros revestimentos têm 1 cm de altura.
  itemHeight: { min: 0.01, max: 10 },
  elevation: { min: 0, max: 5 },
  gridSize: { min: 0.01, max: 1 },
  circulationMin: { min: 0.3, max: 2 },
  projectName: { maxLength: 80 },
  layoutsPerProject: 12,
  openingsPerRoom: 12,
}

export const DEFAULT_ROOM = {
  type: 'living',
  width: ROOM_TYPES.living.width,
  depth: ROOM_TYPES.living.depth,
  wallHeight: 2.7,
  wallThickness: 0.15,
  wallColor: '#f2f0eb',
  floorMaterial: 'oak',
  floorColor: FLOOR_MATERIALS.oak.color,
  openings: [],
  route: { steps: [], entryDoorId: null },
}

export const DEFAULT_SETTINGS = {
  gridSize: 0.1,
  snapToGrid: true,
  rotationStep: 15,
  // Orientação habitual para passagens em habitação (~0,9 m). É configurável
  // e apresentada como sugestão, não como requisito legal.
  circulationMin: 0.9,
  // Perfil de acessibilidade: 'none' | 'wheelchair' | 'pram' (Fase 9).
  accessibility: 'none',
}
