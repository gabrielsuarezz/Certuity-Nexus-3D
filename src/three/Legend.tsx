import { useMemo } from 'react'
import clsx from 'clsx'
import { buildGraph3D, type ModelType } from '@/lib/buildGraph3D'
import { useGraphStore } from '@/store/useGraphStore'

const NAVY = '#0b1e36'

function Office({ c }: { c: string }) {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill={c} aria-hidden>
      <polygon points="8,1.5 14.5,5 1.5,5" />
      <rect x="2.6" y="5.6" width="1.4" height="6.4" />
      <rect x="5.5" y="5.6" width="1.4" height="6.4" />
      <rect x="9.1" y="5.6" width="1.4" height="6.4" />
      <rect x="12" y="5.6" width="1.4" height="6.4" />
      <rect x="1.5" y="12.4" width="13" height="1.7" />
    </svg>
  )
}
function Shield({ c }: { c: string }) {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill={c} aria-hidden>
      <path d="M8 1 L14 3 V8 C14 12 8 15 8 15 C8 15 2 12 2 8 V3 Z" />
      <path d="M7.2 4.8 H8.8 V7.2 H11.2 V8.8 H8.8 V11.2 H7.2 V8.8 H4.8 V7.2 H7.2 Z" fill={NAVY} />
    </svg>
  )
}
function Tower({ c }: { c: string }) {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill={c} aria-hidden>
      <rect x="5" y="3.5" width="6" height="10.5" />
      <rect x="6.4" y="1.4" width="3.2" height="2.4" />
      <rect x="5.6" y="0.4" width="0.8" height="1.2" />
    </svg>
  )
}
function Stacked({ c }: { c: string }) {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill={c} aria-hidden>
      <rect x="2.5" y="9.5" width="11" height="2.6" />
      <rect x="3.8" y="6.4" width="8.4" height="2.6" />
      <rect x="5.2" y="3.3" width="5.6" height="2.6" />
    </svg>
  )
}
function Bars({ c }: { c: string }) {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill={c} aria-hidden>
      <rect x="2.6" y="9" width="2.7" height="5" />
      <rect x="6.6" y="6" width="2.7" height="8" />
      <rect x="10.6" y="2.8" width="2.7" height="11.2" />
    </svg>
  )
}
function Gem({ c }: { c: string }) {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill={c} aria-hidden>
      <polygon points="8,2 13.2,6.4 8,14.2 2.8,6.4" />
      <polyline points="2.8,6.4 13.2,6.4" stroke={NAVY} strokeWidth="0.7" fill="none" />
      <polyline points="5.4,6.4 8,14.2 10.6,6.4" stroke={NAVY} strokeWidth="0.7" fill="none" />
    </svg>
  )
}
function Coins({ c }: { c: string }) {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill={c} aria-hidden>
      <ellipse cx="8" cy="11.2" rx="5.2" ry="1.7" />
      <ellipse cx="8" cy="8.4" rx="5.2" ry="1.7" />
      <ellipse cx="8" cy="5.6" rx="5.2" ry="1.7" />
    </svg>
  )
}
function Vault({ c }: { c: string }) {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill={c} aria-hidden>
      <rect x="2" y="2" width="12" height="12" rx="1.6" />
      <circle cx="8" cy="8" r="3.4" fill={NAVY} />
      <circle cx="8" cy="8" r="1" fill={c} />
    </svg>
  )
}
function House({ c }: { c: string }) {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill={c} aria-hidden>
      <polygon points="8,1.5 14.5,7 1.5,7" />
      <rect x="3.4" y="7" width="9.2" height="7" />
      <rect x="6.8" y="9.6" width="2.4" height="4.4" fill={NAVY} />
    </svg>
  )
}

const ITEMS: {
  type: ModelType
  label: string
  color: string
  Glyph: (p: { c: string }) => JSX.Element
}[] = [
  { type: 'office', label: 'Family Office', color: '#B98F3F', Glyph: Office },
  { type: 'trust', label: 'Trust', color: '#A97E44', Glyph: Shield },
  { type: 'llc', label: 'LLC', color: '#3E5F86', Glyph: Tower },
  { type: 'holding', label: 'Holding Co.', color: '#5D7590', Glyph: Stacked },
  { type: 'brokerage', label: 'Brokerage', color: '#3E7E68', Glyph: Bars },
  { type: 'alternative', label: 'Alternatives', color: '#B79552', Glyph: Gem },
  { type: 'managed', label: 'Managed', color: '#C29A45', Glyph: Coins },
  { type: 'custody', label: 'Custody', color: '#7E7F76', Glyph: Vault },
  { type: 'real_estate', label: 'Real Estate', color: '#BE8354', Glyph: House },
]

/**
 * The shape key. Each row is clickable and selects a representative holding of
 * that type (the highest-value one) — same result as clicking the 3D icon.
 */
export function Legend() {
  const data = useGraphStore((s) => s.data)
  const selectNode = useGraphStore((s) => s.selectNode)
  const selectedId = useGraphStore((s) => s.selectedId)

  // modelType → highest-value node of that type.
  const byType = useMemo(() => {
    const map: Partial<Record<ModelType, { id: string; value: number }>> = {}
    if (!data) return map
    for (const n of buildGraph3D(data).nodes) {
      const cur = map[n.modelType]
      if (!cur || n.baseValue > cur.value) {
        map[n.modelType] = { id: n.id, value: n.baseValue }
      }
    }
    return map
  }, [data])

  return (
    <div className="glass hairline absolute bottom-4 right-4 z-10 rounded-xl px-3 py-3">
      <p className="mb-2 px-1 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-faint">
        Key — click to inspect
      </p>
      <div className="grid grid-cols-1 gap-x-3 gap-y-0.5 sm:grid-cols-2">
        {ITEMS.map(({ type, label, color, Glyph }) => {
          const entry = byType[type]
          const isSelected = !!entry && entry.id === selectedId
          return (
            <button
              key={label}
              type="button"
              disabled={!entry}
              onClick={() => entry && selectNode(entry.id)}
              className={clsx(
                'flex items-center gap-2 rounded-md px-1.5 py-1 text-left transition',
                entry ? 'cursor-pointer hover:bg-ink/[0.06]' : 'opacity-50',
                isSelected && 'bg-ink/[0.09]',
              )}
            >
              <Glyph c={color} />
              <span className="text-[11.5px] text-ink">{label}</span>
            </button>
          )
        })}
      </div>
      <p className="mt-2.5 flex items-center gap-1.5 border-t border-ink/10 px-1 pt-2 text-[10px] text-ink-faint">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#2f8f68]" />
        Live feed · bigger = greater value
      </p>
    </div>
  )
}
