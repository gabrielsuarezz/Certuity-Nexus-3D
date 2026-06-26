import { create } from 'zustand'
import { getLineage } from '@/lib/buildGraph'
import type { Lineage, WealthData, WealthRecord } from '@/types/salesforce'
import type { MarketEvent } from '@/types/market'

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

  // ── Real-time market simulation ──────────────────────────────────────────
  /** Current (live) value per node id — rolls up children → parents. */
  liveValues: Record<string, number>
  /** Most recent market event per node id; its `ts` triggers the node pulse. */
  lastEvent: Record<string, MarketEvent>
  /** Live aggregated household AUM (drives the top-nav readout). */
  liveTotalAum: number

  setData: (data: WealthData) => void
  selectNode: (id: string) => void
  clearSelection: () => void
  setLookThrough: (on: boolean) => void
  toggleLookThrough: () => void
  getRecord: (id: string | null) => WealthRecord | null
  applyMarketEvent: (nodeId: string, event: MarketEvent) => void
}

export const useGraphStore = create<GraphState>((set, get) => ({
  data: null,
  selectedId: null,
  lookThrough: false,
  activeLeafId: null,
  lineage: null,
  liveValues: {},
  lastEvent: {},
  liveTotalAum: 0,

  setData: (data) => {
    // Seed live values from the static base figures (they already tie out).
    const liveValues: Record<string, number> = {}
    data.accounts.forEach((a) => {
      liveValues[a.Id] = a.SalenticaLMNTS__Market_Value__c
    })
    data.portfolios.forEach((p) => {
      liveValues[p.Id] = p.SalenticaLMNTS__AUM__c
    })
    liveValues[data.household.Id] = data.household.SalenticaLMNTS__Total_AUM__c

    set({
      data,
      liveValues,
      lastEvent: {},
      liveTotalAum: data.household.SalenticaLMNTS__Total_AUM__c,
    })
  },

  selectNode: (id) => {
    const { data, lookThrough } = get()
    if (!data) {
      set({ selectedId: id })
      return
    }

    const isAccount = data.accounts.some((a) => a.Id === id)

    if (lookThrough && isAccount) {
      set({ selectedId: id, activeLeafId: id, lineage: getLineage(id, data) })
    } else if (lookThrough) {
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

  applyMarketEvent: (nodeId, event) => {
    const { data, liveValues } = get()
    if (!data) return

    const next = { ...liveValues }
    const base = next[nodeId] ?? 0
    next[nodeId] = Math.max(base + base * event.deltaPct, 0)

    // Roll the change up the lineage: account → its portfolio → household.
    const account = data.accounts.find((a) => a.Id === nodeId)
    if (account) {
      const pid = account.SalenticaLMNTS__Portfolio__c
      next[pid] = data.accounts
        .filter((a) => a.SalenticaLMNTS__Portfolio__c === pid)
        .reduce((s, a) => s + (next[a.Id] ?? a.SalenticaLMNTS__Market_Value__c), 0)
    }
    next[data.household.Id] = data.portfolios.reduce(
      (s, p) => s + (next[p.Id] ?? p.SalenticaLMNTS__AUM__c),
      0,
    )

    set({
      liveValues: next,
      lastEvent: { ...get().lastEvent, [nodeId]: event },
      liveTotalAum: next[data.household.Id],
    })
  },
}))
