import * as THREE from 'three'
import type { ModelType } from '@/lib/buildGraph3D'

// ── Shared geometries (created once, scaled per mesh) ────────────────────────
const BOX = new THREE.BoxGeometry(1, 1, 1)
const CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 28)
const SPHERE = new THREE.SphereGeometry(0.5, 16, 12)
const TORUS = new THREE.TorusGeometry(0.3, 0.07, 16, 32)
const GIRDLE = new THREE.TorusGeometry(0.97, 0.045, 8, 28)
const DIAMOND_CROWN = new THREE.CylinderGeometry(0.55, 1.0, 0.3, 8)
const DIAMOND_PAVILION = new THREE.ConeGeometry(1.0, 0.85, 8)

// Gable / pediment — a triangular prism extruded along Z, centered.
const GABLE = (() => {
  const s = new THREE.Shape()
  s.moveTo(-0.62, 0)
  s.lineTo(0.62, 0)
  s.lineTo(0, 0.6)
  s.closePath()
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.95, bevelEnabled: false })
  g.translate(0, 0, -0.475)
  return g
})()

const SHIELD = (() => {
  const s = new THREE.Shape()
  s.moveTo(-0.6, 0.82)
  s.lineTo(0.6, 0.82)
  s.lineTo(0.6, -0.02)
  s.quadraticCurveTo(0.6, -0.72, 0, -1.0)
  s.quadraticCurveTo(-0.6, -0.72, -0.6, -0.02)
  s.closePath()
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.34,
    bevelEnabled: true,
    bevelSize: 0.05,
    bevelThickness: 0.05,
    bevelSegments: 2,
  })
  g.center()
  return g
})()

// Certuity mark — the "+" from their logo, raised on the shield.
const PLUS = (() => {
  const w = 0.15
  const l = 0.42
  const s = new THREE.Shape()
  s.moveTo(-w, -l)
  s.lineTo(w, -l)
  s.lineTo(w, -w)
  s.lineTo(l, -w)
  s.lineTo(l, w)
  s.lineTo(w, w)
  s.lineTo(w, l)
  s.lineTo(-w, l)
  s.lineTo(-w, w)
  s.lineTo(-l, w)
  s.lineTo(-l, -w)
  s.lineTo(-w, -w)
  s.closePath()
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.14,
    bevelEnabled: true,
    bevelSize: 0.02,
    bevelThickness: 0.02,
    bevelSegments: 1,
  })
  g.center()
  return g
})()

type Mat = THREE.Material

/**
 * Detailed, double-sided minted-metal icon per asset type. `m` is the body metal,
 * `a` the identifying accent, and `g` an emissive "lit" jewel (glass, dials,
 * finials, gems) for extra detail. Meshes share these materials so the pulse
 * animates uniformly.
 */
