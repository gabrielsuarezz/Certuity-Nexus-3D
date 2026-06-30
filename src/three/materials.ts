import * as THREE from 'three'
import type { NodeKind } from '@/types/salesforce'
import type { MarketEventKind } from '@/types/market'
import type { ModelType } from '@/lib/buildGraph3D'

/**
 * Certuity-aligned palette — a precious-metal & enamel jewel tone per asset
 * type: a `body` metal, a brighter `accent`, and a "lit" `glow` for glass /
 * gems / dials, on a deep-navy field. The Family Office stays champagne gold;
 * every other type gets its own colour so the map reads rich instead of
 * uniformly pearl-grey. Mirrored by the shape key in Legend.tsx.
 */
export const MODEL_PALETTE: Record<ModelType, { body: string; accent: string; glow: string }> = {
  office: { body: '#C9A86A', accent: '#8A6526', glow: '#FFE6A8' }, // champagne gold + bronze trim
  trust: { body: '#C08A4E', accent: '#E7C076', glow: '#FFD98A' }, // antique bronze + gilded mark
  llc: { body: '#5E8FCB', accent: '#9CC4ED', glow: '#BFE6FF' }, // sapphire tower + lit glass
  holding: { body: '#5C9AA8', accent: '#A6DBE0', glow: '#CFF1F4' }, // teal-steel cluster
  brokerage: { body: '#3E9E84', accent: '#69D9B4', glow: '#9BFFDC' }, // emerald markets + jade bars
  alternative: { body: '#E2C88C', accent: '#D6E9FF', glow: '#FFFFFF' }, // champagne girdle + icy diamond
  managed: { body: '#D4AF62', accent: '#E9C97C', glow: '#FFE6A0' }, // warm gold coins
  custody: { body: '#7C90A8', accent: '#BAC9DA', glow: '#D6E6F5' }, // platinum / gunmetal safe
  real_estate: { body: '#CBA079', accent: '#C16A43', glow: '#FFCE8A' }, // sandstone + terracotta + lamplight
}

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

/** An emissive "lit" jewel — glass windows, vault dials, finials, gem tables.
 *  Reads as internally-lit and catches a little of the scene's bloom. */
export function makeGlowMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color).multiplyScalar(0.35),
    emissive: new THREE.Color(color),
    emissiveIntensity: 1.0,
    roughness: 0.3,
    metalness: 0,
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

