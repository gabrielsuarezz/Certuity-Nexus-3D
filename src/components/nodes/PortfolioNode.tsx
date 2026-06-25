import type { NodeProps } from '@xyflow/react'
import { NodeShell } from './NodeShell'
import { IconBadge, PortfolioGlyph } from './glyphs'
import { useNodeStates } from '@/hooks/useNodeStates'
import { formatCompactCurrency } from '@/lib/format'
import type { PortfolioRecord, WealthNode } from '@/types/salesforce'

export function PortfolioNode({ id, data }: NodeProps<WealthNode>) {
  const states = useNodeStates(id)
  const record = data.record as PortfolioRecord

  return (
    <NodeShell kind="portfolio" {...states} className="w-[200px] px-4 pb-3 pt-3.5">
      <div className="flex items-start gap-2.5">
        <IconBadge tone="emerald">
          <PortfolioGlyph entityType={record.SalenticaLMNTS__Entity_Type__c} />
        </IconBadge>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-semibold leading-tight text-ink">
            {data.label}
          </p>
          <p className="mt-0.5 truncate text-[10px] font-medium text-emr-bright/90">
            {data.subtitle}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between border-t border-white/[0.06] pt-2">
        <span className="text-[9px] uppercase tracking-[0.14em] text-ink-faint">
          {record.SalenticaLMNTS__Jurisdiction__c}
        </span>
        <span className="tnum text-[15px] font-bold leading-none text-ink">
          {formatCompactCurrency(data.aum)}
        </span>
      </div>
    </NodeShell>
  )
}
