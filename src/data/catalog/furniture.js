/**
 * Catálogo inicial do SpaceShift. Medidas em metros:
 *   width = comprimento (eixo X local), depth = largura (Z), height = altura (Y).
 * `resizable` define os limites quando o utilizador pode ajustar as medidas;
 * `null` significa medidas fixas (ex.: camas com colchões normalizados).
 * `plan2d` e `model3d` são chaves dos desenhos 2D e dos modelos 3D
 * procedimentais (Fases 3–5). Preços indicativos em euros.
 * `footprint` é a forma real da pegada para colisões (Fase 6; 'rect' por
 * omissão) e `role` o papel do móvel nas regras de uso conjunto (cadeira e
 * mesa, sofá e mesa de centro, cama e mesa de cabeceira); `usage` o espaço
 * livre que o móvel precisa para ser usado (abrir portas, entrar na cama…).
 *
 * @type {import('@/core/model/types.js').CatalogEntry[]}
 */
export const FURNITURE_CATALOG = [
  // Sofás
  {
    id: 'sofa-2',
    name: 'Sofá de 2 lugares',
    category: 'sofas',
    dimensions: { width: 1.6, depth: 0.88, height: 0.82 },
    resizable: { min: { width: 1.4, depth: 0.8, height: 0.75 }, max: { width: 1.9, depth: 1, height: 0.9 } },
    color: '#cfc7b8',
    finishes: ['linen', 'velvet', 'boucle'],
    price: 649,
    plan2d: 'sofa',
    model3d: 'sofa',
    usage: 'seat',
    role: 'seat',
  },
  {
    id: 'sofa-3',
    name: 'Sofá de 3 lugares',
    category: 'sofas',
    dimensions: { width: 2.2, depth: 0.92, height: 0.84 },
    resizable: { min: { width: 1.9, depth: 0.85, height: 0.75 }, max: { width: 2.8, depth: 1.05, height: 0.9 } },
    color: '#9b948a',
    finishes: ['wool', 'linen', 'velvet'],
    price: 899,
    plan2d: 'sofa',
    model3d: 'sofa',
    usage: 'seat',
    role: 'seat',
  },
  {
    id: 'sofa-corner',
    name: 'Sofá de canto',
    category: 'sofas',
    dimensions: { width: 2.7, depth: 1.65, height: 0.84 },
    resizable: { min: { width: 2.3, depth: 1.5, height: 0.75 }, max: { width: 3.2, depth: 2, height: 0.9 } },
    color: '#ece6da',
    finishes: ['boucle', 'linen'],
    price: 1490,
    plan2d: 'sofa-corner',
    model3d: 'sofa-corner',
    usage: 'seat',
    footprint: 'corner',
    role: 'seat',
  },

  // Camas
  {
    id: 'bed-single',
    name: 'Cama de solteiro',
    category: 'beds',
    dimensions: { width: 0.96, depth: 2.06, height: 0.9 },
    resizable: null,
    color: '#c49a6c',
    finishes: ['oak', 'white-lacquer'],
    price: 299,
    plan2d: 'bed',
    model3d: 'bed',
    usage: 'bed',
    role: 'bed',
  },
  {
    id: 'bed-double',
    name: 'Cama de casal',
    category: 'beds',
    dimensions: { width: 1.66, depth: 2.1, height: 1 },
    resizable: null,
    color: '#cfc7b8',
    finishes: ['linen', 'oak', 'walnut'],
    price: 749,
    plan2d: 'bed',
    model3d: 'bed',
    usage: 'bed',
    role: 'bed',
  },
  {
    id: 'bed-king',
    name: 'Cama king size',
    category: 'beds',
    dimensions: { width: 1.86, depth: 2.12, height: 1.05 },
    resizable: null,
    color: '#55655a',
    finishes: ['velvet', 'linen'],
    price: 1190,
    plan2d: 'bed',
    model3d: 'bed',
    usage: 'bed',
    role: 'bed',
  },

  // Mesas
  {
    id: 'dining-table',
    name: 'Mesa de jantar',
    category: 'tables',
    dimensions: { width: 1.8, depth: 0.9, height: 0.75 },
    resizable: { min: { width: 1.2, depth: 0.8, height: 0.72 }, max: { width: 2.6, depth: 1.1, height: 0.78 } },
    color: '#c49a6c',
    finishes: ['oak', 'walnut', 'marble'],
    price: 690,
    plan2d: 'table',
    model3d: 'table',
    role: 'table',
  },
  {
    id: 'round-table',
    name: 'Mesa redonda',
    category: 'tables',
    dimensions: { width: 1.1, depth: 1.1, height: 0.75 },
    resizable: { min: { width: 0.8, depth: 0.8, height: 0.72 }, max: { width: 1.4, depth: 1.4, height: 0.78 } },
    color: '#e7e4df',
    finishes: ['marble', 'oak'],
    price: 540,
    plan2d: 'table-round',
    model3d: 'table-round',
    footprint: 'ellipse',
    role: 'table',
  },
  {
    id: 'coffee-table',
    name: 'Mesa de centro',
    category: 'tables',
    dimensions: { width: 1.1, depth: 0.6, height: 0.4 },
    resizable: { min: { width: 0.8, depth: 0.5, height: 0.3 }, max: { width: 1.4, depth: 0.8, height: 0.45 } },
    color: '#6f4e37',
    finishes: ['walnut', 'oak', 'glass'],
    price: 249,
    plan2d: 'table',
    model3d: 'coffee-table',
    role: 'coffee-table',
  },
  {
    id: 'desk',
    name: 'Secretária',
    category: 'tables',
    dimensions: { width: 1.4, depth: 0.7, height: 0.75 },
    resizable: { min: { width: 1, depth: 0.6, height: 0.7 }, max: { width: 1.8, depth: 0.8, height: 0.78 } },
    color: '#f1efea',
    finishes: ['white-lacquer', 'oak'],
    price: 329,
    plan2d: 'desk',
    model3d: 'desk',
    usage: 'desk',
    role: 'table',
  },
  {
    id: 'nightstand',
    name: 'Mesa de cabeceira',
    category: 'tables',
    dimensions: { width: 0.45, depth: 0.4, height: 0.5 },
    resizable: null,
    color: '#c49a6c',
    finishes: ['oak', 'walnut', 'white-lacquer'],
    price: 119,
    plan2d: 'cabinet',
    model3d: 'nightstand',
    role: 'nightstand',
  },

  // Cadeiras
  {
    id: 'dining-chair',
    name: 'Cadeira de jantar',
    category: 'chairs',
    dimensions: { width: 0.46, depth: 0.52, height: 0.82 },
    resizable: null,
    color: '#c49a6c',
    finishes: ['oak', 'walnut', 'black-metal'],
    price: 89,
    plan2d: 'chair',
    model3d: 'chair',
    role: 'chair',
  },
  {
    id: 'armchair',
    name: 'Poltrona',
    category: 'chairs',
    dimensions: { width: 0.82, depth: 0.84, height: 0.8 },
    resizable: null,
    color: '#8a5a3c',
    finishes: ['leather', 'boucle', 'velvet'],
    price: 459,
    plan2d: 'armchair',
    model3d: 'armchair',
    usage: 'seat',
    role: 'seat',
  },
  {
    id: 'office-chair',
    name: 'Cadeira de escritório',
    category: 'chairs',
    dimensions: { width: 0.64, depth: 0.64, height: 1.05 },
    resizable: null,
    color: '#2a2a2a',
    finishes: ['black-metal'],
    price: 219,
    plan2d: 'office-chair',
    model3d: 'office-chair',
    role: 'chair',
  },

  // Armários
  {
    id: 'wardrobe',
    name: 'Roupeiro',
    category: 'storage',
    dimensions: { width: 1.5, depth: 0.6, height: 2.2 },
    resizable: { min: { width: 0.8, depth: 0.55, height: 1.8 }, max: { width: 3, depth: 0.65, height: 2.5 } },
    color: '#f1efea',
    finishes: ['white-lacquer', 'oak', 'walnut'],
    price: 590,
    plan2d: 'wardrobe',
    model3d: 'wardrobe',
    usage: 'wardrobe',
  },
  {
    id: 'bookshelf',
    name: 'Estante',
    category: 'storage',
    dimensions: { width: 0.9, depth: 0.35, height: 1.9 },
    resizable: { min: { width: 0.6, depth: 0.3, height: 1 }, max: { width: 2.4, depth: 0.45, height: 2.4 } },
    color: '#c49a6c',
    finishes: ['oak', 'walnut', 'black-metal'],
    price: 199,
    plan2d: 'shelf',
    model3d: 'bookshelf',
  },
  {
    id: 'tv-unit',
    name: 'Móvel de TV',
    category: 'storage',
    dimensions: { width: 1.8, depth: 0.42, height: 0.5 },
    resizable: { min: { width: 1.2, depth: 0.35, height: 0.4 }, max: { width: 2.4, depth: 0.5, height: 0.6 } },
    color: '#6f4e37',
    finishes: ['walnut', 'oak', 'white-lacquer'],
    price: 349,
    plan2d: 'cabinet',
    model3d: 'sideboard',
  },
  {
    id: 'dresser',
    name: 'Cómoda',
    category: 'storage',
    dimensions: { width: 1.2, depth: 0.5, height: 0.82 },
    resizable: { min: { width: 0.8, depth: 0.45, height: 0.7 }, max: { width: 1.6, depth: 0.55, height: 1 } },
    color: '#f1efea',
    finishes: ['white-lacquer', 'oak'],
    price: 279,
    plan2d: 'cabinet',
    model3d: 'sideboard',
    usage: 'drawers',
  },

  // Iluminação
  {
    id: 'floor-lamp',
    name: 'Candeeiro de pé',
    category: 'lighting',
    dimensions: { width: 0.4, depth: 0.4, height: 1.6 },
    resizable: null,
    color: '#b5915a',
    finishes: ['brass', 'black-metal'],
    price: 129,
    plan2d: 'lamp',
    model3d: 'floor-lamp',
  },
  {
    id: 'pendant-lamp',
    name: 'Candeeiro suspenso',
    category: 'lighting',
    dimensions: { width: 0.5, depth: 0.5, height: 0.35 },
    resizable: null,
    color: '#2a2a2a',
    finishes: ['black-metal', 'brass', 'ceramic'],
    price: 149,
    plan2d: 'pendant',
    model3d: 'pendant-lamp',
    elevation: 1.95,
  },

  // Decoração
  {
    id: 'rug',
    name: 'Tapete',
    category: 'decor',
    dimensions: { width: 2, depth: 1.4, height: 0.01 },
    resizable: { min: { width: 0.6, depth: 0.6, height: 0.01 }, max: { width: 4, depth: 3, height: 0.03 } },
    color: '#d9d2c5',
    finishes: ['wool'],
    price: 179,
    plan2d: 'rug',
    model3d: 'rug',
  },
  {
    id: 'plant',
    name: 'Planta grande',
    category: 'decor',
    dimensions: { width: 0.5, depth: 0.5, height: 1.3 },
    resizable: null,
    color: '#55655a',
    finishes: ['ceramic'],
    price: 59,
    plan2d: 'plant',
    model3d: 'plant',
  },
]

