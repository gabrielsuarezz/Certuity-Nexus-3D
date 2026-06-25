import type {
  GraphNodeData,
  Lineage,
  WealthData,
  WealthEdge,
  WealthNode,
} from '@/types/salesforce'

/** Deterministic edge id so the lineage walker and the builder agree. */
export function edgeId(source: string, target: string): string {
  return `e-${source}-${target}`
}

/** Seed positions in a radial "orbit" so the first paint isn't degenerate. */
function radial(angle: number, radius: number): { x: number; y: number } {
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
}

const INNER_RADIUS = 300
const OUTER_RADIUS = 560

/**
 * Transform normalized WealthData into React Flow nodes + edges by following the
 * Salesforce lookup fields. The d3-force simulation (useForceLayout) takes over
 * positioning after first paint; these seeds just avoid a NaN/origin explosion.
 */
export function buildGraph(data: WealthData): {
  nodes: WealthNode[]
  edges: WealthEdge[]
} {
  const nodes: WealthNode[] = []
  const edges: WealthEdge[] = []

  const { household, portfolios, accounts } = data

  // Root household at the center.
  nodes.push({
    id: household.Id,
    type: 'household',
    position: { x: 0, y: 0 },
    data: {
      kind: 'household',
      label: household.Name,
      aum: household.SalenticaLMNTS__Total_AUM__c,
      subtitle: household.SalenticaLMNTS__Relationship_Type__c,
      isAlternative: false,
      record: household,
    } satisfies GraphNodeData,
  })

  portfolios.forEach((portfolio, pIndex) => {
    const angle = (pIndex / Math.max(portfolios.length, 1)) * Math.PI * 2 - Math.PI / 2
    nodes.push({
      id: portfolio.Id,
      type: 'portfolio',
      position: radial(angle, INNER_RADIUS),
      data: {
        kind: 'portfolio',
        label: portfolio.Name,
        aum: portfolio.SalenticaLMNTS__AUM__c,
        subtitle: portfolio.SalenticaLMNTS__Entity_Type__c,
        isAlternative: false,
        record: portfolio,
      } satisfies GraphNodeData,
    })

    // household → portfolio
    if (portfolio.SalenticaLMNTS__Relationship__c === household.Id) {
      edges.push({
        id: edgeId(household.Id, portfolio.Id),
        source: household.Id,
        target: portfolio.Id,
        type: 'glow',
      })
    }

    // Accounts belonging to this portfolio, fanned around its angle.
    const children = accounts.filter(
      (a) => a.SalenticaLMNTS__Portfolio__c === portfolio.Id,
    )
    children.forEach((account, aIndex) => {
      const spread = (aIndex - (children.length - 1) / 2) * 0.42
      nodes.push({
        id: account.Id,
        type: 'account',
        position: radial(angle + spread, OUTER_RADIUS),
        data: {
          kind: 'account',
          label: account.Name,
          aum: account.SalenticaLMNTS__Market_Value__c,
          subtitle: account.SalenticaLMNTS__Account_Type__c,
          isAlternative:
            account.SalenticaLMNTS__Account_Type__c === 'Alternative Investment',
          record: account,
        } satisfies GraphNodeData,
      })

      // portfolio → account
      edges.push({
        id: edgeId(portfolio.Id, account.Id),
        source: portfolio.Id,
        target: account.Id,
        type: 'glow',
      })
    })
  })

  return { nodes, edges }
}

/**
 * Walk the lineage of a leaf account UP through its parent portfolio to the
 * household, collecting the node + edge ids on the path. Powers the
 * Look-Through Analyzer.
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
