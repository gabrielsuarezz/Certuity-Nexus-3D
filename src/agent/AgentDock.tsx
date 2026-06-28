import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAgentStore, type AgentStatus } from './agentStore'
import { useAgentChat } from './useAgentChat'
import { useAgentVoice } from './useAgentVoice'
import { VoiceSession } from './VoiceSession'
import { ApprovalCard } from './ApprovalCard'
import { config } from '@/config/env'
import { ScenarioCard } from './ScenarioCard'

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
  concentration: '#d9a441',
  liquidity: '#5fa8e6',
  performance: '#46d39a',
}

/** The on-screen "private associate": text + voice, drives the 3D map, and
 *  surfaces human-in-the-loop approvals. */
export function AgentDock() {
  const messages = useAgentStore((s) => s.messages)
  const approvals = useAgentStore((s) => s.approvals)
  const scenario = useAgentStore((s) => s.scenario)
  const status = useAgentStore((s) => s.status)
  const { send } = useAgentChat()
  const { voiceEnabled, agentId } = useAgentVoice()
  const [text, setText] = useState('')
  const [open, setOpen] = useState(true)
  const [briefing, setBriefing] = useState<Briefing | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`${config.agentBaseUrl}/api/briefing`)
      .then((r) => r.json())
      .then((d: Briefing) => setBriefing(d))
      .catch(() => {})
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' })
  }, [messages.length, approvals.length, scenario])

  const pending = approvals.filter((a) => a.status === 'pending')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    send(text)
    setText('')
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
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: 'linear-gradient(160deg, #16304c, #0b1e36)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
                <path d="M12 5V19M5 12H19" stroke="#C99B6A" strokeWidth="3.4" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <p className="text-[12.5px] font-semibold text-ink">Your Certuity Associate</p>
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
                className="scroll-slim max-h-[40vh] space-y-2 overflow-y-auto border-t border-white/[0.06] px-4 py-3"
              >
                {messages.length === 0 && (
                  <div className="text-[12px] text-ink-muted">
                    {briefing ? (
                      <div className="mb-2.5 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-[12.5px] font-semibold text-ink">{briefing.greeting}</p>
                          <span
                            className="text-[11px] font-medium tabular-nums"
                            style={{ color: briefing.change_pct >= 0 ? '#46d39a' : '#e5917c' }}
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
                          className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-ink transition hover:bg-white/[0.08]"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[82%] rounded-2xl px-3 py-2 text-[12.5px] leading-relaxed ${
                        m.role === 'user' ? 'bg-emr/15 text-ink' : 'bg-white/[0.04] text-ink'
                      } ${m.blocked ? 'border border-[#E5917C]/40' : ''}`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
                {pending.map((a) => (
                  <ApprovalCard key={a.id} approval={a} />
                ))}
                {scenario && <ScenarioCard scenario={scenario} />}
              </div>

              <form onSubmit={submit} className="flex items-center gap-2 border-t border-white/[0.06] p-2.5">
                {voiceEnabled && <VoiceSession agentId={agentId} />}
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Ask your associate…"
                  className="flex-1 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[13px] text-ink outline-none placeholder:text-ink-faint focus:border-white/20"
                />
                <button
                  type="submit"
                  className="rounded-full bg-gld/20 px-4 py-2 text-[12px] font-medium text-gld-bright transition hover:bg-gld/30"
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
