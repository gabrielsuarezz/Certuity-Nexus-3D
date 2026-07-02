import type { NodeKind, WealthData } from '@/types/salesforce'

/** Recognizable icon families, mapped from the Salesforce type fields. */
export type ModelType =
  | 'office'
  | 'trust'
  | 'llc'
  | 'holding'
  | 'brokerage'
  | 'alternative'
  | 'managed'
  | 'custody'
  | 'real_estate'

export interface Graph3DNode {
  id: string
  kind: NodeKind
  modelType: ModelType
  label: string
  isAlt: boolean
  baseValue: number
  x: number
  y: number
  z: number
}

export interface Graph3DLink {
  source: string
  target: string
}

// Spacing sized so labels never collide: up to 3 accounts per entity means an
// entity's account span is 2·ACCOUNT_SPACING, so ENTITY_SPACING must clear that
// plus a label's width. Tiers pushed apart in Z so they read as clean bands.
const FO_Z = -50
const ENTITY_Z = 2
const ACCOUNT_Z = 56
const ENTITY_SPACING = 74
const ACCOUNT_SPACING = 26

function entityModel(entityType: string): ModelType {
  const t = entityType.toLowerCase()
  if (t.includes('trust')) return 'trust'
  if (t.includes('holding')) return 'holding'
  return 'llc'
}

function accountModel(accountType: string): ModelType {
  switch (accountType) {
    case 'Alternative Investment':
      return 'alternative'
    case 'Managed Account':
      return 'managed'
    case 'Custody':
      return 'custody'
    case 'Direct Real Estate':
      return 'real_estate'
    default:
      return 'brokerage'
  }
}

/** WealthData → { nodes, links } with deterministic positions + per-type models. */
export function buildGraph3D(data: WealthData): {
  nodes: Graph3DNode[]
  links: Graph3DLink[]
} {
  const nodes: Graph3DNode[] = []
  const links: Graph3DLink[] = []
  const { household, portfolios, accounts } = data

  nodes.push({
    id: household.Id,
    kind: 'household',
    modelType: 'office',
    label: household.Name,
    isAlt: false,
    baseValue: household.SalenticaLMNTS__Total_AUM__c,
    x: 0,
    y: 0,
    z: FO_Z,
  })

  const n = portfolios.length
  portfolios.forEach((p, i) => {
    const entityX = (i - (n - 1) / 2) * ENTITY_SPACING
    nodes.push({
      id: p.Id,
      kind: 'portfolio',
      modelType: entityModel(p.SalenticaLMNTS__Entity_Type__c),
      label: p.Name,
      isAlt: false,
      baseValue: p.SalenticaLMNTS__AUM__c,
      x: entityX,
      y: 0,
      z: ENTITY_Z,
    })

    if (p.SalenticaLMNTS__Relationship__c === household.Id) {
      links.push({ source: household.Id, target: p.Id })
    }

    const kids = accounts.filter((a) => a.SalenticaLMNTS__Portfolio__c === p.Id)
    const k = kids.length
    kids.forEach((a, j) => {
      nodes.push({
        id: a.Id,
        kind: 'account',
        modelType: accountModel(a.SalenticaLMNTS__Account_Type__c),
        label: a.Name,
        isAlt: a.SalenticaLMNTS__Account_Type__c === 'Alternative Investment',
        baseValue: a.SalenticaLMNTS__Market_Value__c,
        x: entityX + (j - (k - 1) / 2) * ACCOUNT_SPACING,
        y: 0,
        z: ACCOUNT_Z,
      })
      links.push({ source: p.Id, target: a.Id })
    })
  })

  return { nodes, links }
}
