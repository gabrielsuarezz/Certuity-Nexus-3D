import { useGraphStore } from '@/store/useGraphStore'

const CATEGORY: Record<string, string> = {
  'real estate': 'Direct Real Estate',
  property: 'Direct Real Estate',
  properties: 'Direct Real Estate',
  alternative: 'Alternative Investment',
  alternatives: 'Alternative Investment',
  alts: 'Alternative Investment',
  'private equity': 'Alternative Investment',
  brokerage: 'Brokerage',
  stocks: 'Brokerage',
  managed: 'Managed Account',
  custody: 'Custody',
}

/** Resolve a spoken name/category to a 3D-map node id (reusing store data). */
export function resolveHolding(query: string, opts?: { accountsOnly?: boolean }): string | null {
  const data = useGraphStore.getState().data
  if (!data) return null
  const q = query.toLowerCase().trim()
  if (!q) return null

  const matchName = (name: string) => {
    const n = name.toLowerCase()
    return n.includes(q) || q.includes(n) || n.split(/\s+/).some((w) => w.length > 2 && q.includes(w))
  }

  const acc = data.accounts.find((a) => matchName(a.Name))
  if (acc) return acc.Id

  if (!opts?.accountsOnly) {
    const ent = data.portfolios.find((p) => matchName(p.Name))
    if (ent) return ent.Id
  }

  for (const [word, category] of Object.entries(CATEGORY)) {
    if (q.includes(word)) {
      const matches = data.accounts.filter(
        (a) => a.SalenticaLMNTS__Account_Type__c === category,
      )
      if (matches.length) {
        return matches.reduce((best, a) =>
          a.SalenticaLMNTS__Market_Value__c > best.SalenticaLMNTS__Market_Value__c ? a : best,
        ).Id
      }
    }
  }
  return null
}
