import * as THREE from 'three'
import type { NodeKind } from '@/types/salesforce'
import type { MarketEventKind } from '@/types/market'
import type { ModelType } from '@/lib/buildGraph3D'

/**
 * Certuity-aligned palette: champagne-gold Family Office, pearl-platinum
 * entities, cool-pearl accounts — minted-metal icons on a deep-navy field.
 */
export const TIER_COLOR: Record<NodeKind, string> = {
  household: '#C9A86A', // champagne gold (family office)
  portfolio: '#DAE3EF', // warm pearl (legal entities)
  account: '#C4D2E2', // cool pearl (accounts)
}

export const ALT_COLOR = '#E2C88C' // bright champagne — ties Alts+ to the flagship

export const EVENT_COLOR: Record<MarketEventKind, string> = {
  surge: '#7FD9BE', // soft jade (up)
  capital_call: '#E2C88C', // champagne (capital event)
  drawdown: '#E5917C', // muted terracotta (down)
}

/** Overall model scale per tier (the per-type models are authored ~unit-sized). */
export const TIER_SCALE: Record<NodeKind, number> = {
  household: 4.6,
  portfolio: 3,
  account: 2.3,
}

/** Resting emissive per tier (the Family Office glows a touch brighter). */
export const BASE_EMISSIVE: Record<NodeKind, number> = {
  household: 0.5,
  portfolio: 0.3,
  account: 0.26,
}

/**
 * Lacquered-jewel material: the Family Office reads as polished gold; entities
 * and accounts as pearls (clearcoat + sheen). Cloned per node so each animates
 * its emissive independently; geometries are shared across nodes.
 */
export function makeNodeMaterial(
  color: string,
  kind: NodeKind,
  faceted = false,
): THREE.MeshPhysicalMaterial {
  const isGold = kind === 'household'
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: isGold ? 0.95 : 0.45,
    roughness: isGold ? 0.24 : 0.2,
    clearcoat: isGold ? 0.5 : 1,
    clearcoatRoughness: 0.14,
    sheen: isGold ? 0 : 0.5,
    sheenColor: new THREE.Color('#ffffff'),
    emissive: new THREE.Color(color),
    emissiveIntensity: BASE_EMISSIVE[kind],
    flatShading: faceted, // crisp facets for the diamond
  })
}

/** A small identifying accent color per asset type (helps tell them apart). */
export const ACCENT_COLOR: Record<ModelType, string> = {
  office: '#B8893C', // bronze trim
  trust: '#B5825A', // copper Certuity mark
  llc: '#6FA8D6', // azure glass
  holding: '#6FA8D6', // azure
  brokerage: '#5BD6B0', // jade (markets)
  alternative: '#CFE6FF', // icy diamond
  managed: '#E2C88C', // gold coins
  custody: '#8FB0CC', // steel dial
  real_estate: '#C98A5E', // terracotta roof
}

export function makeAccentMaterial(color: string, faceted = false): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.55,
    roughness: 0.25,
    clearcoat: 0.6,
    clearcoatRoughness: 0.18,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.32,
    flatShading: faceted,
  })
}

/** One shared, dim, double-sided material for the mirrored reflection "ghosts". */
export const GHOST_MATERIAL = new THREE.MeshStandardMaterial({
  color: '#9fb6d0',
  emissive: new THREE.Color('#5f7798'),
  emissiveIntensity: 0.25,
  transparent: true,
  opacity: 0.16,
  roughness: 0.6,
  metalness: 0.2,
  side: THREE.DoubleSide,
  depthWrite: false,
})

