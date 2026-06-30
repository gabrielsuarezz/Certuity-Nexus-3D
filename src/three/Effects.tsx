import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'

/**
 * Restrained Bloom — a soft institutional glow, not a neon haze. The raised
 * threshold means only the brightest highlights bloom; `mipmapBlur` keeps it
 * cheap. MSAA/normal pass are off (Canvas runs antialias:false). A gentle
 * Vignette darkens the corners to focus the eye on the constellation.
 */
export function Effects() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        mipmapBlur
        intensity={0.7}
        luminanceThreshold={0.5}
        luminanceSmoothing={0.2}
        radius={0.5}
      />
      <Vignette offset={0.32} darkness={0.5} eskil={false} />
    </EffectComposer>
  )
}
