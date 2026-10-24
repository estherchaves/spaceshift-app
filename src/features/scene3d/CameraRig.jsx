import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion.js'
import { cameraView, fitView } from './room/roomGeometry.js'

const DURATION = 0.6 // s

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

function poseFor(request, room, camera, controls, aspect) {
  const options = { fov: camera.fov, aspect }
  if (request.view === 'fit') {
    const target = controls?.target ?? { x: room.width / 2, y: 0, z: room.depth / 2 }
    const direction = [camera.position.x - target.x, camera.position.y - target.y, camera.position.z - target.z]
    return fitView(room, direction, options)
  }
  return cameraView(request.view, room, options)
}

/**
 * Leva a câmara às vistas rápidas com uma transição curta. A primeira
 * vista é aplicada sem animação. Mexer na câmara à mão interrompe a
 * transição em curso.
 */
export function CameraRig({ room, request }) {
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls)
  const size = useThree((state) => state.size)
  const invalidate = useThree((state) => state.invalidate)
  const animation = useRef(null)
  const applied = useRef(null)
  const initialized = useRef(false)
  const reducedMotion = usePrefersReducedMotion()

  // Vista inicial: assim que os controlos existem, sem transição.
  useLayoutEffect(() => {
    if (!controls || initialized.current) return
    initialized.current = true
    const pose = cameraView('perspective', room, { fov: camera.fov, aspect: size.width / Math.max(1, size.height) })
    camera.position.set(...pose.position)
    controls.target.set(...pose.target)
    controls.update()
    applied.current = request
    invalidate()
  }, [controls, camera, room, size, request, invalidate])

  useEffect(() => {
    if (!controls || !request || applied.current === request) return
    applied.current = request
    const to = poseFor(request, room, camera, controls, size.width / Math.max(1, size.height))
    animation.current = {
      elapsed: 0,
      fromPosition: camera.position.clone(),
      fromTarget: controls.target.clone(),
      to,
    }
    invalidate()
  }, [request, controls, camera, room, size, invalidate])

  useEffect(() => {
    if (!controls) return undefined
    const stop = () => {
      animation.current = null
    }
    controls.addEventListener('start', stop)
    return () => controls.removeEventListener('start', stop)
  }, [controls])

  useFrame((_, delta) => {
    const a = animation.current
    if (!a || !controls) return
    a.elapsed = reducedMotion ? DURATION : Math.min(DURATION, a.elapsed + delta)
    const t = easeInOut(a.elapsed / DURATION)
    camera.position.copy(a.fromPosition).lerp({ x: a.to.position[0], y: a.to.position[1], z: a.to.position[2] }, t)
    controls.target.copy(a.fromTarget).lerp({ x: a.to.target[0], y: a.to.target[1], z: a.to.target[2] }, t)
    controls.update()
    if (a.elapsed >= DURATION) animation.current = null
    invalidate()
  })

  return null
}
