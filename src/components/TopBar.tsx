import { motion } from 'framer-motion'
import { useGraphStore } from '@/store/useGraphStore'
import { formatCompactCurrency } from '@/lib/format'

export function TopBar() {
  const lookThrough = useGraphStore((s) => s.lookThrough)
  const toggleLookThrough = useGraphStore((s) => s.toggleLookThrough)
  const household = useGraphStore((s) => s.data?.household ?? null)

  return (
    <header className="relative z-30 flex items-center justify-between gap-4 border-b border-white/[0.06] bg-black/20 px-6 py-3.5 backdrop-blur-md">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <BrandMark />
        <div className="leading-tight">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight text-ink">
              Interactive{' '}
              <span className="font-serif font-medium text-gld-bright">
                Wealth Graph
              </span>
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.14em] text-ink-faint">
              Demo data
            </span>
          </div>
          <p className="text-[11px] text-ink-faint">
            Family-office wealth structure
          </p>
        </div>
      </div>

      {/* Center readout */}
      {household && (
        <div className="hidden items-center gap-6 lg:flex">
          <Readout label="Household" value={household.Name} />
          <span className="h-8 w-px bg-white/10" />
          <Readout
            label="Total AUM"
            value={formatCompactCurrency(
              household.SalenticaLMNTS__Total_AUM__c,
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
                style={{ boxShadow: '0 0 10px 1px rgba(52,211,153,0.8)' }}
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
        className={`tnum text-sm font-semibold ${
          accent ? 'text-gld-bright text-glow-gold' : 'text-ink'
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
        borderColor: active ? 'rgba(52,211,153,0.6)' : 'rgba(255,255,255,0.12)',
        background: active
          ? 'linear-gradient(90deg, rgba(11,122,87,0.6), rgba(16,185,129,0.5))'
          : 'rgba(255,255,255,0.05)',
        boxShadow: active ? '0 0 18px -2px rgba(16,185,129,0.6)' : 'none',
      }}
    >
      <motion.span
        className="absolute top-1/2 h-5 w-5 rounded-full"
        animate={{ x: active ? 22 : 3 }}
        transition={{ type: 'spring', stiffness: 520, damping: 32 }}
        style={{
          translateY: '-50%',
          background: active
            ? 'radial-gradient(circle at 35% 30%, #ffffff, var(--emerald-bright))'
            : 'radial-gradient(circle at 35% 30%, #ffffff, #9aa8a2)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
        }}
      />
    </button>
  )
}

function BrandMark() {
  return (
    <div
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10"
      style={{ background: 'linear-gradient(160deg, #12201b, #0a0f0d)' }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="7" r="3.2" fill="url(#bm-g)" />
        <circle cx="5.5" cy="17.5" r="2.1" fill="#D4AF37" />
        <circle cx="18.5" cy="17.5" r="2.1" fill="#D4AF37" />
        <path
          d="M12 10.2 6 16M12 10.2 18 16"
          stroke="#2c3d35"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <defs>
          <radialGradient id="bm-g" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#0B7A57" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  )
}
