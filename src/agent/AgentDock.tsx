import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAgentStore, type AgentStatus } from './agentStore'
import { useAgentChat } from './useAgentChat'
import { useAgentVoice } from './useAgentVoice'
import { ApprovalCard } from './ApprovalCard'
import { config } from '@/config/env'
import { ScenarioCard } from './ScenarioCard'
import { DocumentCard } from './DocumentCard'

// Voice pulls in the heavy ElevenLabs SDK — code-split it so it loads only when
// voice is actually enabled, keeping it out of the initial bundle.
const VoiceSession = lazy(() =>
  import('./VoiceSession').then((m) => ({ default: m.VoiceSession })),
)

const STATUS_LABEL: Record<AgentStatus, string> = {
  idle: 'Ready',
  connecting: 'Connecting…',
  listening: 'Listening…',
  thinking: 'Thinking…',
  speaking: 'Speaking…',
}

const SUGGESTIONS = [
  'What is my total AUM?',
  'How are my alternatives doing?',
  'Trace my Alts+ fund',
]

interface BriefingItem {
  kind: string
  text: string
}
interface Briefing {
  greeting: string
  household: string
  headline: string
  change_pct: number
  items: BriefingItem[]
  speak: string
}

const ITEM_COLOR: Record<string, string> = {
  concentration: '#9c7a34',
  liquidity: '#2e5788',
  performance: '#2f8f68',
}

/** The on-screen "private associate": text + voice, drives the 3D map, and
 *  surfaces human-in-the-loop approvals. */
