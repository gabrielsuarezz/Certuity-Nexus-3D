import * as THREE from 'three'
import type { Graph3DNode } from '@/lib/buildGraph3D'

export type Positions = Map<string, THREE.Vector3>

/** Build a static id → position map once from the deterministic layout. */
export function buildPositions(nodes: Graph3DNode[]): Positions {
  const m: Positions = new Map()
  for (const n of nodes) m.set(n.id, new THREE.Vector3(n.x, n.y, n.z))
  return m
}
