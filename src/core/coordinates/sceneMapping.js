/**
 * Ligação entre a planta 2D e a cena 3D (Three.js).
 *
 * Usamos o MESMO referencial do mundo nas duas vistas:
 *   planta (x, z)  →  cena (x, y, z), com Y para cima.
 * Uma câmara colocada em +Y a olhar para baixo vê exatamente a planta:
 * +X à direita e +Z para baixo no ecrã.
 *
 * Rotação: na planta guardamos graus no sentido dos ponteiros do relógio
 * (visto de cima). Em Three.js, rotation.y positivo roda no sentido
 * contrário visto de cima, por isso o sinal inverte-se.
 */

const DEG_TO_RAD = Math.PI / 180

/** Centro do objeto na cena: assente no chão (ou na sua elevação). */
export function planToScenePosition(position, height, elevation = 0) {
  return [position.x, elevation + height / 2, position.z]
}

export function scenePositionToPlan([x, , z]) {
  return { x, z }
}

export function planRotationToScene(degrees) {
  const radians = -degrees * DEG_TO_RAD
  return radians === 0 ? 0 : radians // evita -0
}

export function sceneRotationToPlan(radians) {
  const degrees = -radians / DEG_TO_RAD
  return ((degrees % 360) + 360) % 360
}
