import type { ReactNode } from 'react'

type Tone = 'gold' | 'emerald' | 'slate'

const TONE: Record<Tone, { bg: string; ring: string; color: string }> = {
  gold: {
    bg: 'rgba(212,175,55,0.12)',
    ring: 'rgba(212,175,55,0.38)',
    color: '#F5D58A',
  },
  emerald: {
    bg: 'rgba(16,185,129,0.12)',
    ring: 'rgba(16,185,129,0.34)',
    color: '#34D399',
  },
  slate: {
    bg: 'rgba(125,145,137,0.12)',
    ring: 'rgba(125,145,137,0.28)',
    color: '#CFD8D3',
  },
}

export function IconBadge({
  tone,
  size = 'md',
  children,
}: {
  tone: Tone
  size?: 'md' | 'lg'
  children: ReactNode
}) {
  const t = TONE[tone]
  const dim = size === 'lg' ? 'h-9 w-9' : 'h-8 w-8'
  return (
    <span
      className={`flex ${dim} shrink-0 items-center justify-center rounded-lg`}
      style={{ background: t.bg, boxShadow: `inset 0 0 0 1px ${t.ring}`, color: t.color }}
    >
      {children}
    </span>
  )
}

const svgProps = {
  width: 17,
  height: 17,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function HouseholdGlyph() {
  return (
    <svg {...svgProps}>
      <path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-5h6v5" />
      <path d="M9 11h.01M15 11h.01" />
    </svg>
  )
}

export function PortfolioGlyph({ entityType }: { entityType: string }) {
  const t = entityType.toLowerCase()
  if (t.includes('trust')) {
    // Shield
    return (
      <svg {...svgProps}>
        <path d="M12 3 5 6v5c0 4.2 2.9 7.4 7 9 4.1-1.6 7-4.8 7-9V6l-7-3Z" />
        <path d="M9.5 12l1.8 1.8L15 10" />
      </svg>
    )
  }
  if (t.includes('holding')) {
    // Layered stack
    return (
      <svg {...svgProps}>
        <path d="M12 3 3 7.5 12 12l9-4.5L12 3Z" />
        <path d="M3 12l9 4.5L21 12M3 16.5 12 21l9-4.5" />
      </svg>
    )
  }
  // LLC / default — columns
  return (
    <svg {...svgProps}>
      <path d="M3 21h18M4 21V9.5M20 21V9.5M8 21V9.5M16 21V9.5M12 21V9.5M3 9.5 12 4l9 5.5" />
    </svg>
  )
}

export function AccountGlyph({ accountType }: { accountType: string }) {
  const t = accountType.toLowerCase()
  if (t.includes('real estate')) {
    return (
      <svg {...svgProps}>
        <path d="M4 11 12 5l8 6M6 10v9h12v-9" />
        <path d="M10 19v-4h4v4" />
      </svg>
    )
  }
  if (t.includes('alternative')) {
    return <AltGlyph />
  }
  if (t.includes('custody') || t.includes('managed')) {
    return (
      <svg {...svgProps}>
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10h18M7 15h4" />
      </svg>
    )
  }
  // Brokerage / default — chart
  return (
    <svg {...svgProps}>
      <path d="M4 19V5M4 19h16M8 15l3.2-3.4 2.6 2 4-4.6" />
    </svg>
  )
}

export function AltGlyph() {
  return (
    <svg {...svgProps}>
      <path d="M12 3l1.8 4.4L18 9l-4.2 1.6L12 15l-1.8-4.4L6 9l4.2-1.6L12 3Z" />
      <path d="M18.5 14.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z" />
    </svg>
  )
}