export function AgentDock() {
  const messages = useAgentStore((s) => s.messages)
  const approvals = useAgentStore((s) => s.approvals)
  const scenario = useAgentStore((s) => s.scenario)
  const docResult = useAgentStore((s) => s.document)
  const status = useAgentStore((s) => s.status)
  const { send } = useAgentChat()
  const { voiceEnabled, agentId } = useAgentVoice()
  const [text, setText] = useState('')
  const [open, setOpen] = useState(true)
  const [briefing, setBriefing] = useState<Briefing | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`${config.agentBaseUrl}/api/briefing`)
      .then((r) => r.json())
      .then((d: Briefing) => setBriefing(d))
      .catch(() => {})
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' })
  }, [messages.length, approvals.length, scenario, docResult])

  const pending = approvals.filter((a) => a.status === 'pending')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    send(text)
    setText('')
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    const store = useAgentStore.getState()
    store.addMessage('user', `📎 ${file.name}`)
    store.setStatus('thinking')
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch(`${config.agentBaseUrl}/api/document/analyze`, { method: 'POST', body: fd })
      const d = await res.json()
      store.setStatus('idle')
      if (d.events?.length) store.addEvents(d.events)
      if (!d.ok) {
        store.addMessage('associate', d.message || 'I couldn’t read that document.')
      } else if (d.blocked) {
        store.setDocument(null)
        store.addMessage('associate', d.summary, true)
      } else {
        store.setDocument(d)
      }
    } catch {
      store.setStatus('idle')
      store.addMessage('associate', 'I had trouble analyzing that document.')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const loadSample = (path: string, name: string) => {
    fetch(path)
      .then((r) => r.blob())
      .then((b) => onFile(new File([b], name, { type: 'application/pdf' })))
      .catch(() => {})
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-4">
      <div className="glass hairline pointer-events-auto flex w-[680px] max-w-[94vw] flex-col overflow-hidden rounded-2xl">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center justify-between gap-3 px-4 py-2.5 text-left"
        >
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg shadow-[0_4px_12px_-6px_rgba(29,58,94,0.7)]"
              style={{ background: 'linear-gradient(160deg, #2E5788, #1D3A5E)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
                <path d="M12 5V19M5 12H19" stroke="#E2C88C" strokeWidth="3.4" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <p className="text-[13px] font-semibold text-ink">Your Certuity Associate</p>
              <p className="text-[10px] text-ink-faint">{STATUS_LABEL[status]}</p>
            </div>
          </div>
          <span
            className={`h-2 w-2 rounded-full ${status === 'idle' ? 'bg-ink-faint' : 'animate-pulse bg-emr-bright'}`}
          />
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
              <div
                ref={scrollRef}
                className="scroll-slim max-h-[40vh] space-y-2 overflow-y-auto border-t border-ink/10 px-4 py-3"
              >
                {messages.length === 0 && (
                  <div className="text-[12px] text-ink-muted">
                    {briefing ? (
                      <div className="mb-2.5 rounded-xl border border-ink/10 bg-white/60 p-3 shadow-sm">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-[12.5px] font-semibold text-ink">{briefing.greeting}</p>
                          <span
                            className="text-[11px] font-medium tabular-nums"
                            style={{ color: briefing.change_pct >= 0 ? '#2f8f68' : '#c2603f' }}
                          >
                            {briefing.change_pct >= 0 ? '▲' : '▼'} {Math.abs(briefing.change_pct)}% today
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-ink-faint">{briefing.headline}</p>
                        <div className="mt-2 space-y-1.5">
                          {briefing.items.map((it, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <span
                                className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full"
                                style={{ background: ITEM_COLOR[it.kind] ?? '#8aa0b4' }}
                              />
                              <span className="text-[11.5px] leading-snug text-ink">{it.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p>Ask me anything about your portfolio. For example:</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => send(s)}
                          className="rounded-full border border-ink/12 bg-white/70 px-2.5 py-1 text-[11.5px] text-ink shadow-sm transition hover:border-emr/40 hover:bg-white"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2.5 border-t border-ink/10 pt-2">
                      <p className="mb-1.5 text-[10.5px] text-ink-faint">Or analyze a document:</p>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => loadSample('/samples/capital-call.pdf', 'capital-call.pdf')}
                          className="rounded-full border border-ink/12 bg-white/70 px-2.5 py-1 text-[11.5px] text-ink shadow-sm transition hover:border-emr/40 hover:bg-white"
                        >
                          📄 Capital call notice
                        </button>
                        <button
                          type="button"
                          onClick={() => loadSample('/samples/suspicious-notice.pdf', 'suspicious-notice.pdf')}
                          className="rounded-full border border-[#C2603F]/40 bg-[#C2603F]/[0.08] px-2.5 py-1 text-[11.5px] text-ink shadow-sm transition hover:bg-[#C2603F]/[0.16]"
                        >
                          ⚠ Suspicious document
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed shadow-sm ${
                        m.role === 'user'
                          ? 'bg-emr/12 text-ink'
                          : 'border border-ink/8 bg-white/85 text-ink'
                      } ${m.blocked ? 'border-2 border-[#C2603F]/50' : ''}`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
                {pending.map((a) => (
                  <ApprovalCard key={a.id} approval={a} />
                ))}
                {scenario && <ScenarioCard scenario={scenario} />}
                {docResult && <DocumentCard doc={docResult} />}
              </div>

              <form onSubmit={submit} className="flex items-center gap-2 border-t border-ink/10 p-2.5">
                {voiceEnabled && (
                  <Suspense fallback={null}>
                    <VoiceSession agentId={agentId} />
                  </Suspense>
                )}
                <input ref={fileRef} type="file" accept=".pdf,.txt" hidden onChange={(e) => onFile(e.target.files?.[0])} />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  title="Upload a document"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink/10 bg-white/70 text-ink-muted transition hover:bg-white hover:text-ink"
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M21 12.5l-8.6 8.6a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l7.6-7.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Ask your associate…"
                  className="flex-1 rounded-full border border-ink/15 bg-white/80 px-4 py-2 text-[13.5px] text-ink outline-none placeholder:text-ink-faint focus:border-emr/50 focus:bg-white"
                />
                <button
                  type="submit"
                  className="rounded-full bg-gld px-4 py-2 text-[12.5px] font-semibold text-white shadow-[0_6px_16px_-8px_rgba(122,94,42,0.9)] transition hover:bg-gld-deep"
                >
                  Send
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