export function NodeModel({ modelType, m, a, g }: { modelType: ModelType; m: Mat; a: Mat; g: Mat }) {
  switch (modelType) {
    // ── Family Office: classical bank, symmetric front/back ──
    case 'office': {
      const columns: JSX.Element[] = []
      ;[-0.66, -0.33, 0, 0.33, 0.66].forEach((x) =>
        [0.46, -0.46].forEach((z) =>
          columns.push(
            <mesh key={`c${x}-${z}`} geometry={CYL} material={m} position={[x, 0.05, z]} scale={[0.13, 0.92, 0.13]} />,
          ),
        ),
      )
      return (
        <group>
          <mesh geometry={BOX} material={m} position={[0, -0.82, 0]} scale={[2.05, 0.16, 1.2]} />
          <mesh geometry={BOX} material={m} position={[0, -0.67, 0]} scale={[1.86, 0.16, 1.05]} />
          <mesh geometry={BOX} material={m} position={[0, -0.4, 0]} scale={[1.7, 0.32, 0.92]} />
          {columns}
          <mesh geometry={BOX} material={m} position={[0, 0.5, 0]} scale={[1.8, 0.16, 0.95]} />
          <mesh geometry={GABLE} material={m} position={[0, 0.58, 0]} scale={[1.5, 0.5, 0.97]} />
          <mesh geometry={SPHERE} material={g} position={[0, 0.96, 0]} scale={0.13} />
          <mesh geometry={BOX} material={a} position={[0, -0.36, 0.47]} scale={[0.34, 0.55, 0.06]} />
          <mesh geometry={BOX} material={a} position={[0, -0.36, -0.47]} scale={[0.34, 0.55, 0.06]} />
        </group>
      )
    }

    // ── Trust: heraldic shield, raised panel + Certuity C + studs on both faces ──
    case 'trust':
      return (
        <group>
          <mesh geometry={SHIELD} material={m} />
          <mesh geometry={SHIELD} material={m} position={[0, 0, 0.16]} scale={[0.78, 0.78, 0.5]} />
          <mesh geometry={SHIELD} material={m} position={[0, 0, -0.16]} scale={[0.78, 0.78, 0.5]} />
          <mesh geometry={PLUS} material={g} position={[0, 0.08, 0.3]} scale={0.82} />
          <mesh geometry={PLUS} material={g} position={[0, 0.08, -0.3]} scale={0.82} />
          {[
            [-0.5, 0.55],
            [0.5, 0.55],
            [-0.5, -0.05],
            [0.5, -0.05],
          ].map(([x, y], i) => (
            <mesh key={i} geometry={SPHERE} material={a} position={[x, y, 0.17]} scale={0.07} />
          ))}
        </group>
      )

    // ── LLC: office tower, glass floor-lines (accent), spire ──
    case 'llc':
      return (
        <group>
          <mesh geometry={BOX} material={m} position={[0, -0.1, 0]} scale={[0.82, 1.7, 0.82]} />
          {[-0.55, -0.2, 0.15, 0.5].map((y, i) => (
            <mesh key={i} geometry={BOX} material={g} position={[0, y, 0]} scale={[0.85, 0.06, 0.85]} />
          ))}
          <mesh geometry={BOX} material={m} position={[0, 0.86, 0]} scale={[0.5, 0.32, 0.5]} />
          <mesh geometry={CYL} material={a} position={[0, 1.22, 0]} scale={[0.05, 0.55, 0.05]} />
        </group>
      )

    // ── Holding Co.: base with a cluster of towers + accent finials ──
    case 'holding':
      return (
        <group>
          <mesh geometry={BOX} material={m} position={[0, -0.7, 0]} scale={[1.55, 0.28, 1.2]} />
          <mesh geometry={BOX} material={m} position={[-0.45, -0.05, 0.1]} scale={[0.4, 1.0, 0.4]} />
          <mesh geometry={BOX} material={m} position={[0.12, 0.15, -0.15]} scale={[0.44, 1.45, 0.44]} />
          <mesh geometry={BOX} material={m} position={[0.52, -0.1, 0.2]} scale={[0.36, 0.85, 0.36]} />
          <mesh geometry={CYL} material={a} position={[0.12, 0.98, -0.15]} scale={[0.04, 0.3, 0.04]} />
          <mesh geometry={SPHERE} material={g} position={[-0.45, 0.5, 0.1]} scale={0.1} />
          <mesh geometry={SPHERE} material={g} position={[0.52, 0.37, 0.2]} scale={0.09} />
        </group>
      )

    // ── Brokerage: ascending bars (accent jade) on a plinth + up-arrow ──
    case 'brokerage':
      return (
        <group>
          <mesh geometry={BOX} material={m} position={[0, -0.62, 0]} scale={[1.4, 0.14, 0.62]} />
          <mesh geometry={BOX} material={a} position={[-0.45, -0.28, 0]} scale={[0.3, 0.62, 0.3]} />
          <mesh geometry={BOX} material={a} position={[0, -0.02, 0]} scale={[0.3, 1.14, 0.3]} />
          <mesh geometry={BOX} material={a} position={[0.45, 0.26, 0]} scale={[0.3, 1.7, 0.3]} />
          <mesh geometry={DIAMOND_PAVILION} material={g} position={[0.45, 1.32, 0]} scale={[0.32, 0.34, 0.32]} />
        </group>
      )

    // ── Alternatives / Alts+: brilliant-cut diamond (icy accent) + champagne girdle ──
    case 'alternative':
      return (
        <group rotation={[0, Math.PI / 8, 0]}>
          <mesh geometry={DIAMOND_CROWN} material={a} position={[0, 0.28, 0]} />
          <mesh geometry={DIAMOND_PAVILION} material={a} position={[0, -0.29, 0]} rotation={[Math.PI, 0, 0]} />
          <mesh geometry={GIRDLE} material={m} position={[0, 0.1, 0]} />
        </group>
      )

    // ── Managed account: a stack of gold coins (accent) + platinum top emboss ──
    case 'managed':
      return (
        <group>
          {[
            { y: -0.42, x: 0.02 },
            { y: -0.27, x: -0.04 },
            { y: -0.12, x: 0.03 },
            { y: 0.03, x: -0.02 },
            { y: 0.18, x: 0.04 },
            { y: 0.33, x: 0 },
          ].map((c, i) => (
            <mesh
              key={i}
              geometry={CYL}
              material={a}
              position={[c.x, c.y, 0]}
              rotation={[0, (i * Math.PI) / 7, i === 5 ? 0.07 : 0]}
              scale={[1.0, 0.12, 1.0]}
            />
          ))}
          <mesh geometry={CYL} material={g} position={[0, 0.41, 0]} scale={[0.42, 0.14, 0.42]} />
        </group>
      )

    // ── Custody: a safe — body, round door + dial + spokes on both faces, bolts ──
    case 'custody': {
      const door = (z: number, sign: number, key: string) => (
        <group key={key}>
          <mesh geometry={CYL} material={m} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, z]} scale={[1.0, 0.06, 1.0]} />
          <mesh geometry={TORUS} material={g} position={[0, 0, z + sign * 0.06]} />
          {[0, 1, 2, 3].map((i) => (
            <mesh
              key={i}
              geometry={BOX}
              material={a}
              position={[0, 0, z + sign * 0.06]}
              rotation={[0, 0, (i * Math.PI) / 4]}
              scale={[0.5, 0.04, 0.04]}
            />
          ))}
        </group>
      )
      return (
        <group>
          <mesh geometry={BOX} material={m} position={[0, 0, 0]} scale={[1.35, 1.35, 0.7]} />
          {door(0.36, 1, 'front')}
          {door(-0.36, -1, 'back')}
          {[
            [-0.55, 0.55],
            [0.55, 0.55],
            [-0.55, -0.55],
            [0.55, -0.55],
          ].map(([x, y], i) => (
            <mesh key={i} geometry={SPHERE} material={a} position={[x, y, 0.36]} scale={0.07} />
          ))}
        </group>
      )
    }

    // ── Direct Real Estate: house — terracotta roof, door+windows both faces ──
    case 'real_estate': {
      const facade = (z: number, key: string) => (
        <group key={key}>
          <mesh geometry={BOX} material={a} position={[0, -0.45, z]} scale={[0.26, 0.5, 0.05]} />
          <mesh geometry={SPHERE} material={m} position={[0.08, -0.45, z + Math.sign(z) * 0.02]} scale={0.04} />
          {[-0.3, 0.3].map((x, i) => (
            <group key={i}>
              <mesh geometry={BOX} material={g} position={[x, -0.16, z]} scale={[0.22, 0.22, 0.04]} />
              <mesh geometry={BOX} material={a} position={[x, -0.16, z + Math.sign(z) * 0.01]} scale={[0.04, 0.22, 0.05]} />
              <mesh geometry={BOX} material={a} position={[x, -0.16, z + Math.sign(z) * 0.01]} scale={[0.22, 0.04, 0.05]} />
            </group>
          ))}
        </group>
      )
      return (
        <group>
          <mesh geometry={BOX} material={m} position={[0, -0.35, 0]} scale={[1.0, 0.8, 0.9]} />
          <mesh geometry={GABLE} material={a} position={[0, 0.05, 0]} scale={[0.88, 0.62, 0.94]} />
          <mesh geometry={BOX} material={m} position={[0.32, 0.34, 0.16]} scale={[0.17, 0.34, 0.17]} />
          {facade(0.46, 'front')}
          {facade(-0.46, 'back')}
        </group>
      )
    }

    default:
      return <mesh geometry={BOX} material={m} />
  }
}
