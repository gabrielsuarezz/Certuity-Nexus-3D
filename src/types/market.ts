/** Simulated real-time market feed types. */

export type MarketEventKind = 'surge' | 'capital_call' | 'drawdown'

export interface MarketEvent {
  kind: MarketEventKind
  /** Signed fractional change applied to the node's value, e.g. +0.045 / -0.03. */
  deltaPct: number
  /** Timestamp — also the identity that triggers a node's pulse animation. */
  ts: number
}
