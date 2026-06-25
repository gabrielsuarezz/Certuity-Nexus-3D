import { getStraightPath, type EdgeProps } from '@xyflow/react'
import { useGraphStore } from '@/store/useGraphStore'

/**
 * Custom edge with two visual modes:
 *  - normal: a soft emerald line with a slow flowing dash ("energy").
 *  - traced: a bright neon line that draws itself + a travelling comet, used by
 *    the Look-Through Analyzer. Off-lineage edges dim away.
 */
export function GlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
}: EdgeProps) {
  const lineage = useGraphStore((s) => s.lineage)
  const traced = lineage ? lineage.edgeIds.has(id) : false
  const dimmed = !!lineage && !traced

  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY })
  const length = Math.max(
    Math.hypot(targetX - sourceX, targetY - sourceY),
    1,
  )

  return (
    <g
      style={{
        opacity: dimmed ? 0.1 : 1,
        transition: 'opacity 400ms ease',
      }}
    >
      {/* Glow halo */}
      <path
        d={edgePath}
        fill="none"
        strokeLinecap="round"
        stroke={traced ? 'var(--trace-glow)' : 'var(--emerald)'}
        strokeWidth={traced ? 10 : 5}
        strokeOpacity={traced ? 0.55 : 0.13}
        style={{ filter: `blur(${traced ? 7 : 3}px)` }}
      />

      {/* Core line */}
      <path
        d={edgePath}
        fill="none"
        strokeLinecap="round"
        stroke={traced ? 'var(--trace-core)' : 'var(--edge)'}
        strokeWidth={traced ? 2.4 : 1.4}
        strokeDasharray={traced ? length : '5 9'}
        strokeDashoffset={traced ? length : 0}
        style={
          traced
            ? { animation: 'wg-trace-draw 0.85s cubic-bezier(0.4, 0, 0.2, 1) forwards' }
            : { animation: 'wg-flow 1.5s linear infinite' }
        }
      />

      {/* Travelling comet on the traced lineage */}
      {traced && (
        <circle r="3.2" fill="var(--trace-core)" style={{ filter: 'drop-shadow(0 0 7px var(--trace-glow))' }}>
          <animateMotion
            dur="1.5s"
            begin="0.5s"
            repeatCount="indefinite"
            path={edgePath}
            rotate="auto"
          />
        </circle>
      )}
    </g>
  )
}
