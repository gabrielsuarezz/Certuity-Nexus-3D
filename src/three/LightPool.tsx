import { useMemo } from 'react'
import * as THREE from 'three'

/**
 * A soft radial light-pool on the floor that grounds the constellation without a
 * grid — champagne at the center fading to nothing. One plane, one cheap texture.
 */
export function LightPool() {
  const texture = useMemo(() => {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
      g.addColorStop(0, 'rgba(110,150,205,0.16)')
      g.addColorStop(0.5, 'rgba(60,90,140,0.06)')
      g.addColorStop(1, 'rgba(11,30,54,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, size, size)
    }
    return new THREE.CanvasTexture(canvas)
  }, [])

  return (
    <mesh position={[0, -5, 6]} rotation={[-Math.PI / 2, 0, 0]} frustumCulled={false}>
      <planeGeometry args={[320, 260]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  )
}
