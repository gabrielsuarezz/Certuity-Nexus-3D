import { useEffect, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGraphStore } from '@/store/useGraphStore'
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatPercent,
} from '@/lib/format'
import type {
  FinancialAccountRecord,
  NodeKind,
  PortfolioRecord,
  RelationshipRecord,
  WealthData,
  WealthRecord,
} from '@/types/salesforce'

function kindOf(record: WealthRecord): NodeKind {
  const type = record.attributes.type
  if (type === 'SalenticaLMNTS__Portfolio__c') return 'portfolio'
  if (type === 'SalenticaLMNTS__FinancialAccount__c') return 'account'
  return 'household'
}

// Tints are used for TEXT and accents on a light paper field, so they are
// deep enough to read: gold for the office, navy for entities, slate for
// accounts (alts borrow the gold).
const KIND_META: Record<NodeKind, { label: string; tint: string }> = {
  household: { label: 'Family Office', tint: '#7A5E2A' },
  portfolio: { label: 'Legal Entity', tint: '#2E5788' },
  account: { label: 'Financial Account', tint: '#3B4A5A' },
}

export function DetailsPanel() {
  const selectedId = useGraphStore((s) => s.selectedId)
  const getRecord = useGraphStore((s) => s.getRecord)
  const data = useGraphStore((s) => s.data)
  const clearSelection = useGraphStore((s) => s.clearSelection)

  const record = getRecord(selectedId)

  useEffect(() => {
    if (!record) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clearSelection()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [record, clearSelection])

  return (
    <AnimatePresence>
      {record && data && (
        <motion.aside
          initial={{ x: '105%' }}
          animate={{ x: 0 }}
          exit={{ x: '105%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 34 }}
          className="absolute right-0 top-0 z-20 flex h-full w-[400px] max-w-[88vw] flex-col border-l border-ink/10 bg-paper/90 backdrop-blur-2xl"
          style={{ boxShadow: '-30px 0 80px -40px rgba(72,58,30,0.45)' }}
        >
          <PanelHeader record={record} onClose={clearSelection} />
          <div className="scroll-slim flex-1 overflow-y-auto px-5 pb-8 pt-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={record.Id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
              >
                <PanelBody record={record} data={data} />
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

function PanelHeader({
  record,
  onClose,
}: {
  record: WealthRecord
  onClose: () => void
}) {
  const kind = kindOf(record)
  const meta = KIND_META[kind]
  return (
    <div className="relative border-b border-ink/10 px-5 pb-4 pt-5">
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${meta.tint}88, transparent)`,
        }}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ background: `${meta.tint}1a`, color: meta.tint }}
          >
            {meta.label}
          </span>
          <h2 className="mt-2 font-serif text-xl font-semibold leading-tight text-ink">
            {record.Name}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink/15 text-ink-muted transition hover:bg-ink/5 hover:text-ink"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M6 6l12 12M18 6 6 18"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

function PanelBody({ record, data }: { record: WealthRecord; data: WealthData }) {
  const kind = kindOf(record)
  if (kind === 'household') {
    return <HouseholdBody record={record as RelationshipRecord} data={data} />
  }
  if (kind === 'portfolio') {
    return <PortfolioBody record={record as PortfolioRecord} data={data} />
  }
  return <AccountBody record={record as FinancialAccountRecord} data={data} />
}

// ── Bodies ───────────────────────────────────────────────────────────────────
function HouseholdBody({
  record,
  data,
}: {
  record: RelationshipRecord
  data: WealthData
}) {
  return (
    <>
      <AmountHero
        label="Total Assets Under Management"
        amount={record.SalenticaLMNTS__Total_AUM__c}
        tint="#7A5E2A"
      />
      <StatRow
        items={[
          { label: 'Entities', value: String(data.portfolios.length) },
          { label: 'Accounts', value: String(data.accounts.length) },
        ]}
      />
      <Section title="Profile">
        <Field label="Structure" value={record.SalenticaLMNTS__Relationship_Type__c} />
        <Field label="Primary Advisor" value={record.SalenticaLMNTS__Primary_Advisor__c} />
        <Field label="Risk Profile" value={record.SalenticaLMNTS__Risk_Profile__c} />
        <Field label="Reporting Currency" value={record.SalenticaLMNTS__Reporting_Currency__c} />
        <Field label="Inception" value={formatDate(record.SalenticaLMNTS__Inception_Date__c)} />
      </Section>
      <SourceChip record={record} />
    </>
  )
}

function PortfolioBody({
  record,
  data,
}: {
  record: PortfolioRecord
  data: WealthData
}) {
  const children = data.accounts.filter(
    (a) => a.SalenticaLMNTS__Portfolio__c === record.Id,
  )
  const share = record.SalenticaLMNTS__AUM__c / data.household.SalenticaLMNTS__Total_AUM__c

  return (
    <>
      <AmountHero
        label="Assets Under Management"
        amount={record.SalenticaLMNTS__AUM__c}
        tint="#2E5788"
      />
      <ShareBar label="Share of household" value={share} tint="#2E5788" />
      <Section title="Entity">
        <Field label="Type" value={record.SalenticaLMNTS__Entity_Type__c} />
        <Field label="Jurisdiction" value={record.SalenticaLMNTS__Jurisdiction__c} />
        <Field label="Tax ID" value={record.SalenticaLMNTS__Tax_ID_Masked__c} mono />
        <Field label="Formed" value={formatDate(record.SalenticaLMNTS__Formation_Date__c)} />
      </Section>
      <Section title="Beneficiaries">
        <Beneficiaries value={record.SalenticaLMNTS__Beneficiaries__c} />
      </Section>
      <Section title={`Accounts (${children.length})`}>
        <div className="flex flex-col gap-1.5">
          {children.map((a) => (
            <MiniRow
              key={a.Id}
              name={a.Name}
              meta={a.SalenticaLMNTS__Custodian__c}
              amount={a.SalenticaLMNTS__Market_Value__c}
              alt={a.SalenticaLMNTS__Account_Type__c === 'Alternative Investment'}
            />
          ))}
        </div>
      </Section>
      <SourceChip record={record} />
    </>
  )
}

function AccountBody({
  record,
  data,
}: {
  record: FinancialAccountRecord
  data: WealthData
}) {
  const portfolio = data.portfolios.find(
    (p) => p.Id === record.SalenticaLMNTS__Portfolio__c,
  )
  const share = portfolio
    ? record.SalenticaLMNTS__Market_Value__c / portfolio.SalenticaLMNTS__AUM__c
    : 0
  const isAlt = record.SalenticaLMNTS__Account_Type__c === 'Alternative Investment'

  return (
    <>
      <AmountHero
        label="Market Value"
        amount={record.SalenticaLMNTS__Market_Value__c}
        tint={isAlt ? '#7A5E2A' : '#3B4A5A'}
      />
      {portfolio && (
        <ShareBar
          label={`Share of ${portfolio.Name}`}
          value={share}
          tint={isAlt ? '#7A5E2A' : '#2E5788'}
        />
      )}
      <Section title="Account">
        <Field label="Type" value={record.SalenticaLMNTS__Account_Type__c} />
        <Field label="Custodian" value={record.SalenticaLMNTS__Custodian__c} />
        <Field label="Account #" value={record.SalenticaLMNTS__Account_Number__c} mono />
        <Field label="Liquidity" value={record.SalenticaLMNTS__Liquidity__c} />
        <Field label="As of" value={formatDate(record.SalenticaLMNTS__As_Of_Date__c)} />
      </Section>
      <Section title="Ownership Lineage">
        <Lineage
          account={record.Name}
          portfolio={portfolio?.Name ?? '—'}
          household={data.household.Name}
        />
      </Section>
      <SourceChip record={record} />
    </>
  )
}

// ── Building blocks ──────────────────────────────────────────────────────────
function AmountHero({
  label,
  amount,
  tint,
}: {
  label: string
  amount: number
  tint: string
}) {
  return (
    <div className="mb-5">
      <p className="text-[10px] uppercase tracking-[0.16em] text-ink-faint">
        {label}
      </p>
      <p
        className="tnum mt-1.5 font-serif text-[38px] font-semibold leading-none"
        style={{ color: tint }}
      >
        {formatCurrency(amount)}
      </p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
        {title}
      </h3>
      <div className="rounded-xl border border-ink/10 bg-white/60 p-3.5">
        {children}
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 first:pt-0 last:pb-0">
      <span className="shrink-0 text-[13px] text-ink-muted">{label}</span>
      <span
        className={`text-right text-[13.5px] font-medium text-ink ${
          mono ? 'font-mono tnum' : ''
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function StatRow({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-3">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-xl border border-ink/10 bg-white/60 px-3 py-2.5"
        >
          <p className="tnum text-xl font-bold text-ink">{it.value}</p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            {it.label}
          </p>
        </div>
      ))}
    </div>
  )
}

function ShareBar({
  label,
  value,
  tint,
}: {
  label: string
  value: number
  tint: string
}) {
  return (
    <div className="mb-5">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] text-ink-muted">{label}</span>
        <span className="tnum text-[11px] font-semibold" style={{ color: tint }}>
          {formatPercent(value)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-ink/10">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(value * 100, 100)}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ background: tint }}
        />
      </div>
    </div>
  )
}

function Beneficiaries({ value }: { value: string }) {
  const list = value
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((b) => (
        <span
          key={b}
          className="rounded-full border border-ink/10 bg-white/60 px-2.5 py-1 text-[11.5px] text-ink"
        >
          {b}
        </span>
      ))}
    </div>
  )
}

function MiniRow({
  name,
  meta,
  amount,
  alt,
}: {
  name: string
  meta: string
  amount: number
  alt?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg px-1 py-1">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[12px] font-medium text-ink">{name}</p>
          {alt && (
            <span className="rounded px-1 text-[8px] font-bold uppercase text-gld-bright">
              Alt
            </span>
          )}
        </div>
        <p className="truncate text-[10px] text-ink-faint">{meta}</p>
      </div>
      <span className="tnum shrink-0 text-[12px] font-semibold text-ink-muted">
        {formatCompactCurrency(amount)}
      </span>
    </div>
  )
}

function Lineage({
  account,
  portfolio,
  household,
}: {
  account: string
  portfolio: string
  household: string
}) {
  const steps = [
    { name: account, tint: '#C7D4E2' },
    { name: portfolio, tint: '#8FB6DA' },
    { name: household, tint: '#E2C88C' },
  ]
  return (
    <div className="flex flex-col gap-0">
      {steps.map((s, i) => (
        <div key={s.name + i} className="flex items-center gap-3">
          <div className="flex flex-col items-center self-stretch">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: s.tint, boxShadow: `0 0 10px ${s.tint}` }}
            />
            {i < steps.length - 1 && (
              <span className="my-0.5 w-px flex-1 bg-gradient-to-b from-ink/25 to-ink/5" />
            )}
          </div>
          <span className="py-0.5 text-[12.5px] font-medium text-ink">
            {s.name}
          </span>
        </div>
      ))}
    </div>
  )
}

function SourceChip({ record }: { record: WealthRecord }) {
  return (
    <div className="mt-2 flex items-center gap-2 border-t border-ink/10 pt-4">
      <span className="text-[9px] uppercase tracking-[0.14em] text-ink-faint">
        Source
      </span>
      <code className="truncate rounded-md border border-ink/10 bg-white/60 px-2 py-1 font-mono text-[10px] text-emr-deep">
        {record.attributes.type}
      </code>
    </div>
  )
}
