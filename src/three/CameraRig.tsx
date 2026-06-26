import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import { useGraphStore } from '@/store/useGraphStore'
import type { Positions } from './layout'

// War-room framing: above and in front of the table, angled down.
const HOME = { px: 0, py: 64, pz: 108, tx: 0, ty: 2, tz: 6 }

/**
 * drei CameraControls with a smooth fly-to on look-through. In demand mode we
 * render only when the camera actually changes (the 'update' event), so idle
 * orbiting/zooming stays smooth without continuously rendering.
 */
export function CameraRig({ positions }: { positions: Positions }) {
  const controls = useRef<CameraControls>(null)
  const invalidate = useThree((s) => s.invalidate)
  const activeLeafId = useGraphStore((s) => s.activeLeafId)

  useEffect(() => {
    const c = controls.current
    if (!c) return
    const onUpdate = () => invalidate()
    c.addEventListener('update', onUpdate)
    return () => c.removeEventListener('update', onUpdate)
  }, [invalidate])

  useEffect(() => {
    const c = controls.current
    if (!c) return
    if (activeLeafId) {
      const p = positions.get(activeLeafId)
      if (p) void c.setLookAt(p.x + 10, p.y + 20, p.z + 32, p.x, p.y + 4, p.z, true)
    } else {
      void c.setLookAt(HOME.px, HOME.py, HOME.pz, HOME.tx, HOME.ty, HOME.tz, true)
    }
  }, [activeLeafId, positions])

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={24}
      maxDistance={340}
      maxPolarAngle={Math.PI * 0.49}
    />
  )
}
