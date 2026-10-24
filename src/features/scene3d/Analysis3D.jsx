import { useMemo } from 'react'
import { Shape } from 'three'
import { isIssueVisible } from '@/features/analysis/markerPaths.js'
import { CONFLICT_COLOR, WARNING_COLOR } from './sceneColors.js'

const noRaycast = () => null
const LINE_WIDTH = 0.025

/** Polígono do chão (metros) para uma Shape do plano rodado −90° em X. */
function toShape(points) {
  const shape = new Shape()
  points.forEach((p, i) => (i ? shape.lineTo(p.x, -p.z) : shape.moveTo(p.x, -p.z)))
  shape.closePath()
  return shape
}

/**
 * Marcadores da análise no chão da cena 3D, a partir dos mesmos dados da
 * planta: zona exata das colisões e da parte fora da divisão (vermelho),
 * passagens estreitas (faixa âmbar com a largura medida) e zonas isoladas.
 */
export function Analysis3D({ issues, focusedId, selectedId, panelOpen }) {
  const layers = useMemo(() => {
    const errors = []
    const zones = []
    const gaps = []
    for (const issue of issues) {
      const marker = issue.marker
      if (!marker || issue.type === 'access' || issue.type === 'ceiling') continue
      if (!isIssueVisible(issue, { focusedId, selectedId, panelOpen })) continue
      const focused = issue.id === focusedId
      if (marker.kind === 'region') errors.push(...marker.polygons.map(toShape))
      else if (marker.kind === 'zone') zones.push(...marker.runs.map((r) => toShape([
        { x: r.x, z: r.z }, { x: r.x + r.width, z: r.z }, { x: r.x + r.width, z: r.z + r.depth }, { x: r.x, z: r.z + r.depth },
      ])))
      else if (marker.kind === 'gap') gaps.push({ id: issue.id, ...marker, focused })
    }
    return { errors, zones, gaps }
  }, [issues, focusedId, selectedId, panelOpen])

  return (
    <group name="analysis">
      {layers.zones.length > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} raycast={noRaycast} renderOrder={2}>
          <shapeGeometry args={[layers.zones]} />
          <meshBasicMaterial color={WARNING_COLOR} transparent opacity={0.22} depthWrite={false} />
        </mesh>
      )}
      {layers.errors.length > 0 && (
        <mesh name="analysis:errors" rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} raycast={noRaycast} renderOrder={3}>
          <shapeGeometry args={[layers.errors]} />
          <meshBasicMaterial color={CONFLICT_COLOR} transparent opacity={0.45} depthWrite={false} />
        </mesh>
      )}
      {layers.gaps.map((gap) => {
        const dx = gap.to.x - gap.from.x
        const dz = gap.to.z - gap.from.z
        const angle = Math.atan2(dz, dx)
        return (
          <mesh
            key={gap.id}
            name="analysis:gap"
            position={[(gap.from.x + gap.to.x) / 2, 0.008, (gap.from.z + gap.to.z) / 2]}
            rotation={[-Math.PI / 2, 0, -angle]}
            raycast={noRaycast}
            renderOrder={4}
          >
            <planeGeometry args={[Math.max(gap.distance, 0.01), gap.focused ? LINE_WIDTH * 2 : LINE_WIDTH]} />
            <meshBasicMaterial color={WARNING_COLOR} transparent opacity={0.9} depthWrite={false} />
          </mesh>
        )
      })}
    </group>
  )
}