export function getCatalogEntry(id) {
  return FURNITURE_CATALOG.find((entry) => entry.id === id) ?? null
}

/**
 * Limites de medidas de um móvel. Móveis de medidas fixas têm min = max.
 * Se o móvel já não existir no catálogo, usa os limites gerais.
 */
export function getSizeBounds(catalogId, fallback) {
  const entry = getCatalogEntry(catalogId)
  if (!entry) return fallback
  return entry.resizable ?? { min: entry.dimensions, max: entry.dimensions }
}

/**
 * Limites de um móvel concreto: os do modelo, salvo se as medidas vieram
 * de uma loja (`customSize`), que podem ser quaisquer (dentro de `fallback`).
 */
export function getItemSizeBounds(item, fallback) {
  return item.customSize ? fallback : getSizeBounds(item.catalogId, fallback)
}

/**
 * Modelo do catálogo com as medidas mais parecidas (razões em escala
 * logarítmica, para 10 cm pesarem mais num banco do que num roupeiro).
 */
export function closestCatalogEntry(dimensions) {
  const keys = ['width', 'depth', 'height'].filter((k) => dimensions[k] > 0)
  let best = null
  let bestScore = Infinity
  for (const entry of FURNITURE_CATALOG) {
    const score = keys.reduce((sum, k) => sum + Math.abs(Math.log(dimensions[k] / entry.dimensions[k])), 0)
    if (score < bestScore) {
      best = entry
      bestScore = score
    }
  }
  return best
}

const DEFAULT_PROFILE = { shape: 'rect', role: null, usage: null }
const PROFILES = new Map(
  FURNITURE_CATALOG.map((entry) => [entry.id, { shape: entry.footprint ?? 'rect', role: entry.role ?? null, usage: entry.usage ?? null }]),
)

/** Perfil de um móvel para a análise: forma da pegada e papel nas regras de uso. */
export function getItemProfile(item) {
  return PROFILES.get(item.catalogId) ?? DEFAULT_PROFILE
}

/** Preço indicativo do móvel (do catálogo) ou null se não tiver. */
export function getItemPrice(item) {
  const price = getCatalogEntry(item.catalogId)?.price
  return Number.isFinite(price) ? price : null
}
