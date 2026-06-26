import { useEffect } from 'react'
import { useGraphStore } from '@/store/useGraphStore'
import type { MarketEventKind } from '@/types/market'

/**
 * Simulates a WebSocket pushing live market data. Every ~2–4s it picks an
 * account and emits an event (surge / capital_call / drawdown), which the store
 * applies and rolls up the lineage — proving real-time aggregation. Each event
 * also triggers the target node's pulse animation in the 3D scene.
 */
export function useMockMarketData(enabled = true) {
  const data = useGraphStore((s) => s.data)
  const applyMarketEvent = useGraphStore((s) => s.applyMarketEvent)

  useEffect(() => {
    if (!enabled || !data) return

    const accountIds = data.accounts.map((a) => a.Id)
    const altIds = new Set(
      data.accounts
        .filter((a) => a.SalenticaLMNTS__Account_Type__c === 'Alternative Investment')
        .map((a) => a.Id),
    )

    let timer: ReturnType<typeof setTimeout>

    const schedule = () => {
      // Calmer cadence (3.5–8s) — institutional, not frantic.
      const delay = 3500 + Math.random() * 4500
      timer = setTimeout(() => {
        const id = accountIds[Math.floor(Math.random() * accountIds.length)]
        const roll = Math.random()

        let kind: MarketEventKind
        let deltaPct: number
        if (altIds.has(id) && roll < 0.4) {
          kind = 'capital_call'
          deltaPct = 0.03 + Math.random() * 0.06
        } else if (roll < 0.62) {
          kind = 'surge'
          deltaPct = 0.015 + Math.random() * 0.05
        } else {
          kind = 'drawdown'
          deltaPct = -(0.01 + Math.random() * 0.035)
        }

        applyMarketEvent(id, { kind, deltaPct, ts: Date.now() })
        schedule()
      }, delay)
    }

    schedule()
    return () => clearTimeout(timer)
  }, [enabled, data, applyMarketEvent])
}
