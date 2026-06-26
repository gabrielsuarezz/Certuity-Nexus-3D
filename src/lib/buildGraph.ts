import type { Lineage, WealthData } from '@/types/salesforce'

/** Deterministic edge id so the lineage walker and the graph builders agree. */
export function edgeId(source: string, target: string): string {
  return `e-${source}-${target}`
}

/**
 * Walk the lineage of a leaf account UP through its parent portfolio to the
 * household, collecting the node + edge ids on the path (leaf → root order).
 * Powers the Look-Through Analyzer in both the 2D and 3D views.
 */
export function getLineage(leafAccountId: string, data: WealthData): Lineage {
  const nodeIds = new Set<string>()
  const edgeIds = new Set<string>()

  const account = data.accounts.find((a) => a.Id === leafAccountId)
  if (!account) return { nodeIds, edgeIds }
  nodeIds.add(account.Id)

  const portfolio = data.portfolios.find(
    (p) => p.Id === account.SalenticaLMNTS__Portfolio__c,
  )
  if (portfolio) {
    nodeIds.add(portfolio.Id)
    edgeIds.add(edgeId(portfolio.Id, account.Id))

    if (portfolio.SalenticaLMNTS__Relationship__c === data.household.Id) {
      nodeIds.add(data.household.Id)
      edgeIds.add(edgeId(data.household.Id, portfolio.Id))
    }
  }

  return { nodeIds, edgeIds }
}
