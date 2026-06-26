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

interface AgentState {
  messages: AgentMessage[]
  approvals: Approval[]
  status: AgentStatus
  addMessage: (role: AgentRole, text: string, blocked?: boolean) => void
  setStatus: (status: AgentStatus) => void
  addApprovals: (items: Approval[]) => void
  setApprovalStatus: (id: string, status: string) => void
}

const rid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

export const useAgentStore = create<AgentState>((set) => ({
  messages: [],
  approvals: [],
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
}))
