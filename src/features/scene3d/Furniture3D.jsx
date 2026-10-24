import { Edges } from '@react-three/drei'
import { useMemo } from 'react'
import { Shape } from 'three'
import { getLocalOutline } from '@/core/geometry/shapes.js'
import { planRotationToScene } from '@/core/coordinates/sceneMapping.js'
import { getCatalogEntry, getItemProfile } from '@/data/catalog/furniture.js'
import { FurnitureModel } from './models/FurnitureModel.jsx'
import { CONFLICT_COLOR, SELECTION_COLOR, WARNING_COLOR } from './sceneColors.js'
import { pendantCordLength } from './room/roomGeometry.js'
import { useItemDrag3D } from './useItemDrag3D.js'

const noRaycast = () => null

/**
 * Um móvel na cena: o grupo fica na posição da planta (centro da base)
 * e roda em torno do eixo vertical. Seleção, erro e aviso mostram-se com a
 * pegada real no chão (retângulo, elipse ou L) e as arestas da caixa.
 * `status` vem da análise: 'error' | 'warning' | undefined.
 */
export function Furniture3D({ item, selected, status, ceilingHeight }) {
  const handlers = useItemDrag3D(item.id)
  const entry = getCatalogEntry(item.catalogId)
  const { width, depth, height } = item.dimensions
  const state = status === 'error' ? 'conflict' : selected ? 'selected' : status === 'warning' ? 'warning' : null
  const stateColor = { conflict: CONFLICT_COLOR, selected: SELECTION_COLOR, warning: WARNING_COLOR }[state]
  const shapeKind = getItemProfile(item).shape
  const footprint = useMemo(() => {
    // Plano do chão rodado −90° em X: o ponto (x, −z) da forma cai em (x, 0, z).
    const points = getLocalOutline({ width, depth }, shapeKind)
    const shape = new Shape()
    points.forEach((p, i) => (i ? shape.lineTo(p.x, -p.z) : shape.moveTo(p.x, -p.z)))
    shape.closePath()
    return shape
  }, [width, depth, shapeKind])
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
          {state !== 'warning' && (
            <mesh position={[0, item.elevation + height / 2, 0]} raycast={noRaycast}>
              <boxGeometry args={[width + 0.02, height + 0.02, depth + 0.02]} />
              <meshBasicMaterial visible={false} />
              <Edges color={stateColor} lineWidth={2} />
            </mesh>
          )}
          <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
            <shapeGeometry args={[footprint]} />
            <meshBasicMaterial color={stateColor} transparent opacity={state === 'warning' ? 0.16 : 0.2} depthWrite={false} />
          </mesh>
        </>
      )}
    </group>
  )
}
