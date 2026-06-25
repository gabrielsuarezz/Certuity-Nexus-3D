import type { NodeProps } from '@xyflow/react'
import { NodeShell } from './NodeShell'
import { IconBadge, AccountGlyph } from './glyphs'
import { useNodeStates } from '@/hooks/useNodeStates'
import { formatCompactCurrency } from '@/lib/format'
import type { FinancialAccountRecord, WealthNode } from '@/types/salesforce'

export function AccountNode({ id, data }: NodeProps<WealthNode>) {
  const states = useNodeStates(id)
  const record = data.record as FinancialAccountRecord
  const isAlt = data.isAlternative

  return (
    <NodeShell
      kind="account"
      isAlt={isAlt}
      {...states}
      className="w-[186px] px-3.5 pb-3 pt-3"
    >
      {isAlt && (
        <span
          className="absolute -right-1.5 -top-1.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[#0a0f0d]"
          style={{
            background: 'linear-gradient(120deg, #F5D58A, #D4AF37)',
            boxShadow: '0 0 12px -2px rgba(212,175,55,0.7)',
          }}
        >
          Alt
        </span>
      )}

      <div className="flex items-center gap-2.5">
        <IconBadge tone={isAlt ? 'gold' : 'slate'}>
          <AccountGlyph accountType={record.SalenticaLMNTS__Account_Type__c} />
        </IconBadge>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold leading-tight text-ink">
            {data.label}
          </p>
          <p className="mt-0.5 truncate text-[9.5px] text-ink-muted">
            {record.SalenticaLMNTS__Custodian__c}
          </p>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span
          className="truncate rounded-full px-2 py-0.5 text-[8.5px] font-medium uppercase tracking-wide"
          style={{
            background: isAlt ? 'rgba(212,175,55,0.14)' : 'rgba(255,255,255,0.05)',
            color: isAlt ? '#F5D58A' : 'var(--ink-muted)',
          }}
        >
          {data.subtitle}
        </span>
        <span className="tnum shrink-0 text-[13px] font-bold text-ink">
          {formatCompactCurrency(data.aum)}
        </span>
      </div>
    </NodeShell>
  )
}
