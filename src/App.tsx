import { useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Background } from '@/components/Background'
import { TopBar } from '@/components/TopBar'
import { LoadingState } from '@/components/states/LoadingState'
import { ErrorState } from '@/components/states/ErrorState'
import { PrismScene } from '@/three/PrismScene'
import { AgentDock } from '@/agent/AgentDock'
import { AgentBoundary } from '@/agent/AgentBoundary'
import { SafeguardsPanel } from '@/agent/SafeguardsPanel'
import { HeroPanel } from '@/components/HeroPanel'
import { DetailsPanel } from '@/components/DetailsPanel'
import { useWealthData } from '@/hooks/useWealthData'
import { useMockMarketData } from '@/hooks/useMockMarketData'
import { useGraphStore } from '@/store/useGraphStore'
import { config } from '@/config/env'

export default function App() {
  const { data, status, error, reload } = useWealthData()
  const setData = useGraphStore((s) => s.setData)
  const setReconFlags = useGraphStore((s) => s.setReconFlags)

  // Push normalized data into the store once the service resolves.
  useEffect(() => {
    if (data) setData(data)
  }, [data, setData])

  // Data-health flags for the map's amber badges (empty unless the backend
  // serves a reconciled data source — a silent no-op otherwise).
  useEffect(() => {
    fetch(`${config.agentBaseUrl}/api/recon-flags`)
      .then((r) => r.json())
      .then((d: { flags?: Record<string, string> }) => setReconFlags(d.flags ?? {}))
      .catch(() => {})
  }, [setReconFlags])

  // Simulated real-time market feed (no-op until data is loaded).
  useMockMarketData()

  return (
    <div className="relative h-full w-full">
      <Background />

      <div className="relative z-10 flex h-full flex-col">
        <TopBar />

        <main className="relative flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {status === 'loading' && <LoadingState key="loading" />}
            {status === 'error' && (
              <ErrorState
                key="error"
                message={error ?? 'Unknown error.'}
                onRetry={reload}
              />
            )}
          </AnimatePresence>

          {status === 'ready' && data && (
            <>
              <PrismScene data={data} />

              {/* Left rail — the "at a glance" hero anchors the composition, with
                  the live safeguards feed stacked beneath it. */}
              <div className="pointer-events-none absolute left-4 top-[74px] z-20 hidden w-[338px] max-w-[86vw] flex-col gap-3 sm:flex">
                <HeroPanel />
                <AgentBoundary>
                  <SafeguardsPanel />
                </AgentBoundary>
              </div>

              <DetailsPanel />
              <AgentBoundary>
                <AgentDock />
              </AgentBoundary>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
