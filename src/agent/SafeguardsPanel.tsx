import { AnimatePresence, motion } from 'framer-motion'
import { useAgentStore, type SafeguardKind } from './agentStore'

/** Live "trust layer" panel: as the associate works, it shows — in plain terms —
 *  that each answer was grounded in real data, what drove the map, and every
 *  safeguard that fired (injection blocked, approval required, PII masked,
 *  out-of-scope routed to the advisor). Turns the invisible safety layer into a
 *  visible, demoable signal of senior, compliance-minded engineering. */

const META: Record<SafeguardKind, { color: string; tag: string }> = {
  grounded: { color: '#46d39a', tag: 'Grounded' },
  map: { color: '#5fa8e6', tag: 'Map' },
  approval: { color: '#d9a441', tag: 'Approval' },
  blocked: { color: '#e5917c', tag: 'Blocked' },
  scope: { color: '#b08fd0', tag: 'Advisor' },
  redacted: { color: '#8aa0b4', tag: 'Masked' },
}

export function SafeguardsPanel() {
  const events = useAgentStore((s) => s.events)
  const recent = events.slice(-12).reverse()

  return (
    <div className="pointer-events-none absolute left-4 top-20 z-20 hidden w-[244px] sm:block">
      <div className="glass hairline pointer-events-auto overflow-hidden rounded-2xl">
        <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-3.5 py-2.5">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: 'linear-gradient(160deg, #16304c, #0b1e36)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 3l7 3v5c0 4.4-3 7.9-7 9-4-1.1-7-4.6-7-9V6l7-3z" stroke="#C99B6A" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M9 12l2 2 4-4" stroke="#C99B6A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <p className="text-[12px] font-semibold text-ink">Safeguards</p>
            <p className="text-[10px] text-ink-faint">Live agent activity</p>
          </div>
        </div>

        <div className="scroll-slim max-h-[42vh] overflow-y-auto px-2 py-2">
          {recent.length === 0 ? (
            <p className="px-2 py-3 text-[11px] leading-relaxed text-ink-faint">
              Every answer is grounded in your data, guarded, and logged. Activity appears here as we talk.
            </p>
          ) : (
            <AnimatePresence initial={false}>
              {recent.map((e) => {
                const m = META[e.kind]
                return (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex items-center gap-2.5 rounded-lg px-2 py-1.5"
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: m.color, boxShadow: `0 0 7px ${m.color}` }}
                    />
                    <span className="flex-1 truncate text-[11.5px] text-ink">{e.label}</span>
                    <span
                      className="rounded-full px-1.5 py-[1px] text-[9px] font-medium uppercase tracking-wide"
                      style={{ color: m.color, background: `${m.color}1a` }}
                    >
                      {m.tag}
                    </span>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  )
}
