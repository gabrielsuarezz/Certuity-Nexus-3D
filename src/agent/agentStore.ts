import { create } from 'zustand'

export type AgentRole = 'user' | 'associate'
export type AgentStatus = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking'

export interface AgentMessage {
  id: string
  role: AgentRole
  text: string
  blocked?: boolean
}

export interface Approval {
  id: string
  kind: string
  details: string
  status: string // pending | approved | declined
}

export type SafeguardKind = 'grounded' | 'map' | 'approval' | 'blocked' | 'scope' | 'redacted'

export interface SafeguardEvent {
  id: string
  kind: SafeguardKind
  label: string
}

export interface ScenarioMetric {
  label: string
  before: string
  after: string
  dir: 'up' | 'down' | 'flat'
}

export interface Scenario {
  title: string
  summary: string
  metrics: ScenarioMetric[]
}

export interface DocumentResult {
  filename: string
  blocked?: boolean
  doc_type?: string
  summary: string
  key_facts?: string[]
  portfolio_note?: string
}

interface AgentState {
  messages: AgentMessage[]
  approvals: Approval[]
  events: SafeguardEvent[]
  scenario: Scenario | null
  document: DocumentResult | null
  status: AgentStatus
  addMessage: (role: AgentRole, text: string, blocked?: boolean) => void
  setStatus: (status: AgentStatus) => void
  addApprovals: (items: Approval[]) => void
  setApprovalStatus: (id: string, status: string) => void
  addEvents: (items: Omit<SafeguardEvent, 'id'>[]) => void
  setScenario: (scenario: Scenario | null) => void
  setDocument: (document: DocumentResult | null) => void
}

const rid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

export const useAgentStore = create<AgentState>((set) => ({
  messages: [],
  approvals: [],
  events: [],
  scenario: null,
  document: null,
  status: 'idle',
  addMessage: (role, text, blocked) =>
    set((s) => ({ messages: [...s.messages, { id: rid(), role, text, blocked }] })),
  setStatus: (status) => set({ status }),
  addApprovals: (items) =>
    set((s) => {
      const known = new Set(s.approvals.map((a) => a.id))
      return { approvals: [...s.approvals, ...items.filter((a) => !known.has(a.id))] }
    }),
  setApprovalStatus: (id, status) =>
    set((s) => ({ approvals: s.approvals.map((a) => (a.id === id ? { ...a, status } : a)) })),
  addEvents: (items) =>
    set((s) => ({ events: [...s.events, ...items.map((e) => ({ id: rid(), ...e }))].slice(-24) })),
  setScenario: (scenario) => set({ scenario }),
  setDocument: (document) => set({ document }),
}))
