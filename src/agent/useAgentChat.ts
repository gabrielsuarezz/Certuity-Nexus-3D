import { useCallback, useEffect, useRef } from 'react'
import { config } from '@/config/env'
import { useAgentStore, type Approval } from './agentStore'
import { applyUiActions, type UiAction } from './applyUiActions'

interface ReplyMsg {
  type: 'reply'
  reply: string
  ui_actions?: UiAction[]
  approvals?: Approval[]
  blocked?: boolean
}

/** Pushed from the backend during a VOICE turn: move the map / raise approvals
 *  without adding a text bubble (the spoken transcript comes from the voice SDK). */
interface VoiceUiMsg {
  type: 'voice_ui'
  ui_actions?: UiAction[]
  approvals?: Approval[]
}

/** Text path: a WebSocket to the FastAPI agent (`/ws/agent`). Drives the 3D map
 *  and surfaces approvals via the shared agent store. */
export function useAgentChat() {
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const url = config.agentBaseUrl.replace(/^http/, 'ws') + '/ws/agent'
    let ws: WebSocket
    try {
      ws = new WebSocket(url)
    } catch {
      return
    }
    wsRef.current = ws
    ws.onmessage = (ev) => {
      const data = JSON.parse(ev.data) as ReplyMsg | VoiceUiMsg
      const store = useAgentStore.getState()
      if (data.type === 'voice_ui') {
        applyUiActions(data.ui_actions)
        if (data.approvals?.length) store.addApprovals(data.approvals)
        return
      }
      if (data.type !== 'reply') return
      store.addMessage('associate', data.reply, data.blocked)
      store.setStatus('idle')
      applyUiActions(data.ui_actions)
      if (data.approvals?.length) store.addApprovals(data.approvals)
    }
    ws.onclose = () => {
      if (wsRef.current === ws) wsRef.current = null
    }
    return () => ws.close()
  }, [])

  const send = useCallback((text: string) => {
    const clean = text.trim()
    const ws = wsRef.current
    if (!clean) return
    const store = useAgentStore.getState()
    store.addMessage('user', clean)
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      store.addMessage('associate', 'I’m not connected to the service right now — please make sure the agent backend is running.')
      return
    }
    store.setStatus('thinking')
    ws.send(JSON.stringify({ text: clean }))
  }, [])

  return { send }
}
