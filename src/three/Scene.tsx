import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor, Environment, Lightformer, ContactShadows, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { buildGraph3D } from '@/lib/buildGraph3D'
import { buildPositions } from './layout'
import { NodeMesh } from './NodeMesh'
import { Links } from './Links'
import { LineageTrace } from './LineageTrace'
import { CameraRig } from './CameraRig'
import { Effects } from './Effects'
import { useGraphStore } from '@/store/useGraphStore'
import type { WealthData } from '@/types/salesforce'

/** Auto-protect FPS on big / high-DPI Chrome windows — ONE-WAY only. Every DPR
 *  change forces the effect composer to rebuild its render targets, which can
 *  present a black frame; oscillating up/down reads as random flicker. So we
 *  only ever step DOWN, once, and stay there. */
function AdaptivePerf() {
  const setDpr = useThree((s) => s.setDpr)
  const degraded = useRef(false)
  const degrade = () => {
    if (degraded.current) return
    degraded.current = true
    setDpr(1)
  }
  return <PerformanceMonitor onDecline={degrade} onFallback={degrade} />
}

/**
 * Everything inside the <Canvas>: sleek rounded node forms joined by gold
 * ownership conduits, seated on soft contact shadows, in a warm studio with
 * floating light-motes over the CSS aurora. Turns slowly (ambient), easing to a
 * neutral facing while a lineage is analysed.
 */
export function Scene({ data }: { data: WealthData }) {
  const { nodes, links } = useMemo(() => buildGraph3D(data), [data])
  const positions = useMemo(() => buildPositions(nodes), [nodes])
  const activeLeafId = useGraphStore((s) => s.activeLeafId)
  const spin = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    const g = spin.current
    if (!g) return
    if (activeLeafId) g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, 0, 0.08)
    else g.rotation.y += delta * 0.028
  })

  return (
    <>
      <AdaptivePerf />

      {/* Warm, bright gallery studio for reflections so the satin finishes read
          as real materials in daylight. background={false} → reflections only. */}
      <Environment resolution={256} frames={1} background={false}>
        <color attach="background" args={['#f3ead8']} />
        <Lightformer form="rect" intensity={1.4} color="#fff6e6" position={[0, 16, 4]} scale={[26, 26, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#fffaf0" position={[-18, 8, 16]} scale={[16, 12, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#f0d6a4" position={[18, 6, -14]} scale={[14, 12, 1]} />
        <Lightformer form="ring" intensity={0.5} color="#e9dcc0" position={[0, -9, 8]} scale={12} />
      </Environment>

      <ambientLight intensity={0.7} color="#fff3df" />
      <hemisphereLight args={['#fff4e0', '#c9b593', 0.55]} />
      <directionalLight position={[36, 88, 58]} intensity={1.1} color="#fff6e8" />
      <directionalLight position={[-70, 30, -48]} intensity={0.65} color="#f0d6a4" />
      <pointLight position={[-52, 44, -22]} intensity={0.32} color="#e7cf9f" />

      {/* Soft contact shadows anchor every form to the gallery table. */}
      <ContactShadows
        position={[0, -4.96, 4]}
        scale={[280, 220]}
        resolution={1024}
        blur={2.6}
        far={26}
        opacity={0.3}
        color="#5a4a2c"
      />

      {/* Warm floating light-motes — air and depth. Cheap. */}
      <Sparkles
        count={64}
        scale={[200, 76, 180]}
        position={[0, 20, 4]}
        size={3.2}
        speed={0.26}
        opacity={0.5}
        color="#D8BE86"
        noise={1.4}
      />

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
