/** Display formatting helpers. */

const fullUsd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const compactUsd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

/** $487,500,000 */
export function formatCurrency(value: number): string {
  return fullUsd.format(value)
}

/** $487.5M */
export function formatCompactCurrency(value: number): string {
  return compactUsd.format(value)
}

/** "Apr 15, 2009" — parsed as a local date to avoid TZ off-by-one. */
export function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** 0.431 -> "43.1%" */
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}
