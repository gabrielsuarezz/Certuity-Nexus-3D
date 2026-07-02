import { motion } from 'framer-motion'
import { useGraphStore } from '@/store/useGraphStore'
import { formatCompactCurrency } from '@/lib/format'

export function TopBar() {
  const lookThrough = useGraphStore((s) => s.lookThrough)
  const toggleLookThrough = useGraphStore((s) => s.toggleLookThrough)
  const household = useGraphStore((s) => s.data?.household ?? null)
  const liveTotalAum = useGraphStore((s) => s.liveTotalAum)

  return (
    <header className="relative z-30 flex items-center justify-between gap-4 border-b border-ink/10 bg-white/55 px-6 py-3.5 shadow-[0_10px_30px_-24px_rgba(72,58,30,0.5)] backdrop-blur-md">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <BrandMark />
        <div className="leading-tight">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold uppercase tracking-[0.3em] text-ink">
              Certuity
            </span>
            <span className="rounded-full border border-ink/10 bg-white/60 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.14em] text-ink-muted">
              Demo data
            </span>
          </div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-ink-faint">
            Certainty · Ingenuity
          </p>
        </div>
      </div>

      {/* Center readout */}
      {household && (
        <div className="hidden items-center gap-6 lg:flex">
          <Readout label="Household" value={household.Name} />
          <span className="h-8 w-px bg-ink/15" />
          <Readout
            label="Total AUM"
            value={formatCompactCurrency(
              liveTotalAum || household.SalenticaLMNTS__Total_AUM__c,
            )}
            accent
          />
        </div>
      )}

      {/* Look-Through Analyzer toggle */}
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <div className="flex items-center justify-end gap-1.5 text-xs font-medium text-ink">
            Look-Through Analyzer
            {lookThrough && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="h-1.5 w-1.5 rounded-full bg-emr-bright"
                style={{ boxShadow: '0 0 8px 1px rgba(61,109,166,0.7)' }}
              />
            )}
          </div>
          <p className="text-[10px] text-ink-faint">
            {lookThrough ? 'Select an account to trace lineage' : 'Reveal entity lineage'}
          </p>
        </div>
        <AnalyzerSwitch active={lookThrough} onToggle={toggleLookThrough} />
      </div>
    </header>
  )
}

function Readout({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
        {label}
      </p>
      <p
        className={`tnum font-semibold ${
          accent
            ? 'font-serif text-[17px] leading-none text-gld-deep'
            : 'text-sm text-ink'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function AnalyzerSwitch({
  active,
  onToggle,
}: {
  active: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label="Toggle Look-Through Analyzer"
      onClick={onToggle}
      className="relative h-7 w-12 rounded-full border transition-colors duration-300"
      style={{
        borderColor: active ? 'rgba(46,87,136,0.55)' : 'rgba(34,48,63,0.2)',
        background: active
          ? 'linear-gradient(90deg, rgba(29,58,94,0.9), rgba(46,87,136,0.85))'
          : 'rgba(34,48,63,0.08)',
        boxShadow: active ? '0 2px 10px -2px rgba(46,87,136,0.5)' : 'none',
      }}
    >
      <motion.span
        className="pointer-events-none absolute left-0 h-5 w-5 rounded-full"
        initial={false}
        animate={{ x: active ? 23 : 3 }}
        transition={{ type: 'spring', stiffness: 520, damping: 32 }}
        style={{
          top: 3,
          background: active
            ? 'radial-gradient(circle at 35% 30%, #ffffff, var(--emerald-bright))'
            : 'radial-gradient(circle at 35% 30%, #ffffff, #c7ccc8)',
          boxShadow: '0 1px 4px rgba(72,58,30,0.35)',
        }}
      />
    </button>
  )
}

function BrandMark() {
  return (
    <div
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink/10 shadow-[0_6px_16px_-8px_rgba(29,58,94,0.6)]"
      style={{ background: 'linear-gradient(160deg, #2E5788, #1D3A5E)' }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 5V19M5 12H19" stroke="#E2C88C" strokeWidth="3.4" strokeLinecap="round" />
      </svg>
    </div>
  )
}
