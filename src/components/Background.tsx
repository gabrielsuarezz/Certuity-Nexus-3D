/** Full-bleed ambient backdrop — deep navy with a soft azure top-glow, a faint
 *  masked grid, and a vignette. Calm and institutional (Certuity navy). */
export function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(1100px 760px at 50% 0%, rgba(91,155,213,0.10), transparent 60%),' +
            'radial-gradient(900px 700px at 85% 96%, rgba(201,168,106,0.07), transparent 60%),' +
            'linear-gradient(180deg, #0B1E36 0%, #081625 100%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(150,180,220,0.6) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(150,180,220,0.6) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(circle at 50% 42%, black, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(circle at 50% 42%, black, transparent 80%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{ boxShadow: 'inset 0 0 260px 70px rgba(2,8,20,0.72)' }}
      />
    </div>
  )
}
