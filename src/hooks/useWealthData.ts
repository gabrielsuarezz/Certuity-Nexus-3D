import { useCallback, useEffect, useState } from 'react'
import { fetchWealthGraph } from '@/services/wealthService'
import type { WealthData } from '@/types/salesforce'

export type LoadStatus = 'loading' | 'ready' | 'error'

interface UseWealthDataResult {
  data: WealthData | null
  status: LoadStatus
  error: string | null
  reload: () => void
}

/**
 * Wraps the wealthService seam in React state: exposes loading / ready / error
 * status plus a `reload()` for the error retry. Cancels in-flight loads on
 * unmount (and on reload) via AbortController.
 */
export function useWealthData(): UseWealthDataResult {
  const [data, setData] = useState<WealthData | null>(null)
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    setStatus('loading')
    setError(null)

    fetchWealthGraph(controller.signal)
      .then((result) => {
        if (!active) return
        setData(result)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (!active || controller.signal.aborted) return
        setError(
          err instanceof Error ? err.message : 'Failed to load wealth data.',
        )
        setStatus('error')
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [nonce])

  return { data, status, error, reload }
}
