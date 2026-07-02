import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGraphStore } from '@/store/useGraphStore'
import { formatCompactCurrency, formatCurrency } from '@/lib/format'
import type { FinancialAccountRecord } from '@/types/salesforce'

/**
 * The "Portfolio at a glance" hero — the visual and informational anchor of the
 * screen. A large serif total, a live day-change, and an elegant allocation
 * donut by asset class. Reads instantly for a non-technical client and grounds
 * the whole composition so the 3D map is a centerpiece, not a void. Live values
 * flow straight from the market simulation, so the figure and ring tick.
 */

interface Slice {
  key: string
  label: string
  value: number
  color: string
}

// Friendly asset class + warm palette per Salesforce account type.
const CLASS_META: Record<string, { label: string; color: string; order: number }> = {
  'Brokerage': { label: 'Public Markets', color: '#3E5F86', order: 0 },
  'Managed Account': { label: 'Managed', color: '#B58A54', order: 1 },
  'Alternative Investment': { label: 'Alternatives', color: '#C6A15A', order: 2 },
  'Direct Real Estate': { label: 'Real Estate', color: '#BE8354', order: 3 },
  'Custody': { label: 'Cash & Custody', color: '#8A8B84', order: 4 },
}

function classify(a: FinancialAccountRecord) {
  return (
    CLASS_META[a.SalenticaLMNTS__Account_Type__c] ?? {
      label: 'Other',
      color: '#9AA6B2',
      order: 9,
    }
  )
}

export function HeroPanel() {
  const data = useGraphStore((s) => s.data)
  const liveValues = useGraphStore((s) => s.liveValues)
  const liveTotalAum = useGraphStore((s) => s.liveTotalAum)
  const selectNode = useGraphStore((s) => s.selectNode)
  const [open, setOpen] = useState(true)

  const { slices, total, base } = useMemo(() => {
    if (!data) return { slices: [] as Slice[], total: 0, base: 0 }
    const agg = new Map<string, Slice>()
    for (const a of data.accounts) {
      const meta = classify(a)
      const v = liveValues[a.Id] ?? a.SalenticaLMNTS__Market_Value__c
      const cur = agg.get(meta.label)
      if (cur) cur.value += v
      else
        agg.set(meta.label, {
          key: meta.label,
          label: meta.label,
          value: v,
          color: meta.color,
        })
    }
    const slices = [...agg.values()].sort(
      (x, y) => y.value - x.value,
    )
    const total = slices.reduce((s, x) => s + x.value, 0)
    return { slices, total, base: data.household.SalenticaLMNTS__Total_AUM__c }
  }, [data, liveValues])

  if (!data) return null

  const aum = liveTotalAum || data.household.SalenticaLMNTS__Total_AUM__c
  const changePct = base > 0 ? (aum - base) / base : 0
  const up = changePct >= 0
  const top = slices[0]

  return (
    <div className="glass hairline pointer-events-auto overflow-hidden rounded-2xl">
      {/* Household — click to collapse/expand */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 border-b border-ink/10 px-5 pb-3.5 pt-4 text-left"
      >
        <div className="min-w-0">
          <p className="text-[9.5px] font-semibold uppercase tracking-[0.22em] text-ink-faint">
            Family Office
          </p>
          <h2 className="mt-0.5 truncate font-serif text-[19px] font-semibold leading-tight text-ink">
            {data.household.Name}
          </h2>
          {!open && (
            <span className="tnum text-[12px] font-semibold text-gld-deep">
              {formatCompactCurrency(aum)}
            </span>
          )}
        </div>
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-ink/12 text-ink-muted transition hover:bg-ink/5 hover:text-ink"
          aria-hidden
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            style={{ transform: open ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform .25s' }}
          >
            <path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
      {/* Total + change */}
      <div className="px-5 pt-4">
        <p className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
          Total Assets Under Management
        </p>
        <div className="mt-1 flex items-end gap-2.5">
          <span className="tnum font-serif text-[34px] font-semibold leading-none text-gld-deep">
            {formatCompactCurrency(aum)}
          </span>
          <span
            className="mb-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
            style={{
              color: up ? '#2f8f68' : '#c2603f',
              background: up ? 'rgba(47,143,104,0.12)' : 'rgba(194,96,63,0.12)',
            }}
          >
            {up ? '▲' : '▼'} {Math.abs(changePct * 100).toFixed(2)}%
          </span>
        </div>
        <p className="mt-1 text-[11px] text-ink-faint tnum">
          {formatCurrency(aum)} · today
        </p>
      </div>

      {/* Allocation */}
      <div className="mt-4 flex items-center gap-4 border-t border-ink/10 px-5 py-4">
        <Donut slices={slices} total={total} topLabel={top?.label} topPct={top ? top.value / total : 0} />
        <div className="flex-1 space-y-1.5">
          {slices.map((s) => {
            const pct = total > 0 ? s.value / total : 0
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => selectTopHolding(s.key, data, liveValues, selectNode)}
                className="group flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-left transition hover:bg-ink/[0.05]"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                  style={{ background: s.color }}
                />
                <span className="flex-1 truncate text-[11.5px] text-ink">{s.label}</span>
                <span className="tnum text-[11.5px] font-semibold text-ink-muted">
                  {(pct * 100).toFixed(0)}%
                </span>
              </button>
            )
          })}
        </div>
      </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Elegant SVG donut with a warm inner label for the largest allocation. */
function Donut({
  slices,
  total,
  topLabel,
  topPct,
}: {
  slices: Slice[]
  total: number
  topLabel?: string
  topPct: number
}) {
  const size = 108
  const stroke = 14
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const gap = 0.012 * c // small breathing gap between arcs

  let offset = 0
  const arcs = slices.map((s) => {
    const frac = total > 0 ? s.value / total : 0
    const len = Math.max(frac * c - gap, 0)
    const dash = `${len} ${c - len}`
    const el = (
      <circle
        key={s.key}
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={s.color}
        strokeWidth={stroke}
        strokeDasharray={dash}
        strokeDashoffset={-offset}
        strokeLinecap="butt"
      />
    )
    offset += frac * c
    return el
  })

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(34,48,63,0.08)"
          strokeWidth={stroke}
        />
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          {arcs}
        </motion.g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="tnum font-serif text-[20px] font-semibold leading-none text-ink">
          {(topPct * 100).toFixed(0)}%
        </span>
        <span className="mt-0.5 max-w-[70px] text-[8.5px] font-medium uppercase leading-tight tracking-[0.1em] text-ink-faint">
          {topLabel ?? ''}
        </span>
      </div>
    </div>
  )
}

/** Click an allocation row → focus the largest holding of that class on the map. */
function selectTopHolding(
  classLabel: string,
  data: NonNullable<ReturnType<typeof useGraphStore.getState>['data']>,
  liveValues: Record<string, number>,
  selectNode: (id: string) => void,
) {
  let bestId: string | null = null
  let best = -1
  for (const a of data.accounts) {
    if (classify(a).label !== classLabel) continue
    const v = liveValues[a.Id] ?? a.SalenticaLMNTS__Market_Value__c
    if (v > best) {
      best = v
      bestId = a.Id
    }
  }
  if (bestId) selectNode(bestId)
}
