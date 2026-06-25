import type { NodeProps } from '@xyflow/react'
import { NodeShell } from './NodeShell'
import { IconBadge, HouseholdGlyph } from './glyphs'
import { useNodeStates } from '@/hooks/useNodeStates'
import { formatCompactCurrency } from '@/lib/format'
import type { RelationshipRecord, WealthNode } from '@/types/salesforce'

export function HouseholdNode({ id, data }: NodeProps<WealthNode>) {
  const states = useNodeStates(id)
  const record = data.record as RelationshipRecord

  return (
    <NodeShell kind="household" {...states} className="w-[236px] px-5 pb-4 pt-4">
      {/* Top gold accent line */}
      <div
        className="absolute inset-x-5 top-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(245,213,138,0.7), transparent)',
        }}
      />

      <div className="flex items-center gap-3">
        <IconBadge tone="gold" size="lg">
          <HouseholdGlyph />
        </IconBadge>
        <div className="min-w-0">
          <p className="text-[9.5px] font-medium uppercase tracking-[0.18em] text-gld/90">
            {data.subtitle}
          </p>
          <p className="truncate text-[14px] font-semibold leading-tight text-ink">
            {data.label}
          </p>
        </div>
      </div>

      <div className="mt-3.5 border-t border-white/[0.07] pt-2.5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-[0.16em] text-ink-faint">
              Total AUM
            </p>
            <p className="tnum text-[22px] font-bold leading-none text-gld-bright text-glow-gold">
              {formatCompactCurrency(data.aum)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-[0.16em] text-ink-faint">
              Advisor
            </p>
            <p className="text-[11px] font-medium text-ink-muted">
              {record.SalenticaLMNTS__Primary_Advisor__c}
            </p>
          </div>
        </div>
      </div>
    </NodeShell>
  )
}
