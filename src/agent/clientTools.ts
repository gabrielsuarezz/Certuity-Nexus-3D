import { applyUiActions } from './applyUiActions'
import { resolveHolding } from './resolveHolding'
import { useAgentStore } from './agentStore'

type Params = Record<string, unknown>
const str = (v: unknown): string => (typeof v === 'string' ? v : '')

/**
 * Tools the ElevenLabs voice agent calls IN THE BROWSER to drive the 3D map and
 * raise human-in-the-loop confirmations. (Read data comes via backend server
 * tools; these are the client-side, map-driving + approval tools.)
 */
export const clientTools = {
  focus_holding: async (p: Params) => {
    const id = resolveHolding(str(p.query))
    applyUiActions([id ? { action: 'focus', node_id: id } : { action: 'overview' }])
    return id ? 'Highlighted it on the map.' : 'Showing the overview.'
  },
  trace_lineage: async (p: Params) => {
    const id = resolveHolding(str(p.query), { accountsOnly: true })
    applyUiActions([id ? { action: 'trace', node_id: id } : { action: 'overview' }])
    return id ? 'Tracing it up to the family office on the map.' : 'Showing the overview.'
  },
  set_look_through: async (p: Params) => {
    applyUiActions([{ action: 'setLookThrough', on: !!p.on }])
    return p.on ? 'Look-through is on.' : 'Look-through is off.'
  },
  show_overview: async () => {
    applyUiActions([{ action: 'overview' }])
    return 'Showing the full portfolio.'
  },
  request_approval: async (p: Params) => {
    const id = Math.random().toString(36).slice(2, 10)
    useAgentStore.getState().addApprovals([
      { id, kind: str(p.kind) || 'request', details: str(p.details), status: 'pending' },
    ])
    return 'A confirmation has been placed on the client screen for them to review and approve.'
  },
}
