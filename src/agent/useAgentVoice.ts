import { useEffect, useState } from 'react'
import { config } from '@/config/env'

/** Reports whether voice is configured (backend has an ElevenLabs agent id).
 *  The actual ElevenLabs hook lives in <VoiceSession>, mounted only when enabled
 *  — so the SDK's required ConversationProvider/hook never run without config. */
export function useAgentVoice() {
  const [agentId, setAgentId] = useState('')

  useEffect(() => {
    fetch(`${config.agentBaseUrl}/api/config`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.voiceEnabled && d?.agentId) setAgentId(d.agentId)
      })
      .catch(() => {})
  }, [])

  return { voiceEnabled: !!agentId, agentId }
}
