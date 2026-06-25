import { create } from 'zustand'
import { getLineage } from '@/lib/buildGraph'
import type { Lineage, WealthData, WealthRecord } from '@/types/salesforce'

interface GraphState {
  /** Normalized data, set once after the service resolves. */
  data: WealthData | null

  /** Currently selected node (drives the details panel). */
  selectedId: string | null

  /** Look-Through Analyzer master toggle. */
  lookThrough: boolean

  /** The leaf account currently being traced (only when lookThrough is on). */
  activeLeafId: string | null

  /** Cached lineage (node + edge ids) for the active trace. */
  lineage: Lineage | null

  setData: (data: WealthData) => void
  selectNode: (id: string) => void
  clearSelection: () => void
  setLookThrough: (on: boolean) => void
  toggleLookThrough: () => void
  getRecord: (id: string | null) => WealthRecord | null
}

export const useGraphStore = create<GraphState>((set, get) => ({
  data: null,
  selectedId: null,
  lookThrough: false,
  activeLeafId: null,
  lineage: null,

  setData: (data) => set({ data }),

  selectNode: (id) => {
    const { data, lookThrough } = get()
    if (!data) {
      set({ selectedId: id })
      return
    }

    const isAccount = data.accounts.some((a) => a.Id === id)

    if (lookThrough && isAccount) {
      // Activate the neon lineage trace from this leaf up to the household.
      set({ selectedId: id, activeLeafId: id, lineage: getLineage(id, data) })
    } else if (lookThrough) {
      // Selecting a non-leaf while analyzing clears the trace but keeps selection.
      set({ selectedId: id, activeLeafId: null, lineage: null })
    } else {
      set({ selectedId: id })
    }
  },

  clearSelection: () => set({ selectedId: null, activeLeafId: null, lineage: null }),

  setLookThrough: (on) =>
    set(
      on
        ? { lookThrough: true }
        : { lookThrough: false, activeLeafId: null, lineage: null },
    ),

  toggleLookThrough: () => get().setLookThrough(!get().lookThrough),

  getRecord: (id) => {
    const { data } = get()
    if (!data || !id) return null
    if (data.household.Id === id) return data.household
    return (
      data.portfolios.find((p) => p.Id === id) ??
      data.accounts.find((a) => a.Id === id) ??
      null
    )
  },
}))
