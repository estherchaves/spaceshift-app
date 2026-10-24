import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { registerSceneCapture } from './sceneCapture.js'

/**
 * Regista a captura da cena: desenha um fotograma e copia-o logo a seguir
 * (sem `preserveDrawingBuffer`, o conteúdo só é garantido nesse instante).
 */
export function CaptureBridge() {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)
  useEffect(
    () =>
      registerSceneCapture(
        () =>
          new Promise((resolve) => {
            gl.render(scene, camera)
            gl.domElement.toBlob((blob) => resolve(blob), 'image/png')
          }),
      ),
    [gl, scene, camera],
  )
  return null
}
