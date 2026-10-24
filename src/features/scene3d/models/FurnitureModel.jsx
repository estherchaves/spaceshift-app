import { RoundedBox } from '@react-three/drei'
import { memo, useMemo } from 'react'
import { DoubleSide } from 'three'
import { buildFurnitureParts } from './furnitureModels.js'
import { materialFor } from './materials.js'

const SEGMENTS = 28

/**
 * Converte as peças de `buildFurnitureParts` em meshes. As geometrias são
 * unitárias e escaladas pela peça, por isso mudar as medidas do móvel não
 * recria geometria (exceto nas caixas arredondadas, que têm raio fixo).
 */
export const FurnitureModel = memo(function FurnitureModel({ modelKey, width, depth, height, color, finish }) {
  const parts = useMemo(() => buildFurnitureParts(modelKey, { width, depth, height }), [modelKey, width, depth, height])
  return parts.map((part, index) => <Part key={index} part={part} material={materialFor(part.role, { color, finish }, part.color)} />)
})

function Part({ part, material }) {
  const { shape, position, size, rotation } = part
  // Os abajures são cones abertos: vê-se o interior.
  const mat = <meshStandardMaterial {...material} side={shape === 'cone' ? DoubleSide : undefined} />
  if (shape === 'roundedBox') {
    const radius = Math.max(0.001, Math.min(0.035, Math.min(...size) / 2 - 0.001))
    return (
      <RoundedBox args={size} radius={radius} smoothness={3} position={position} rotation={rotation} castShadow receiveShadow>
        {mat}
      </RoundedBox>
    )
  }
  return (
    <mesh position={position} rotation={rotation} scale={size} castShadow receiveShadow>
      <UnitGeometry shape={shape} taper={part.taper} />
      {mat}
    </mesh>
  )
}

function UnitGeometry({ shape, taper }) {
  switch (shape) {
    case 'cylinder':
      return <cylinderGeometry args={[0.5, 0.5 * (taper ?? 1), 1, SEGMENTS]} />
    case 'cone':
      return <cylinderGeometry args={[0.5 * (taper ?? 0), 0.5, 1, SEGMENTS, 1, true]} />
    case 'sphere':
      return <sphereGeometry args={[0.5, SEGMENTS, 16]} />
    default:
      return <boxGeometry />
  }
}
