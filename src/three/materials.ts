import * as THREE from 'three'
import type { NodeKind } from '@/types/salesforce'
import type { MarketEventKind } from '@/types/market'
import type { ModelType } from '@/lib/buildGraph3D'

/**
 * Warm private-bank palette — a muted, cohesive "precious materials" tone per
 * asset type: a `body` finish (gold / bronze / navy / stone), a brighter
 * `accent`, and a soft `glow` for lit details. Tuned to read as real,
 * softly-lit objects on a light paper stage — NOT glowing neon. Mirrored by the
 * shape key in Legend.tsx.
 */
export const MODEL_PALETTE: Record<ModelType, { body: string; accent: string; glow: string }> = {
  office: { body: '#C6A15A', accent: '#8A6526', glow: '#F4E4B8' }, // champagne gold + bronze trim
  trust: { body: '#B58A54', accent: '#E0BE7E', glow: '#F6E1AE' }, // antique bronze + gilded mark
  llc: { body: '#3E5F86', accent: '#93B4D8', glow: '#CFE0F2' }, // private-bank navy + lit glass
  holding: { body: '#5D7590', accent: '#A9BED2', glow: '#DCE8F4' }, // slate blue-grey cluster
  brokerage: { body: '#4F8A72', accent: '#86C4A8', glow: '#CFEAD9' }, // refined green + jade bars
  alternative: { body: '#7A5A22', accent: '#C9972F', glow: '#FFE6A6' }, // rich amber gem, dark bronze girdle (reads on ivory)
  managed: { body: '#CBA659', accent: '#E4C87C', glow: '#F6E4AE' }, // warm gold coins
  custody: { body: '#8A8B84', accent: '#C2C6BE', glow: '#E6E8E2' }, // warm platinum safe
  real_estate: { body: '#C39A6E', accent: '#B5623C', glow: '#F1CE9A' }, // sandstone + terracotta
}

export const EVENT_COLOR: Record<MarketEventKind, string> = {
  surge: '#3E9E7A', // green (up)
  capital_call: '#C6A15A', // champagne (capital event)
  drawdown: '#C2603F', // terracotta (down)
}

/** Overall model scale per tier (the per-type models are authored ~unit-sized).
 *  Sized up past the original so the models fill the screen and cut whitespace. */
export const TIER_SCALE: Record<NodeKind, number> = {
  household: 7.4,
  portfolio: 4.8,
  account: 3.7,
}

/** Resting emissive per tier — kept very low so nodes read as lit objects on the
 *  warm stage, not self-glowing. Selection/trace bump this up (see NodeMesh). */
export const BASE_EMISSIVE: Record<NodeKind, number> = {
  household: 0.06,
  portfolio: 0.04,
  account: 0.04,
}

/**
 * Softly-lit finish: the Family Office reads as polished gold; entities and
 * accounts as satin stone/pearl (clearcoat + sheen). Cloned per node so each
 * animates its emissive independently; geometries are shared across nodes.
 */
export function makeNodeMaterial(
  color: string,
  kind: NodeKind,
  faceted = false,
): THREE.MeshPhysicalMaterial {
  const isGold = kind === 'household'
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: isGold ? 1 : 0.3,
    roughness: isGold ? 0.32 : 0.42,
    clearcoat: isGold ? 0.4 : 0.7,
    clearcoatRoughness: 0.22,
    sheen: isGold ? 0.15 : 0.55,
    sheenColor: new THREE.Color('#fff6e2'),
    emissive: new THREE.Color(color),
    emissiveIntensity: BASE_EMISSIVE[kind],
    flatShading: faceted, // crisp facets for the diamond
  })
}

export function makeAccentMaterial(color: string, faceted = false): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.6,
    roughness: 0.3,
    clearcoat: 0.5,
    clearcoatRoughness: 0.22,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.1,
    flatShading: faceted,
  })
}

/** A gently "lit" detail — glass windows, vault dials, finials, gem tables.
 *  Reads as warm internal light, restrained on the light stage. */
export function makeGlowMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color).multiplyScalar(0.5),
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.55,
    roughness: 0.35,
    metalness: 0,
  })
}

/** One shared, dim, double-sided material for the mirrored reflection "ghosts" —
 *  a soft warm reflection on the gallery table. */
export const GHOST_MATERIAL = new THREE.MeshStandardMaterial({
  color: '#b8a884',
  emissive: new THREE.Color('#8a7a58'),
  emissiveIntensity: 0.12,
  transparent: true,
  opacity: 0.1,
  roughness: 0.7,
  metalness: 0.2,
  side: THREE.DoubleSide,
  depthWrite: false,
})
