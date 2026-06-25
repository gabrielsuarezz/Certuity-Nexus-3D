/** Full-bleed ambient backdrop: gradient wash, faint masked grid, floating orbs, vignette. */
export function Background() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 overflow-hidden"
    >
      {/* Gradient wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(1100px 760px at 22% 16%, rgba(16,185,129,0.12), transparent 60%),' +
            'radial-gradient(1000px 720px at 82% 88%, rgba(212,175,55,0.09), transparent 60%),' +
            'radial-gradient(760px 620px at 60% 52%, rgba(20,28,25,0.55), transparent 72%)',
        }}
      />

      {/* Faint grid, radially masked toward center */}
      <div
        className="absolute inset-0 opacity-[0.055]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '46px 46px',
          maskImage: 'radial-gradient(circle at 50% 45%, black, transparent 78%)',
          WebkitMaskImage:
            'radial-gradient(circle at 50% 45%, black, transparent 78%)',
        }}
      />

      {/* Floating orbs */}
      <div
        className="absolute -left-24 top-6 h-72 w-72 rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(16,185,129,0.20), transparent 70%)',
          animation: 'wg-float 15s ease-in-out infinite',
        }}
      />
      <div
        className="absolute -right-20 bottom-0 h-80 w-80 rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(212,175,55,0.16), transparent 70%)',
          animation: 'wg-float 19s ease-in-out infinite reverse',
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{ boxShadow: 'inset 0 0 240px 70px rgba(0,0,0,0.72)' }}
      />
    </div>
  )
}
