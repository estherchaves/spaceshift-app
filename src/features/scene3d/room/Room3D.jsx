import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { createFloorTexture } from './floorTexture.js'
import { doorLeafEnd, openingSegment } from '@/core/model'
import { cutawayWallIds, displayedWall, wallPieces } from './roomGeometry.js'

const FLOOR_ROUGHNESS = { oak: 0.72, walnut: 0.68, tile: 0.35, concrete: 0.8, carpet: 1 }

/**
 * Chão e paredes da divisão. As paredes entre a câmara e o interior são
 * cortadas a um rodapé baixo enquanto a câmara se move, para a vista
 * nunca ficar tapada.
 */
export function Room3D({ room }) {
  const { width, depth, wallHeight, wallThickness, wallColor, floorMaterial, floorColor, openings } = room
  const walls = useMemo(
    () => wallPieces({ width, depth, wallHeight, wallThickness, openings }),
    [width, depth, wallHeight, wallThickness, openings],
  )
  const wallRefs = useRef({})
  const openingRefs = useRef({})

  // Atualizado diretamente nas meshes a cada frame (sem re-render do React).
  useFrame(({ camera }) => {
    const cut = cutawayWallIds(walls, camera.position.toArray())
    const cutWalls = new Set(walls.filter((piece) => cut.has(piece.id)).map((piece) => piece.wall))
    for (const wall of walls) {
      const mesh = wallRefs.current[wall.id]
      if (!mesh) continue
      const isCut = cut.has(wall.id)
      if (mesh.userData.cut === isCut) continue
      const shown = displayedWall(wall, isCut)
      mesh.position.set(...shown.position)
      mesh.scale.set(...shown.size)
      mesh.visible = !shown.hidden
      mesh.userData.cut = isCut
    }
    // Folhas das portas e vidros acompanham a parede cortada.
    for (const [wallId, group] of Object.entries(openingRefs.current)) {
      if (group) group.visible = !cutWalls.has(wallId)
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
      {['north', 'south', 'west', 'east'].map((wallId) => (
        <group
          key={wallId}
          ref={(group) => {
            openingRefs.current[wallId] = group
          }}
        >
          {(openings ?? [])
            .filter((opening) => WALL_OF_SIDE[opening.wall] === wallId)
            .map((opening) =>
              opening.type === 'door' ? <DoorLeaf3D key={opening.id} room={room} door={opening} /> : <WindowGlass3D key={opening.id} room={room} window={opening} />,
            )}
        </group>
      ))}
    </group>
  )
}

const WALL_OF_SIDE = { top: 'north', bottom: 'south', left: 'west', right: 'east' }
const LEAF_THICKNESS = 0.04

/** Folha da porta aberta a 90°, do lado para onde abre (como na planta). */
function DoorLeaf3D({ room, door }) {
  const { hinge, end } = doorLeafEnd(room, door)
  const cx = (hinge.x + end.x) / 2
  const cz = (hinge.z + end.z) / 2
  const alongX = Math.abs(end.x - hinge.x) > Math.abs(end.z - hinge.z)
  const size = alongX ? [door.width, door.height, LEAF_THICKNESS] : [LEAF_THICKNESS, door.height, door.width]
  return (
    <mesh name={`door:${door.id}`} position={[cx, door.height / 2, cz]} castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#d8cdbd" roughness={0.6} />
    </mesh>
  )
}

/** Vidro da janela, a meio da espessura da parede. */
function WindowGlass3D({ room, window: win }) {
  const seg = openingSegment(room, win)
  const t = room.wallThickness
  const cx = seg.centre.x - seg.inward.x * (t / 2)
  const cz = seg.centre.z - seg.inward.z * (t / 2)
  const alongX = seg.dir.x !== 0
  const size = alongX ? [win.width, win.height, 0.02] : [0.02, win.height, win.width]
  return (
    <mesh name={`window:${win.id}`} position={[cx, win.sill + win.height / 2, cz]}>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#b9d3e0" transparent opacity={0.35} roughness={0.1} metalness={0.1} />
    </mesh>
  )
}
