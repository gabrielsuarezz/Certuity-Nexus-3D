import { motion } from 'framer-motion'

const QUERY_LINES = [
  'GET /api/wealth-graph',
  'SELECT … FROM SalenticaLMNTS__Relationship__c',
  'SELECT … FROM SalenticaLMNTS__Portfolio__c',
  'SELECT … FROM SalenticaLMNTS__FinancialAccount__c',
]

/** Premium loading state shown while the service resolves (mock latency in demo). */
export function LoadingState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-8"
    >
      {/* Emblem */}
      <div className="relative h-28 w-28">
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'conic-gradient(from 0deg, transparent 0%, rgba(16,185,129,0.0) 55%, var(--emerald-bright) 80%, var(--gold-bright) 100%)',
            animation: 'wg-spin 1.5s linear infinite',
            mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))',
            WebkitMask:
              'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))',
          }}
        />
        <span
          className="absolute inset-[18px] rounded-full"
          style={{
            border: '1px solid rgba(34,48,63,0.16)',
            animation: 'wg-pulse-ring 2.4s ease-out infinite',
          }}
        />
        <span className="absolute inset-0 flex items-center justify-center">
          <span
            className="h-3.5 w-3.5 rounded-full"
            style={{
              background:
                'radial-gradient(circle, var(--emerald-bright), var(--emerald-deep))',
              boxShadow: '0 0 20px 3px rgba(46,87,136,0.45)',
            }}
          />
        </span>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <p className="font-serif text-xl tracking-wide text-ink">
          Certuity Prism
        </p>
        <p className="text-sm text-ink-muted">
          Securely assembling the family-office structure
          <AnimatedEllipsis />
        </p>
      </div>

      {/* Faux query log — reinforces the live-data seam */}
      <div className="flex w-[320px] max-w-[80vw] flex-col gap-1.5">
        {QUERY_LINES.map((line, i) => (
          <motion.div
            key={line}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.12, duration: 0.4 }}
            className="shimmer flex items-center gap-2 rounded-md border border-ink/10 bg-white/55 px-3 py-1.5"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emr" />
            <code className="truncate font-mono text-[11px] text-ink-faint">
              {line}
            </code>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

function AnimatedEllipsis() {
  return (
    <span className="inline-flex w-4 justify-start">
      <motion.span
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 1.4, repeat: Infinity }}
      >
        …
      </motion.span>
    </span>
  )
}
