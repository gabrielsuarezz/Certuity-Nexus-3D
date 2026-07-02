import { useMemo } from 'react'
import { useGraphStore } from '@/store/useGraphStore'
import type { Graph3DLink } from '@/lib/buildGraph3D'
import type { Positions } from './layout'

const CONDUIT_Y = 0

/**
 * All ownership conduits as ONE static LineSegments (single draw call). Positions
 * are deterministic, so the buffer is built once — no per-frame work at all.
 */
export function Links({
  links,
  positions,
}: {
  links: Graph3DLink[]
  positions: Positions
}) {
  const dimmed = useGraphStore((s) => !!s.lineage)

  const buffer = useMemo(() => {
    const arr = new Float32Array(links.length * 2 * 3)
    let i = 0
    for (const l of links) {
      const a = positions.get(l.source)
      const b = positions.get(l.target)
      if (a) {
        arr[i] = a.x
        arr[i + 1] = CONDUIT_Y
        arr[i + 2] = a.z
      }
      if (b) {
        arr[i + 3] = b.x
        arr[i + 4] = CONDUIT_Y
        arr[i + 5] = b.z
      }
      i += 6
    }
    return arr
  }, [links, positions])

  return (
    <lineSegments frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[buffer, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        color="#9C7A34"
        transparent
        opacity={dimmed ? 0.12 : 0.55}
        toneMapped={false}
      />
    </lineSegments>
  )
}
