/*
 * Ponte para exportar a vista 3D como imagem sem importar o Three.js no
 * editor: a cena regista aqui uma função enquanto está montada e o menu
 * Exportar só a usa (e só a mostra ativa) se existir.
 */
let capture = null
const listeners = new Set()

export function registerSceneCapture(fn) {
  capture = fn
  listeners.forEach((listener) => listener())
  return () => {
    if (capture === fn) capture = null
    listeners.forEach((listener) => listener())
  }
}

export function hasSceneCapture() {
  return capture !== null
}

export function subscribeSceneCapture(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** @returns {Promise<Blob|null>} */
export function captureScene() {
  return capture ? capture() : Promise.resolve(null)
}
