import { useAgentStore, type Scenario } from './agentStore'

/** Before → after projection for a what-if scenario (commit capital / sell a
 *  holding). Read-only: it makes clear nothing has actually changed. */

const DIR_COLOR: Record<string, string> = { up: '#46d39a', down: '#e5917c', flat: '#8aa0b4' }

export function ScenarioCard({ scenario }: { scenario: Scenario }) {
  const setScenario = useAgentStore((s) => s.setScenario)

  return (
    <div className="rounded-2xl border border-gld/25 bg-gld/[0.06] p-3">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-md"
            style={{ background: 'linear-gradient(160deg, #3a2d12, #241a08)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 18l5-5 3 3 7-7M21 9v4M21 9h-4" stroke="#C99B6A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <p className="text-[12px] font-semibold text-ink">{scenario.title}</p>
        </div>
        <button
          type="button"
          onClick={() => setScenario(null)}
          aria-label="Dismiss scenario"
          className="text-[14px] leading-none text-ink-faint transition hover:text-ink"
        >
          ×
        </button>
      </div>

      <p className="mb-2 text-[11px] leading-snug text-ink-muted">{scenario.summary}</p>

      <div className="space-y-1">
        {scenario.metrics.map((m, i) => (
          <div key={i} className="flex items-center justify-between text-[11.5px]">
            <span className="text-ink-muted">{m.label}</span>
            <span className="flex items-center gap-1.5 tabular-nums">
              <span className="text-ink-faint">{m.before}</span>
              <span className="text-ink-faint">→</span>
              <span className="font-medium" style={{ color: DIR_COLOR[m.dir] ?? '#8aa0b4' }}>
                {m.after}
              </span>
            </span>
          </div>
        ))}
      </div>

      <p className="mt-2 text-[10px] text-ink-faint">Hypothetical — nothing has changed.</p>
    </div>
  )
}
