import { Canvas } from '@react-three/fiber'
import { AnimatePresence, motion } from 'framer-motion'
import { Scene } from './Scene'
import { Legend } from './Legend'
import { useGraphStore } from '@/store/useGraphStore'
import type { WealthData } from '@/types/salesforce'

/**
 * The 3D "Global Wealth Map" — replaces the 2D React Flow graph in the center.
 * Chrome optimizations live here: `frameloop="demand"` (frames driven by
 * `invalidate()`), capped `dpr`, and a high-performance GL context.
 */
export function PrismScene({ data }: { data: WealthData }) {
  const lookThrough = useGraphStore((s) => s.lookThrough)
  const activeLeafId = useGraphStore((s) => s.activeLeafId)
  const showHint = lookThrough && !activeLeafId

  return (
    <div className="absolute inset-0">
      <Canvas
        frameloop="always"
        dpr={[1, 1.5]}
        camera={{ position: [0, 58, 116], fov: 48, near: 0.1, far: 2000 }}
        gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      >
        <color attach="background" args={['#0B1E36']} />
        <fog attach="fog" args={['#0B1E36', 150, 420]} />
        <Scene key={data.household.Id} data={data} />
      </Canvas>

      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass pointer-events-none absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-emr/30 px-4 py-1.5 text-xs text-ink-muted"
            style={{ boxShadow: '0 0 24px -8px rgba(16,185,129,0.5)' }}
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emr-bright" />
            Select an account node to trace its lineage to the family office
          </motion.div>
        )}
      </AnimatePresence>

      <Legend />
    </div>
  )
}
