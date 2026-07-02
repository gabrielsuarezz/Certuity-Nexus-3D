/** Full-bleed ambient backdrop — warm private-bank paper. A soft sunlit ivory
 *  field with a gentle champagne wash from above and a faint navy cool at the
 *  base, two slow drifting light veils, and a whisper of a vignette. Calm,
 *  inviting, and legible — the "gallery" the 3D map rests in. */
export function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* Parchment base + soft sunlit wash from top, cooler settle at the floor,
          and a broad warm "spotlight" behind the centre that stages the map. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(1200px 820px at 50% -6%, rgba(255,248,232,0.95), transparent 62%),' +
            'radial-gradient(1100px 900px at 56% 46%, rgba(255,250,238,0.75), transparent 66%),' +
            'radial-gradient(1000px 760px at 84% 100%, rgba(46,87,136,0.06), transparent 60%),' +
            'radial-gradient(900px 700px at 12% 96%, rgba(184,146,63,0.08), transparent 60%),' +
            'linear-gradient(180deg, #F6EFE0 0%, #EADFCB 60%, #E1D4BB 100%)',
        }}
      />

      {/* Fine paper grain — a whisper of tactile texture so the field isn't flat. */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: '180px 180px',
          mixBlendMode: 'multiply',
        }}
      />

      {/* Aurora — flowing jewel-tone light curtains that drift and breathe across
          the upper field: teal, sapphire-violet, champagne and rose. Elongated
          and heavily blurred so they read as luminous veils, not blobs. The
          palette echoes the gemstone map; motion + colour give the "flare". */}
      <div className="absolute inset-x-0 top-0 h-[72%] overflow-hidden">
        <div
          className="wg-aur wg-aur-a"
          style={{
            left: '-12%',
            top: '-18%',
            width: '70%',
            height: '80%',
            background:
              'radial-gradient(60% 42% at 50% 50%, rgba(64,168,158,0.55), rgba(64,168,158,0.18) 46%, transparent 72%)',
          }}
        />
        <div
          className="wg-aur wg-aur-b"
          style={{
            left: '18%',
            top: '-24%',
            width: '64%',
            height: '86%',
            background:
              'radial-gradient(58% 40% at 50% 50%, rgba(108,96,196,0.5), rgba(108,96,196,0.16) 46%, transparent 72%)',
          }}
        />
        <div
          className="wg-aur wg-aur-c"
          style={{
            right: '-14%',
            top: '-20%',
            width: '66%',
            height: '82%',
            background:
              'radial-gradient(60% 42% at 50% 50%, rgba(212,168,92,0.55), rgba(212,168,92,0.18) 46%, transparent 72%)',
          }}
        />
        <div
          className="wg-aur wg-aur-d"
          style={{
            right: '10%',
            top: '-26%',
            width: '58%',
            height: '84%',
            background:
              'radial-gradient(58% 40% at 50% 50%, rgba(196,96,132,0.42), rgba(196,96,132,0.14) 46%, transparent 72%)',
          }}
        />
      </div>

      {/* Whisper vignette — warm, barely there */}
      <div
        className="absolute inset-0"
        style={{ boxShadow: 'inset 0 0 300px 90px rgba(120,96,52,0.14)' }}
      />
    </div>
  )
}
