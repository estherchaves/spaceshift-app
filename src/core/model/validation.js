import {
  FLOOR_MATERIALS,
  FURNITURE_CATEGORIES,
  LIMITS,
  ROOM_TYPES,
  SCHEMA_VERSION,
} from './constants.js'
import { ACCESSIBILITY_PROFILES } from './accessibility.js'
import { ROUTE_LIMITS, ROUTE_STEP_TYPES } from './route.js'
import { OPENING_LIMITS, OPENING_TYPES, WALL_SIDES, wallFrame } from './openings.js'

/**
 * Validação estrutural de um projeto. Não lança exceções: devolve a lista
 * de problemas para a interface poder explicar o que está errado sem
 * bloquear a aplicação.
 *
 * @returns {{valid: boolean, errors: {path: string, message: string}[]}}
 */
export function validateProject(project) {
  const errors = []
  const fail = (path, message) => errors.push({ path, message })

  if (!isObject(project)) {
    fail('', 'O ficheiro não contém um projeto válido.')
    return { valid: false, errors }
  }

  if (project.schemaVersion !== SCHEMA_VERSION) {
    fail('schemaVersion', `Versão de esquema não suportada: ${String(project.schemaVersion)}.`)
  }
  if (!isNonEmptyString(project.id)) fail('id', 'Falta o identificador do projeto.')
  if (!isNonEmptyString(project.name)) fail('name', 'O projeto tem de ter um nome.')
  else if (project.name.length > LIMITS.projectName.maxLength)
    fail('name', `O nome não pode ter mais de ${LIMITS.projectName.maxLength} caracteres.`)
  if (!isIsoDate(project.createdAt)) fail('createdAt', 'Data de criação inválida.')
  if (!isIsoDate(project.updatedAt)) fail('updatedAt', 'Data de atualização inválida.')

  validateRoom(project.room, fail)
  validateSettings(project.settings, fail)

  if (!Array.isArray(project.layouts) || project.layouts.length === 0) {
    fail('layouts', 'O projeto tem de ter pelo menos uma disposição.')
  } else {
    if (project.layouts.length > LIMITS.layoutsPerProject)
      fail('layouts', `Máximo de ${LIMITS.layoutsPerProject} disposições por projeto.`)
    const layoutIds = new Set()
    project.layouts.forEach((layout, i) => {
      validateLayout(layout, `layouts[${i}]`, fail)
      if (isObject(layout)) {
        if (layoutIds.has(layout.id)) fail(`layouts[${i}].id`, 'Identificador de disposição repetido.')
        layoutIds.add(layout.id)
      }
    })
    if (!layoutIds.has(project.activeLayoutId))
      fail('activeLayoutId', 'A disposição ativa não existe no projeto.')
  }

  return { valid: errors.length === 0, errors }
}

function validateRoom(room, fail) {
  if (!isObject(room)) return fail('room', 'Faltam os dados da divisão.')
  if (!(room.type in ROOM_TYPES)) fail('room.type', 'Tipo de divisão desconhecido.')
  checkRange(room.width, LIMITS.room, 'room.width', 'Comprimento da divisão', fail)
  checkRange(room.depth, LIMITS.room, 'room.depth', 'Largura da divisão', fail)
  checkRange(room.wallHeight, LIMITS.wallHeight, 'room.wallHeight', 'Altura das paredes', fail)
  checkRange(room.wallThickness, LIMITS.wallThickness, 'room.wallThickness', 'Espessura das paredes', fail)
  if (!isHexColor(room.wallColor)) fail('room.wallColor', 'Cor das paredes inválida.')
  if (!(room.floorMaterial in FLOOR_MATERIALS)) fail('room.floorMaterial', 'Material do chão desconhecido.')
  if (!isHexColor(room.floorColor)) fail('room.floorColor', 'Cor do chão inválida.')
  if (!Array.isArray(room.openings)) return fail('room.openings', 'Lista de portas e janelas inválida.')
  if (room.openings.length > LIMITS.openingsPerRoom)
    fail('room.openings', `Máximo de ${LIMITS.openingsPerRoom} portas e janelas por divisão.`)
  const ids = new Set()
  room.openings.forEach((opening, i) => {
    const path = `room.openings[${i}]`
    validateOpening(opening, room, path, fail)
    if (isObject(opening)) {
      if (ids.has(opening.id)) fail(`${path}.id`, 'Identificador de abertura repetido.')
      ids.add(opening.id)
    }
  })
  validateRoute(room.route, room, fail)
}

function validateRoute(route, room, fail) {
  if (route === undefined) return
  if (!isObject(route) || !Array.isArray(route.steps)) return fail('room.route', 'Caminho de entrega inválido.')
  if (route.steps.length > ROUTE_LIMITS.steps) fail('room.route.steps', `Máximo de ${ROUTE_LIMITS.steps} passos no caminho.`)
  route.steps.forEach((step, i) => {
    const path = `room.route.steps[${i}]`
    if (!isObject(step)) return fail(path, 'Passo do caminho inválido.')
    if (!isNonEmptyString(step.id)) fail(`${path}.id`, 'Falta o identificador do passo.')
    if (!(step.type in ROUTE_STEP_TYPES)) fail(`${path}.type`, 'Tipo de passo desconhecido.')
    if (!isNonEmptyString(step.label)) fail(`${path}.label`, 'O passo tem de ter um nome.')
    checkRange(step.width, ROUTE_LIMITS.width, `${path}.width`, 'Largura do passo', fail)
    checkRange(step.height, ROUTE_LIMITS.height, `${path}.height`, 'Altura do passo', fail)
    if (step.widthAfter !== undefined) checkRange(step.widthAfter, ROUTE_LIMITS.width, `${path}.widthAfter`, 'Largura depois da curva', fail)
  })
  if (route.entryDoorId !== null && !(room.openings ?? []).some((o) => o.id === route.entryDoorId && o.type === 'door'))
    fail('room.route.entryDoorId', 'A porta de entrada não existe na divisão.')
}

