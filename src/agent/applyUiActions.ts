import { useGraphStore } from '@/store/useGraphStore'

export interface UiAction {
  action: 'focus' | 'trace' | 'setLookThrough' | 'overview'
  node_id?: string
  on?: boolean
}

/**
 * Apply agent-emitted UI actions to the 3D map using the SAME store actions a
 * mouse click uses — so the associate drives the map exactly as a user would.
 */
export function applyUiActions(actions: UiAction[] | undefined) {
  if (!actions?.length) return
  const s = useGraphStore.getState()
  for (const a of actions) {
    switch (a.action) {
      case 'focus':
        if (a.node_id) s.selectNode(a.node_id)
        break
      case 'trace': // look-through + select the leaf account → lineage trace
        s.setLookThrough(true)
        if (a.node_id) s.selectNode(a.node_id)
        break
      case 'setLookThrough':
        s.setLookThrough(!!a.on)
        break
      case 'overview':
        s.clearSelection()
        s.setLookThrough(false)
        break
    }
  }
}
