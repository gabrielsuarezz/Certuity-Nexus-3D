import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import { buildGraph3D } from '@/lib/buildGraph3D'
import { buildPositions } from './layout'
import { LightPool } from './LightPool'
import { NodeMesh } from './NodeMesh'
import { Links } from './Links'
import { LineageTrace } from './LineageTrace'
import { CameraRig } from './CameraRig'
import { Effects } from './Effects'
import { useGraphStore } from '@/store/useGraphStore'
import type { WealthData } from '@/types/salesforce'

/** Auto-protect FPS on big / high-DPI Chrome windows: drop DPR when frames slow,
 *  restore when they recover (works with the continuous frameloop). */
function AdaptivePerf() {
  const setDpr = useThree((s) => s.setDpr)
  return (
    <PerformanceMonitor
      onIncline={() => setDpr(1.5)}
      onDecline={() => setDpr(1)}
      flipflops={3}
      onFallback={() => setDpr(1)}
    />
  )
}

/** Everything inside the <Canvas>. The constellation turns slowly (ambient,
 *  monitor-friendly) and eases to a neutral facing while a lineage is analyzed. */
export function Scene({ data }: { data: WealthData }) {
  const { nodes, links } = useMemo(() => buildGraph3D(data), [data])
  const positions = useMemo(() => buildPositions(nodes), [nodes])
  const activeLeafId = useGraphStore((s) => s.activeLeafId)
  const spin = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    const g = spin.current
    if (!g) return
    if (activeLeafId) g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, 0, 0.08)
    else g.rotation.y += delta * 0.045
  })

  return (
    <>
      <AdaptivePerf />

      <ambientLight intensity={0.5} color="#9fb4d4" />
      <hemisphereLight args={['#3a5680', '#05080f', 0.5]} />
      <directionalLight position={[40, 90, 60]} intensity={1.5} color="#dce8fa" />
      <pointLight position={[-55, 45, -25]} intensity={0.6} color="#C9A86A" />

      <LightPool />

      <group ref={spin}>
        <Links links={links} positions={positions} />
        <LineageTrace positions={positions} />
        {nodes.map((node, i) => (
          <NodeMesh key={node.id} node={node} index={i} />
        ))}
      </group>

      <CameraRig positions={positions} />
      <Effects />
    </>
  )
}
