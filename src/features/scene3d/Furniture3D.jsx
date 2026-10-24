import { Edges } from '@react-three/drei'
import { planRotationToScene } from '@/core/coordinates/sceneMapping.js'
import { getCatalogEntry } from '@/data/catalog/furniture.js'
import { FurnitureModel } from './models/FurnitureModel.jsx'
import { CONFLICT_COLOR, SELECTION_COLOR } from './sceneColors.js'
import { pendantCordLength } from './room/roomGeometry.js'
import { useItemDrag3D } from './useItemDrag3D.js'

const noRaycast = () => null

/**
 * Um móvel na cena: o grupo fica na posição da planta (centro da base)
 * e roda em torno do eixo vertical. Seleção e conflito mostram-se com a
 * pegada no chão e as arestas da caixa envolvente.
 */
export function Furniture3D({ item, selected, conflict, ceilingHeight }) {
  const handlers = useItemDrag3D(item.id)
  const entry = getCatalogEntry(item.catalogId)
  const { width, depth, height } = item.dimensions
  const state = conflict ? 'conflict' : selected ? 'selected' : null
  const stateColor = conflict ? CONFLICT_COLOR : SELECTION_COLOR
  const cord = entry?.model3d === 'pendant-lamp' ? pendantCordLength(item, ceilingHeight) : 0

  return (
    <group
      name={`item:${item.id}`}
      position={[item.position.x, 0, item.position.z]}
      rotation={[0, planRotationToScene(item.rotation), 0]}
      userData={{ itemId: item.id, state }}
    >
      <group position={[0, item.elevation, 0]} {...handlers}>
        <FurnitureModel
          modelKey={entry?.model3d ?? null}
          width={width}
          depth={depth}
          height={height}
          color={item.color}
          finish={item.finish}
        />
        {cord > 0 && (
          <mesh position={[0, height + cord / 2, 0]} raycast={noRaycast}>
            <cylinderGeometry args={[0.004, 0.004, cord, 8]} />
            <meshStandardMaterial color="#2b2b2d" roughness={0.5} />
          </mesh>
        )}
      </group>

      {state && (
        <>
          <mesh position={[0, item.elevation + height / 2, 0]} raycast={noRaycast}>
            <boxGeometry args={[width + 0.02, height + 0.02, depth + 0.02]} />
            <meshBasicMaterial visible={false} />
            <Edges color={stateColor} lineWidth={2} />
          </mesh>
          <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
            <planeGeometry args={[width, depth]} />
            <meshBasicMaterial color={stateColor} transparent opacity={0.2} depthWrite={false} />
          </mesh>
        </>
      )}
    </group>
  )
}
