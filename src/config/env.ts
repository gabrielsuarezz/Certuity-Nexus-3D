/**
 * Runtime configuration — the single place that decides where data comes from.
 *
 * Flipping VITE_USE_MOCK to "false" (and pointing VITE_API_BASE_URL at a live
 * endpoint) is the entire "go live" switch. No UI/component code changes.
 */

function readBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback
  return value === 'true' || value === '1'
}

function readNumber(value: string | undefined, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export const config = {
  /** When true (default), data is served from the bundled Salesforce-shaped mock. */
  USE_MOCK: readBool(import.meta.env.VITE_USE_MOCK, true),

  /**
   * Base URL of the future backend. The planned path is a Vercel serverless
   * function (`/api/wealth-graph`) that proxies a Salesforce SOQL query with
   * server-side OAuth — so client credentials never touch the browser.
   */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',

  /** Simulated latency for the mock so the loading state is visible in the demo. */
  mockLatencyMs: readNumber(import.meta.env.VITE_MOCK_LATENCY_MS, 850),
} as const
