import rawData from '@/data/familyOffice.json'
import { config } from '@/config/env'
import type {
  SalesforceQueryResponse,
  SalesforceRecord,
  WealthApiResponse,
  WealthData,
} from '@/types/salesforce'

/**
 * THE SEAM.
 *
 * Every byte of wealth data flows through `fetchWealthGraph()`. Today it returns
 * the bundled mock (shaped exactly like a Salesforce REST response); tomorrow it
 * fetches from a real endpoint. The `normalizeSalesforceResponse()` parsing is
 * identical in both cases — so going live changes only the inside of this file.
 */

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Unwrap a Salesforce REST query response into its record array. */
function recordsOf<T extends SalesforceRecord>(
  response: SalesforceQueryResponse<T> | undefined,
): T[] {
  return response?.records ?? []
}

/**
 * Strip the Salesforce REST envelopes into the normalized shape the app uses.
 * This runs against the mock today and would run unchanged against live JSON.
 */
export function normalizeSalesforceResponse(raw: WealthApiResponse): WealthData {
  const households = recordsOf(raw.SalenticaLMNTS__Relationship__c)
  const portfolios = recordsOf(raw.SalenticaLMNTS__Portfolio__c)
  const accounts = recordsOf(raw.SalenticaLMNTS__FinancialAccount__c)

  const household = households[0]
  if (!household) {
    throw new Error('No Relationship (household) record returned from the API.')
  }

  return { household, portfolios, accounts }
}

/**
 * Load the family-office wealth graph.
 *
 * @param signal optional AbortSignal so the caller can cancel an in-flight load.
 */
export async function fetchWealthGraph(signal?: AbortSignal): Promise<WealthData> {
  if (config.USE_MOCK) {
    // ── MOCK MODE (today) ────────────────────────────────────────────────────
    // Simulate a network round-trip so the UI exercises real loading/error UX.
    await delay(config.mockLatencyMs)
    if (signal?.aborted) throw new DOMException('Load aborted', 'AbortError')
    return normalizeSalesforceResponse(rawData as unknown as WealthApiResponse)
  }

  // ── LIVE MODE (the future swap — one fetch, identical normalize) ───────────
  // Planned: browser -> Vercel serverless /api/wealth-graph -> Salesforce SOQL
  // (OAuth handled server-side). Enable by setting VITE_USE_MOCK=false.
  const response = await fetch(`${config.apiBaseUrl}/wealth-graph`, { signal })
  if (!response.ok) {
    throw new Error(`Wealth API responded with ${response.status} ${response.statusText}`)
  }
  const json = (await response.json()) as WealthApiResponse
  return normalizeSalesforceResponse(json)
}
