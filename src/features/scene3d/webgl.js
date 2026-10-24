/** Indica se o navegador consegue criar um contexto WebGL (necessário para a vista 3D). */
export function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    const available = Boolean(context)
    context?.getExtension('WEBGL_lose_context')?.loseContext()
    return available
  } catch {
    return false
  }
}
