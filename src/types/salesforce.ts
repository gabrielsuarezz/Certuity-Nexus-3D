import type { Node, Edge } from '@xyflow/react'

/**
 * Types that mirror the Salentica/Salesforce schema exactly, plus the
 * normalized, app-friendly shapes we derive from it.
 *
 * The three SObjects:
 *  - SalenticaLMNTS__Relationship__c    -> the family-office household (root)
 *  - SalenticaLMNTS__Portfolio__c       -> legal entities (trusts, LLCs)
 *  - SalenticaLMNTS__FinancialAccount__c-> custodial accounts & alternatives
 */

// ── Salesforce REST query envelope ──────────────────────────────────────────
export interface SalesforceAttributes {
  type: string
  url: string
}

export interface SalesforceRecord {
  attributes: SalesforceAttributes
  Id: string
  Name: string
}

export interface SalesforceQueryResponse<T extends SalesforceRecord> {
  totalSize: number
  done: boolean
  records: T[]
}

// ── The three SObjects ──────────────────────────────────────────────────────
export interface RelationshipRecord extends SalesforceRecord {
  SalenticaLMNTS__Relationship_Type__c: string
  SalenticaLMNTS__Total_AUM__c: number
  SalenticaLMNTS__Primary_Advisor__c: string
  SalenticaLMNTS__Reporting_Currency__c: string
  SalenticaLMNTS__Risk_Profile__c: string
  SalenticaLMNTS__Inception_Date__c: string
}

export interface PortfolioRecord extends SalesforceRecord {
  /** Lookup → parent SalenticaLMNTS__Relationship__c.Id */
  SalenticaLMNTS__Relationship__c: string
  SalenticaLMNTS__Entity_Type__c: string
  SalenticaLMNTS__AUM__c: number
  SalenticaLMNTS__Beneficiaries__c: string
  SalenticaLMNTS__Jurisdiction__c: string
  SalenticaLMNTS__Tax_ID_Masked__c: string
  SalenticaLMNTS__Formation_Date__c: string
}

export interface FinancialAccountRecord extends SalesforceRecord {
  /** Lookup → parent SalenticaLMNTS__Portfolio__c.Id */
  SalenticaLMNTS__Portfolio__c: string
  SalenticaLMNTS__Account_Type__c: string
  SalenticaLMNTS__Custodian__c: string
  SalenticaLMNTS__Market_Value__c: number
  SalenticaLMNTS__Account_Number__c: string
  SalenticaLMNTS__Liquidity__c: string
  SalenticaLMNTS__As_Of_Date__c: string
}

/** The raw mock file shape — keyed by SObject API name, each a query response. */
export interface WealthApiResponse {
  SalenticaLMNTS__Relationship__c: SalesforceQueryResponse<RelationshipRecord>
  SalenticaLMNTS__Portfolio__c: SalesforceQueryResponse<PortfolioRecord>
  SalenticaLMNTS__FinancialAccount__c: SalesforceQueryResponse<FinancialAccountRecord>
}

/** Normalized, app-friendly shape (envelopes stripped). */
export interface WealthData {
  household: RelationshipRecord
  portfolios: PortfolioRecord[]
  accounts: FinancialAccountRecord[]
}

// ── Graph view-model ────────────────────────────────────────────────────────
export type NodeKind = 'household' | 'portfolio' | 'account'

export type WealthRecord =
  | RelationshipRecord
  | PortfolioRecord
  | FinancialAccountRecord

// `extends Record<string, unknown>` keeps React Flow's Node<T> constraint happy.
export interface GraphNodeData extends Record<string, unknown> {
  kind: NodeKind
  label: string
  /** Market value (account) / AUM (portfolio) / total AUM (household). */
  aum: number
  subtitle: string
  isAlternative: boolean
  record: WealthRecord
}

export type WealthNode = Node<GraphNodeData, NodeKind>
export type WealthEdge = Edge

export interface Lineage {
  nodeIds: Set<string>
  edgeIds: Set<string>
}
