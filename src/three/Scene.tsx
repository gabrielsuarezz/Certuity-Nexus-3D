import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor, Environment, Lightformer } from '@react-three/drei'
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

      {/* Image-based reflections: gives the metal/clearcoat materials something to
          reflect, so they read as minted metal & pearl instead of flat blobs.
          background={false} → affects reflections only, not the visible (now
          transparent) backdrop. Baked once; panels stay in the navy/gold palette. */}
      <Environment resolution={256} frames={1} background={false}>
        <color attach="background" args={['#0a1626']} />
        {/* soft daylight top */}
        <Lightformer form="rect" intensity={1.1} color="#eaf2ff" position={[0, 16, 4]} scale={[24, 24, 1]} />
        {/* cool azure key, front-left */}
        <Lightformer form="rect" intensity={1.5} color="#9fc2ec" position={[-18, 7, 16]} scale={[16, 12, 1]} />
        {/* warm champagne rim, back-right */}
        <Lightformer form="rect" intensity={1.3} color="#E8C48F" position={[18, 6, -14]} scale={[14, 12, 1]} />
        {/* faint gold underglow off the floor */}
        <Lightformer form="ring" intensity={0.6} color="#C9A86A" position={[0, -9, 8]} scale={11} />
      </Environment>

      <ambientLight intensity={0.32} color="#9fb4d4" />
      <hemisphereLight args={['#3a5680', '#05080f', 0.42]} />
      {/* cool key */}
      <directionalLight position={[40, 90, 60]} intensity={1.3} color="#dce8fa" />
      {/* warm champagne rim — breaks the all-blue cast and rakes the metal edges */}
      <directionalLight position={[-70, 26, -48]} intensity={1.05} color="#E8C48F" />
      <pointLight position={[-55, 45, -25]} intensity={0.5} color="#C9A86A" />

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