function validateOpening(opening, room, path, fail) {
  if (!isObject(opening)) return fail(path, 'Porta ou janela inválida.')
  if (!isNonEmptyString(opening.id)) fail(`${path}.id`, 'Falta o identificador da abertura.')
  if (!(opening.type in OPENING_TYPES)) fail(`${path}.type`, 'Tipo de abertura desconhecido.')
  if (!WALL_SIDES.includes(opening.wall)) return fail(`${path}.wall`, 'Parede desconhecida.')
  checkRange(opening.width, OPENING_LIMITS.width, `${path}.width`, 'Largura da abertura', fail)
  checkRange(opening.height, OPENING_LIMITS.height, `${path}.height`, 'Altura da abertura', fail)
  checkRange(opening.sill, OPENING_LIMITS.sill, `${path}.sill`, 'Altura do peitoril', fail)
  const length = isFiniteNumber(room.width) && isFiniteNumber(room.depth) ? wallFrame(room, opening.wall).length : Infinity
  if (!isFiniteNumber(opening.offset) || opening.offset < 0 || opening.offset > length)
    fail(`${path}.offset`, 'A posição da abertura está fora da parede.')
  if (opening.type === 'door') {
    if (opening.hinge !== 'start' && opening.hinge !== 'end') fail(`${path}.hinge`, 'Lado da dobradiça inválido.')
    if (opening.swing !== 'in' && opening.swing !== 'out') fail(`${path}.swing`, 'Sentido de abertura inválido.')
  }
}

function validateSettings(settings, fail) {
  if (!isObject(settings)) return fail('settings', 'Faltam as definições do editor.')
  checkRange(settings.gridSize, LIMITS.gridSize, 'settings.gridSize', 'Passo da grelha', fail)
  if (typeof settings.snapToGrid !== 'boolean') fail('settings.snapToGrid', 'Valor de snap inválido.')
  if (!isFiniteNumber(settings.rotationStep) || settings.rotationStep <= 0 || settings.rotationStep > 90)
    fail('settings.rotationStep', 'O passo de rotação tem de estar entre 1° e 90°.')
  checkRange(settings.circulationMin, LIMITS.circulationMin, 'settings.circulationMin', 'Circulação mínima', fail)
  if (!(settings.accessibility in ACCESSIBILITY_PROFILES)) fail('settings.accessibility', 'Perfil de acessibilidade desconhecido.')
}

function validateLayout(layout, path, fail) {
  if (!isObject(layout)) return fail(path, 'Disposição inválida.')
  if (!isNonEmptyString(layout.id)) fail(`${path}.id`, 'Falta o identificador da disposição.')
  if (!isNonEmptyString(layout.name)) fail(`${path}.name`, 'A disposição tem de ter um nome.')
  if (!Array.isArray(layout.items)) return fail(`${path}.items`, 'Lista de móveis inválida.')
  const ids = new Set()
  layout.items.forEach((item, i) => {
    const itemPath = `${path}.items[${i}]`
    validateItem(item, itemPath, fail)
    if (isObject(item)) {
      if (ids.has(item.id)) fail(`${itemPath}.id`, 'Identificador de móvel repetido.')
      ids.add(item.id)
    }
  })
}

export function validateItem(item, path, fail) {
  if (!isObject(item)) return fail(path, 'Móvel inválido.')
  if (!isNonEmptyString(item.id)) fail(`${path}.id`, 'Falta o identificador do móvel.')
  if (!isNonEmptyString(item.catalogId)) fail(`${path}.catalogId`, 'Falta a referência ao catálogo.')
  if (!isNonEmptyString(item.name)) fail(`${path}.name`, 'O móvel tem de ter um nome.')
  if (!(item.category in FURNITURE_CATEGORIES)) fail(`${path}.category`, 'Categoria desconhecida.')
  if (!isObject(item.position) || !isFiniteNumber(item.position.x) || !isFiniteNumber(item.position.z))
    fail(`${path}.position`, 'Posição inválida.')
  if (!isFiniteNumber(item.rotation) || item.rotation < 0 || item.rotation >= 360)
    fail(`${path}.rotation`, 'A rotação tem de estar entre 0° e 360°.')
  checkRange(item.elevation, LIMITS.elevation, `${path}.elevation`, 'Elevação', fail)
  if (!isObject(item.dimensions)) {
    fail(`${path}.dimensions`, 'Faltam as dimensões do móvel.')
  } else {
    for (const key of ['width', 'depth'])
      checkRange(item.dimensions[key], LIMITS.item, `${path}.dimensions.${key}`, 'Dimensão do móvel', fail)
    checkRange(item.dimensions.height, LIMITS.itemHeight, `${path}.dimensions.height`, 'Altura do móvel', fail)
  }
  if (!isHexColor(item.color)) fail(`${path}.color`, 'Cor do móvel inválida.')
  if (item.finish !== null && typeof item.finish !== 'string') fail(`${path}.finish`, 'Acabamento inválido.')
  if (typeof item.locked !== 'boolean') fail(`${path}.locked`, 'Estado de bloqueio inválido.')
}

function checkRange(value, { min, max }, path, label, fail) {
  if (!isFiniteNumber(value)) return fail(path, `${label}: valor em falta ou não numérico.`)
  if (value < min || value > max) fail(path, `${label} tem de estar entre ${min} e ${max} m.`)
}

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0
const isFiniteNumber = (v) => typeof v === 'number' && Number.isFinite(v)
const isHexColor = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)
const isIsoDate = (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v))
