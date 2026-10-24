import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { createFloorTexture } from './floorTexture.js'
import { cutawayWallIds, displayedWall, wallSegments } from './roomGeometry.js'

const FLOOR_ROUGHNESS = { oak: 0.72, walnut: 0.68, tile: 0.35, concrete: 0.8, carpet: 1 }

/**
 * Chão e paredes da divisão. As paredes entre a câmara e o interior são
 * cortadas a um rodapé baixo enquanto a câmara se move, para a vista
 * nunca ficar tapada.
 */
export function Room3D({ room }) {
  const { width, depth, wallHeight, wallThickness, wallColor, floorMaterial, floorColor } = room
  const walls = useMemo(
    () => wallSegments({ width, depth, wallHeight, wallThickness }),
    [width, depth, wallHeight, wallThickness],
  )
  const wallRefs = useRef({})

  // Atualizado diretamente nas meshes a cada frame (sem re-render do React).
  useFrame(({ camera }) => {
    const cut = cutawayWallIds(walls, camera.position.toArray())
    for (const wall of walls) {
      const mesh = wallRefs.current[wall.id]
      if (!mesh) continue
      const isCut = cut.has(wall.id)
      if (mesh.userData.cut === isCut) continue
      const shown = displayedWall(wall, isCut)
      mesh.position.set(...shown.position)
      mesh.scale.set(...shown.size)
      mesh.userData.cut = isCut
    }
  })

  const texture = useMemo(
    () => createFloorTexture(floorMaterial, floorColor, { width, depth }),
    [floorMaterial, floorColor, width, depth],
  )
  useEffect(() => () => texture?.dispose(), [texture])

  return (
    <group name="room">
      <mesh name="floor" position={[width / 2, 0, depth / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          key={texture ? texture.uuid : 'plain'}
          map={texture ?? undefined}
          color={texture ? '#ffffff' : floorColor}
          roughness={FLOOR_ROUGHNESS[floorMaterial] ?? 0.8}
        />
      </mesh>
      {walls.map((wall) => (
        <mesh
          key={wall.id}
          ref={(mesh) => {
            wallRefs.current[wall.id] = mesh
          }}
          name={`wall:${wall.id}`}
          // Medidas da parede inteira; o corte é aplicado no próximo frame.
          userData={{ cut: false }}
          position={wall.position}
          scale={wall.size}
          castShadow
          receiveShadow
        >
          <boxGeometry />
          <meshStandardMaterial color={wallColor} roughness={0.92} />
        </mesh>
      ))}
    </group>
  )
}
