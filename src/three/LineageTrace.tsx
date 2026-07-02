import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { useGraphStore } from '@/store/useGraphStore'
import type { Positions } from './layout'

const TRACE_Y = 0

/**
 * The Look-Through Analyzer's glowing neon conduit: a bright static line along
 * the lineage (leaf → entity → office) plus a comet running root-ward. Only
 * mounted while a trace is active.
 */
export function LineageTrace({ positions }: { positions: Positions }) {
  const lineage = useGraphStore((s) => s.lineage)
  const invalidate = useThree((s) => s.invalidate)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineRef = useRef<any>(null)
  const cometRef = useRef<THREE.Mesh>(null)
  const fade = useRef(0)
  const cometT = useRef(0)

  const pts = useMemo(() => {
    if (!lineage) return [] as THREE.Vector3[]
    const out: THREE.Vector3[] = []
    for (const id of lineage.nodeIds) {
      const v = positions.get(id)
      if (v) out.push(new THREE.Vector3(v.x, TRACE_Y, v.z))
    }
    return out
  }, [lineage, positions])

  const linePoints = useMemo<[number, number, number][]>(
    () => pts.map((p) => [p.x, p.y, p.z]),
    [pts],
  )

  useEffect(() => {
    fade.current = 0
    cometT.current = 0
    if (lineage) invalidate()
  }, [lineage, invalidate])

  useFrame((_, delta) => {
    if (pts.length < 2) return
    if (lineRef.current) {
      fade.current = Math.min(fade.current + delta / 0.3, 1)
      lineRef.current.material.opacity = fade.current
    }
    cometT.current = (cometT.current + delta / 1.3) % 1
    if (cometRef.current) cometRef.current.position.copy(sampleAt(pts, cometT.current))
    invalidate()
  })

  if (pts.length < 2) return null

  return (
    <group>
      <Line ref={lineRef} points={linePoints} color="#8A6A24" lineWidth={4} transparent opacity={0} />
      <mesh ref={cometRef}>
        <sphereGeometry args={[1.3, 14, 14]} />
        <meshStandardMaterial color="#C6A15A" emissive="#C6A15A" emissiveIntensity={0.9} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Position at fraction `t` along a polyline (by cumulative segment length). */
function sampleAt(pts: THREE.Vector3[], t: number): THREE.Vector3 {
  if (pts.length === 1) return pts[0].clone()
  const segs: number[] = []
  let total = 0
  for (let i = 0; i < pts.length - 1; i++) {
    const d = pts[i].distanceTo(pts[i + 1])
    segs.push(d)
    total += d
  }
  const target = total * t
  let acc = 0
  for (let i = 0; i < segs.length; i++) {
    if (acc + segs[i] >= target) {
      const f = segs[i] === 0 ? 0 : (target - acc) / segs[i]
      return pts[i].clone().lerp(pts[i + 1], f)
    }
    acc += segs[i]
  }
  return pts[pts.length - 1].clone()
}
