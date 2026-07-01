import { useEffect, useRef, useState } from 'react'
import { ConversationProvider, useConversation } from '@elevenlabs/react'
import { clientTools } from './clientTools'
import { useAgentStore } from './agentStore'

/** The mic button + live ElevenLabs Conversational AI session. Rendered ONLY
 *  when an agent is configured, so the SDK (which requires ConversationProvider)
 *  never initializes in the keyless/text-only demo.
 *
 *  Drives the shared agent status (listening -> thinking -> speaking) so the dock
 *  shows real-time feedback, and glows the mic in proportion to your voice so you
 *  can see it's actually hearing you. */
function VoiceMic({ agentId }: { agentId: string }) {
  const [active, setActive] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const rafRef = useRef<number | undefined>(undefined)

  const conv = useConversation({
    clientTools,
    onConnect: () => useAgentStore.getState().setStatus('listening'),
    onDisconnect: () => {
      useAgentStore.getState().setStatus('idle')
      setActive(false)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onMessage: (m: any) => {
      const text = m?.message
      if (text) useAgentStore.getState().addMessage(m?.source === 'user' ? 'user' : 'associate', text)
      // The instant the user's words are transcribed, show we're processing them.
      if (m?.source === 'user') useAgentStore.getState().setStatus('thinking')
    },
    // Speaking <-> listening transitions from the SDK.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onModeChange: (p: any) =>
      useAgentStore.getState().setStatus(p?.mode === 'speaking' ? 'speaking' : 'listening'),
    onError: () => useAgentStore.getState().setStatus('idle'),
  })

  // While listening, glow the mic in proportion to your voice level -- visible
  // proof it's hearing you. Written straight to the DOM via rAF (no re-renders).
  useEffect(() => {
    if (!active) return
    const tick = () => {
      let v = 0
      try {
        v = conv.getInputVolume?.() ?? 0
      } catch {
        /* session not ready yet */
      }
      v = Math.min(Math.max(v, 0), 1)
      const el = btnRef.current
      if (el) {
        const listening = useAgentStore.getState().status === 'listening'
        el.style.boxShadow = listening
          ? `0 0 0 ${2 + v * 7}px rgba(127,184,232,${0.12 + v * 0.35})`
          : ''
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (btnRef.current) btnRef.current.style.boxShadow = ''
    }
  }, [active, conv])

  const start = () => {
    try {
      useAgentStore.getState().setStatus('connecting')
      conv.startSession({ agentId })
      setActive(true)
    } catch {
      useAgentStore.getState().setStatus('idle')
    }
  }
  const stop = () => {
    try {
      conv.endSession()
    } catch {
      /* ignore */
    }
    setActive(false)
  }

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={active ? stop : start}
      title={active ? 'Stop talking' : 'Talk to your associate'}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${
        active ? 'bg-emr/30 text-emr-bright' : 'bg-white/[0.06] text-ink hover:bg-white/10'
      }`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  )
}

export function VoiceSession({ agentId }: { agentId: string }) {
  return (
    <ConversationProvider>
      <VoiceMic agentId={agentId} />
    </ConversationProvider>
  )
}
