/**
 * Contratos do modelo de dados (JSDoc). Não há código executável aqui:
 * estes tipos dão autocompletar no editor sem introduzir TypeScript.
 *
 * Convenções:
 *  - Medidas em metros; ângulos em graus (sentido horário visto de cima).
 *  - `width` = comprimento no eixo X local, `depth` = largura no eixo Z local,
 *    `height` = altura (Y). Na interface: Comprimento / Largura / Altura.
 *  - Datas em ISO 8601 (string), para serem serializáveis em JSON.
 *
 * @typedef {{x: number, z: number}} PlanPoint
 * @typedef {{width: number, depth: number, height: number}} Dimensions
 *
 * @typedef {Object} Room
 * @property {string} type          chave de ROOM_TYPES
 * @property {number} width         interior, eixo X (m)
 * @property {number} depth         interior, eixo Z (m)
 * @property {number} wallHeight    (m)
 * @property {number} wallThickness (m), desenhada por fora do interior
 * @property {string} wallColor     hex #rrggbb
 * @property {string} floorMaterial chave de FLOOR_MATERIALS
 * @property {string} floorColor    hex #rrggbb
 *
 * @typedef {Object} FurnitureItem   instância colocada numa disposição
 * @property {string} id
 * @property {string} catalogId      referência ao catálogo
 * @property {string} name
 * @property {string} category       chave de FURNITURE_CATEGORIES
 * @property {PlanPoint} position    centro do móvel (m)
 * @property {number} rotation       graus [0, 360)
 * @property {number} elevation      distância ao chão (m), ex.: candeeiro de parede
 * @property {Dimensions} dimensions
 * @property {string} color          hex #rrggbb
 * @property {string|null} finish    chave de acabamento, se o modelo suportar
 * @property {boolean} locked        bloqueado contra edição
 *
 * @typedef {Object} Layout          uma disposição alternativa da mesma divisão
 * @property {string} id
 * @property {string} name
 * @property {FurnitureItem[]} items
 * @property {string} createdAt
 *
 * @typedef {Object} ProjectSettings
 * @property {number} gridSize        passo da grelha (m)
 * @property {boolean} snapToGrid
 * @property {number} rotationStep    passo de rotação (graus)
 * @property {number} circulationMin  largura mínima de passagem sugerida (m)
 *
 * @typedef {Object} Project
 * @property {number} schemaVersion
 * @property {string} id
 * @property {string} name
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {Room} room
 * @property {Layout[]} layouts
 * @property {string} activeLayoutId
 * @property {ProjectSettings} settings
 *
 * @typedef {Object} CatalogEntry    definição de um móvel no catálogo
 * @property {string} id
 * @property {string} name
 * @property {string} category
 * @property {Dimensions} dimensions  medidas por omissão
 * @property {{min: Dimensions, max: Dimensions}|null} resizable  null = medidas fixas
 * @property {string} color
 * @property {string[]} finishes
 * @property {number|null} price      preço indicativo (EUR)
 * @property {string} plan2d          chave do desenho 2D (símbolo de planta)
 * @property {string} model3d         chave do modelo 3D procedimental
 * @property {number} [elevation]
 * @property {'rect'|'ellipse'|'corner'} [footprint]  forma real da pegada (colisões)
 * @property {'seat'|'coffee-table'|'chair'|'table'|'bed'|'nightstand'} [role]  papel nas regras de uso conjunto (análise)
 * @property {'seat'|'bed'|'wardrobe'|'drawers'|'desk'} [usage]  espaço livre necessário para usar o móvel
 */

export {}
