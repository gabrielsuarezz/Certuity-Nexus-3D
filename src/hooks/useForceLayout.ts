import { useCallback, useEffect, useRef } from 'react'
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceRadial,
  forceSimulation,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force'
import { useReactFlow, useStore, type OnNodeDrag } from '@xyflow/react'
import type { NodeKind, WealthEdge, WealthNode } from '@/types/salesforce'

interface SimNode extends SimulationNodeDatum {
  id: string
  kind: NodeKind
}

const INNER_RADIUS = 300
const OUTER_RADIUS = 560

function collideRadius(kind: NodeKind): number {
  if (kind === 'household') return 120
  if (kind === 'portfolio') return 98
  return 84
}

function ringRadius(kind: NodeKind): number {
  if (kind === 'household') return 0
  if (kind === 'portfolio') return INNER_RADIUS
  return OUTER_RADIUS
}

/**
 * Runs a live d3-force simulation that owns node positions (React Flow in
 * uncontrolled mode). The household is pinned at the center; portfolios and
 * accounts settle onto orbital rings. Dragging pins a node to the cursor;
 * releasing clears the pin so the forces ease it back — the fluid snap-back.
 */
export function useForceLayout() {
  const { getNodes, getEdges, setNodes, fitView } =
    useReactFlow<WealthNode, WealthEdge>()
  const simRef = useRef<Simulation<SimNode, SimulationLinkDatum<SimNode>> | null>(
    null,
  )
  const draggingRef = useRef<string | null>(null)
  const fittedRef = useRef(false)

  // Wait until React Flow has measured every node before laying out.
  const initialised = useStore((s) => {
    const nodes = Array.from(s.nodeLookup.values())
    return nodes.length > 0 && nodes.every((n) => n.measured?.width != null)
  })

  useEffect(() => {
    if (!initialised) return
    const rfNodes = getNodes()
    if (rfNodes.length === 0) return

    const simNodes: SimNode[] = rfNodes.map((n) => ({
      id: n.id,
      kind: n.data.kind,
      x: n.position.x,
      y: n.position.y,
    }))
    const byId = new Map(simNodes.map((n) => [n.id, n]))
    const simLinks: SimulationLinkDatum<SimNode>[] = getEdges().map((e) => ({
      source: e.source,
      target: e.target,
    }))

    // Pin the household at the origin so the structure stays centered.
    const household = simNodes.find((n) => n.kind === 'household')
    if (household) {
      household.fx = 0
      household.fy = 0
    }

    const sim = forceSimulation(simNodes)
      .velocityDecay(0.34)
      .force(
        'charge',
        forceManyBody<SimNode>().strength(-1250).distanceMax(950),
      )
      .force(
        'link',
        forceLink<SimNode, SimulationLinkDatum<SimNode>>(simLinks)
          .id((d) => d.id)
          .distance((l) => ((l.target as SimNode).kind === 'account' ? 235 : 300))
          .strength(0.45),
      )
      .force(
        'collide',
        forceCollide<SimNode>()
          .radius((d) => collideRadius(d.kind))
          .strength(0.92),
      )
      .force(
        'radial',
        forceRadial<SimNode>((d) => ringRadius(d.kind), 0, 0).strength((d) =>
          d.kind === 'household' ? 0 : 0.09,
        ),
      )
      .alpha(0.9)
      .alphaDecay(0.028)

    sim.on('tick', () => {
      const dragId = draggingRef.current
      setNodes((prev) =>
        prev.map((node) => {
          if (node.id === dragId) return node
          const sn = byId.get(node.id)
          if (!sn) return node
          return { ...node, position: { x: sn.x ?? 0, y: sn.y ?? 0 } }
        }),
      )
    })

    // Frame the graph once, after the initial layout settles (not after drags).
    sim.on('end', () => {
      if (fittedRef.current) return
      fittedRef.current = true
      requestAnimationFrame(() => fitView({ padding: 0.3, duration: 800 }))
    })

    simRef.current = sim
    return () => {
      sim.stop()
      simRef.current = null
    }
  }, [initialised, getNodes, getEdges, setNodes, fitView])

  const pinTo = useCallback((id: string, x: number, y: number) => {
    const sim = simRef.current
    if (!sim) return
    const sn = (sim.nodes() as SimNode[]).find((s) => s.id === id)
    if (sn) {
      sn.fx = x
      sn.fy = y
    }
  }, [])

  const onNodeDragStart: OnNodeDrag<WealthNode> = useCallback(
    (_, node) => {
      draggingRef.current = node.id
      pinTo(node.id, node.position.x, node.position.y)
      simRef.current?.alphaTarget(0.32).restart()
    },
    [pinTo],
  )

  const onNodeDrag: OnNodeDrag<WealthNode> = useCallback(
    (_, node) => {
      pinTo(node.id, node.position.x, node.position.y)
    },
    [pinTo],
  )

  const onNodeDragStop: OnNodeDrag<WealthNode> = useCallback((_, node) => {
    draggingRef.current = null
    const sim = simRef.current
    if (!sim) return
    const sn = (sim.nodes() as SimNode[]).find((s) => s.id === node.id)
    if (sn && sn.kind !== 'household') {
      // Release the pin → the forces ease the node back into equilibrium.
      sn.fx = null
      sn.fy = null
    }
    sim.alphaTarget(0).alpha(0.55).restart()
  }, [])

  return { onNodeDragStart, onNodeDrag, onNodeDragStop }
}
