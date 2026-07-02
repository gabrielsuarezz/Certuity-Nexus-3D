import { motion } from 'framer-motion'

interface ErrorStateProps {
  message: string
  onRetry: () => void
}

/** Elegant failure state with a working retry (re-runs the service). */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute inset-0 z-20 flex items-center justify-center p-6"
    >
      <div className="glass hairline relative w-[420px] max-w-full rounded-2xl p-8 text-center">
        <div
          className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full"
          style={{
            background: 'rgba(212,175,55,0.10)',
            boxShadow: '0 0 30px -6px rgba(212,175,55,0.4)',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 8.5v4.25M12 16h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.7 3h16.96a2 2 0 0 0 1.7-3L13.7 3.86a2 2 0 0 0-3.4 0Z"
              stroke="var(--gold-bright)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2 className="font-serif text-lg text-ink">Unable to load the wealth graph</h2>
        <p className="mx-auto mt-2 max-w-[300px] text-sm leading-relaxed text-ink-muted">
          {message}
        </p>

        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-gld px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gld-deep"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M3 12a9 9 0 1 0 2.64-6.36M3 4v4h4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Retry
        </button>
      </div>
    </motion.div>
  )
}
