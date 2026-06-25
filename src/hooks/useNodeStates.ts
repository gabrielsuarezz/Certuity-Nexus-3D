import { useGraphStore } from '@/store/useGraphStore'

export interface NodeVisualState {
  selected: boolean
  /** On the active look-through lineage. */
  traced: boolean
  /** A trace is active and this node is NOT on it. */
  dimmed: boolean
}

/** Derives a node's visual state (selected / traced / dimmed) from the store. */
export function useNodeStates(id: string): NodeVisualState {
  const selectedId = useGraphStore((s) => s.selectedId)
  const lineage = useGraphStore((s) => s.lineage)

  const inLineage = lineage ? lineage.nodeIds.has(id) : false
  return {
    selected: selectedId === id,
    traced: !!lineage && inLineage,
    dimmed: !!lineage && !inLineage,
  }
}
