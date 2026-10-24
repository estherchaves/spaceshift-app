import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useMemo, useState } from 'react'
import { PCFShadowMap } from 'three'
import { useEditorStore } from '@/store/editorStore.js'
import { useProjectStore } from '@/store/projectStore.js'
import { computeLayoutMetrics, selectRoom, useDisplayedItems } from '@/store/selectors.js'
import { CameraRig } from './CameraRig.jsx'
import { Furniture3D } from './Furniture3D.jsx'
import { Room3D } from './room/Room3D.jsx'
import { SceneToolbar } from './SceneToolbar.jsx'
import { SCENE_BACKGROUND } from './sceneColors.js'
import './Scene3D.css'

/**
 * Vista 3D da divisão. Lê exatamente o mesmo estado que a planta
 * (`useDisplayedItems`, com a pré-visualização dos gestos), por isso
 * qualquer alteração numa vista aparece logo na outra.
 * Carregada em diferido (React.lazy) para o Three.js não pesar no 2D.
 */
export default function Scene3D() {
  const room = useProjectStore(selectRoom)
  const items = useDisplayedItems()
  const selectedId = useEditorStore((state) => state.selectedItemId)
  const selectItem = useEditorStore((state) => state.selectItem)
  const dragging = useEditorStore((state) => state.interaction?.type === 'move')
  const { conflictIds } = useMemo(() => computeLayoutMetrics(room, items), [room, items])
  const [viewRequest, setViewRequest] = useState(null)
  const requestView = (view) => setViewRequest({ view })

  const center = [room.width / 2, 0, room.depth / 2]
  const span = Math.max(room.width, room.depth) + 2 * room.wallThickness

  return (
    <div className="scene3d" data-dragging={dragging || undefined}>
      <Canvas
        className="scene3d__canvas"
        shadows={{ type: PCFShadowMap }}
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ fov: 40, near: 0.05, far: 200, position: [center[0] + 6, 6, center[2] + 8] }}
        onPointerMissed={(e) => e.button === 0 && selectItem(null)}
        aria-label="Vista 3D da divisão"
      >
        <color attach="background" args={[SCENE_BACKGROUND]} />
        <fog attach="fog" args={[SCENE_BACKGROUND, span * 3, span * 7]} />

        <hemisphereLight args={['#fffaf2', '#c8bfb2', 0.55]} />
        <directionalLight
          position={[center[0] - span * 0.4, room.wallHeight * 2.4, center[2] + span * 0.6]}
          intensity={1.6}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0004}
          shadow-normalBias={0.02}
          shadow-camera-left={-span}
          shadow-camera-right={span}
          shadow-camera-top={span}
          shadow-camera-bottom={-span}
          shadow-camera-near={0.5}
          shadow-camera-far={span * 6}
        >
          <object3D attach="target" position={center} />
        </directionalLight>

        {/* Reflexos suaves gerados na própria cena: sem mapas HDR externos. */}
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={1.4} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
          <Lightformer form="rect" intensity={0.8} position={[-6, 2, 3]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} />
          <Lightformer form="rect" intensity={0.5} color="#ffe6c4" position={[6, 2, -3]} rotation-y={-Math.PI / 2} scale={[8, 3, 1]} />
        </Environment>

        <Room3D room={room} />
        {items.map((item) => (
          <Furniture3D
            key={item.id}
            item={item}
            selected={item.id === selectedId}
            conflict={conflictIds.has(item.id)}
            ceilingHeight={room.wallHeight}
          />
        ))}

        <ContactShadows
          position={[center[0], 0.002, center[2]]}
          scale={[room.width, room.depth]}
          resolution={512}
          far={1.2}
          blur={2.2}
          opacity={0.38}
          color="#3a3026"
        />

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.12}
          minDistance={1}
          maxDistance={40}
          maxPolarAngle={Math.PI / 2 - 0.04}
          zoomSpeed={0.8}
        />
        <CameraRig room={room} request={viewRequest} />
      </Canvas>
      <SceneToolbar onView={requestView} />
      <p className="scene3d__hint" aria-hidden="true">
        Arraste um móvel para o mover · arraste o fundo para rodar a vista
      </p>
    </div>
  )
}
