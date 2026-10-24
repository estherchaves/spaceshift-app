/*
 * Geometria pura da divisão em 3D (sem Three.js), testável em Node.
 *
 * Referencial igual ao da planta: origem no canto interior superior
 * esquerdo, X para a direita, Z "para baixo" na planta, Y para cima.
 * As paredes ficam do lado de fora do retângulo interior, por isso as
 * medidas da divisão continuam a ser as medidas úteis.
 */

/** Altura (m) a que ficam as paredes cortadas, para manter o contorno visível. */
export const CUTAWAY_HEIGHT = 0.12

/**
 * As quatro paredes como caixas. `normal` aponta para fora da divisão;
 * `inner` é o ponto médio da face interior (usado no corte automático).
 */
export function wallSegments({ width, depth, wallHeight, wallThickness: t }) {
  const y = wallHeight / 2
  return [
    { id: 'north', position: [width / 2, y, -t / 2], size: [width + 2 * t, wallHeight, t], normal: [0, 0, -1], inner: [width / 2, 0, 0] },
    { id: 'south', position: [width / 2, y, depth + t / 2], size: [width + 2 * t, wallHeight, t], normal: [0, 0, 1], inner: [width / 2, 0, depth] },
    { id: 'west', position: [-t / 2, y, depth / 2], size: [t, wallHeight, depth], normal: [-1, 0, 0], inner: [0, 0, depth / 2] },
    { id: 'east', position: [width + t / 2, y, depth / 2], size: [t, wallHeight, depth], normal: [1, 0, 0], inner: [width, 0, depth / 2] },
  ]
}

/**
 * Corte automático: uma parede fica baixa quando a câmara está do lado de
 * fora do seu plano, ou seja, quando taparia o interior. Visto de cima
 * (câmara sobre a divisão) nenhuma parede é cortada.
 * @returns {Set<string>} ids das paredes a cortar
 */
export function cutawayWallIds(walls, [cx, , cz]) {
  const hidden = new Set()
  for (const wall of walls) {
    const [nx, , nz] = wall.normal
    const [ix, , iz] = wall.inner
    if ((cx - ix) * nx + (cz - iz) * nz > 1e-6) hidden.add(wall.id)
  }
  return hidden
}

/** Medidas de uma parede tal como é desenhada (inteira ou cortada). */
export function displayedWall(wall, cut) {
  if (!cut) return wall
  const height = Math.min(CUTAWAY_HEIGHT, wall.size[1])
  return { ...wall, position: [wall.position[0], height / 2, wall.position[2]], size: [wall.size[0], height, wall.size[2]] }
}

export function roomCenter({ width, depth }) {
  return [width / 2, 0, depth / 2]
}

/**
 * Distância a que uma câmara perspetiva com campo vertical `fov` (graus)
 * e proporção `aspect` vê uma esfera de raio `radius` inteira.
 */
export function fitDistance(radius, fov, aspect = 1) {
  const vertical = (fov * Math.PI) / 180
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * aspect)
  const limiting = Math.min(vertical, horizontal)
  return radius / Math.sin(limiting / 2)
}

/*
 * A esfera envolvente é conservadora (inclui a altura das paredes, que
 * ficam cortadas do lado da câmara); este fator aproxima o enquadramento.
 */
const FIT_MARGIN = 0.85

export const CAMERA_VIEWS = {
  perspective: { label: 'Perspetiva' },
  top: { label: 'Vista de cima' },
  front: { label: 'Frontal' },
}

/**
 * Posição e alvo da câmara para as vistas rápidas.
 *  - perspective: de sudeste, elevada (vista "de catálogo");
 *  - top: na vertical sobre o centro (equivalente à planta);
 *  - front: de frente para a parede do fundo (norte), à altura dos olhos.
 */
export function cameraView(view, room, { fov = 40, aspect = 1 } = {}) {
  const [x, , z] = roomCenter(room)
  const radius = Math.hypot(room.width, room.depth, room.wallHeight) / 2 + room.wallThickness
  const distance = fitDistance(radius, fov, aspect) * FIT_MARGIN
  const target = [x, Math.min(room.wallHeight * 0.3, 0.9), z]
  if (view === 'top') {
    const footprint = Math.hypot(room.width, room.depth) / 2 + room.wallThickness
    return { position: [x, fitDistance(footprint, fov, aspect) + room.wallHeight, z + 0.001], target: [x, 0, z] }
  }
  if (view === 'front') {
    return { position: [x, 1.6, z + distance], target: [x, 1.1, z] }
  }
  // Perspetiva: azimute de 35° e elevação de 38° a partir do lado sul-este.
  const azimuth = (35 * Math.PI) / 180
  const elevation = (38 * Math.PI) / 180
  return {
    position: [
      target[0] + distance * Math.cos(elevation) * Math.sin(azimuth),
      target[1] + distance * Math.sin(elevation),
      target[2] + distance * Math.cos(elevation) * Math.cos(azimuth),
    ],
    target,
  }
}

/**
 * Interseção de um raio com o plano horizontal y = `height`.
 * @returns {{x: number, z: number} | null} null se o raio for paralelo ou apontar para longe
 */
export function intersectFloor([ox, oy, oz], [dx, dy, dz], height = 0) {
  if (Math.abs(dy) < 1e-9) return null
  const t = (height - oy) / dy
  if (t < 0) return null
  return { x: ox + dx * t, z: oz + dz * t }
}

/** Comprimento do cabo de um candeeiro suspenso até ao teto (0 se já lhe tocar). */
export function pendantCordLength(item, wallHeight) {
  return Math.max(0, wallHeight - (item.elevation + item.dimensions.height))
}

/**
 * "Enquadrar": mantém a direção atual da câmara e ajusta a distância para
 * a divisão inteira caber no ecrã, centrada.
 */
export function fitView(room, direction, { fov = 40, aspect = 1 } = {}) {
  const length = Math.hypot(...direction)
  const [dx, dy, dz] = length > 1e-9 ? direction.map((v) => v / length) : [0, 1, 0]
  const target = [room.width / 2, 0, room.depth / 2]
  const radius = Math.hypot(room.width, room.depth, room.wallHeight) / 2 + room.wallThickness
  const distance = fitDistance(radius, fov, aspect) * FIT_MARGIN
  return { position: [target[0] + dx * distance, Math.max(0.3, target[1] + dy * distance), target[2] + dz * distance], target }
}
