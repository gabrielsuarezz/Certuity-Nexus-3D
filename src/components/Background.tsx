/** Full-bleed ambient backdrop — deep Certuity navy with soft azure/champagne
 *  corner glows, a low-key aurora veil drifting near the top, and a vignette.
 *  Calm, minimalist, and seamless on navy. */
export function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* Navy base + established corner glows */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(1100px 760px at 50% 0%, rgba(91,155,213,0.10), transparent 60%),' +
            'radial-gradient(900px 700px at 85% 96%, rgba(201,168,106,0.07), transparent 60%),' +
            'linear-gradient(180deg, #0B1E36 0%, #081625 100%)',
        }}
      />

      {/* Aurora — two blurred jade/teal light veils near the top that drift slowly
          out of sync. Teal reads against the navy (azure was too close in hue to
          show); `screen` blend keeps them luminous and seamless, not blobby. */}
      <div
        className="wg-veil absolute"
        style={{
          left: '-10%',
          top: '-10%',
          width: '76%',
          height: '56%',
          background:
            'radial-gradient(58% 100% at 50% 50%, rgba(88,224,180,0.26), rgba(76,182,200,0.10) 44%, transparent 72%)',
          filter: 'blur(46px)',
          mixBlendMode: 'screen',
        }}
      />
      <div
        className="wg-veil-2 absolute"
        style={{
          right: '-12%',
          top: '-14%',
          width: '68%',
          height: '58%',
          background:
            'radial-gradient(58% 100% at 50% 50%, rgba(112,206,212,0.18), rgba(84,168,206,0.07) 46%, transparent 72%)',
          filter: 'blur(52px)',
          mixBlendMode: 'screen',
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{ boxShadow: 'inset 0 0 260px 70px rgba(2,8,20,0.72)' }}
      />
    </div>
  )
}
