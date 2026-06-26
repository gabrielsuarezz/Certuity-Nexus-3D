import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAgentStore, type AgentStatus } from './agentStore'
import { useAgentChat } from './useAgentChat'
import { useAgentVoice } from './useAgentVoice'
import { VoiceSession } from './VoiceSession'
import { ApprovalCard } from './ApprovalCard'

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

/** The on-screen "private associate": text + voice, drives the 3D map, and
 *  surfaces human-in-the-loop approvals. */
export function AgentDock() {
  const messages = useAgentStore((s) => s.messages)
  const approvals = useAgentStore((s) => s.approvals)
  const status = useAgentStore((s) => s.status)
  const { send } = useAgentChat()
  const { voiceEnabled, agentId } = useAgentVoice()
  const [text, setText] = useState('')
  const [open, setOpen] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' })
  }, [messages.length, approvals.length])

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
                    <p>Ask me anything about your portfolio. For example:</p>
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
