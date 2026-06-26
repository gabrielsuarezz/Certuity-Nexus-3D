import { useState } from 'react'
import { ConversationProvider, useConversation } from '@elevenlabs/react'
import { clientTools } from './clientTools'
import { useAgentStore } from './agentStore'

/** The mic button + live ElevenLabs Conversational AI session. Rendered ONLY
 *  when an agent is configured, so the SDK (which requires ConversationProvider)
 *  never initializes in the keyless/text-only demo. */
function VoiceMic({ agentId }: { agentId: string }) {
  const [active, setActive] = useState(false)
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
    },
    onError: () => useAgentStore.getState().setStatus('idle'),
  })

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
