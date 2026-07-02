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
        intensity={0.32}
        luminanceThreshold={0.72}
        luminanceSmoothing={0.25}
        radius={0.6}
      />
      <Vignette offset={0.42} darkness={0.16} eskil={false} />
    </EffectComposer>
  )
}
