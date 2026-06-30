import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import {
  BASE_EMISSIVE,
  EVENT_COLOR,
  GHOST_MATERIAL,
  MODEL_PALETTE,
  TIER_SCALE,
  makeAccentMaterial,
  makeGlowMaterial,
  makeNodeMaterial,
} from './materials'
import { NodeModel } from './models'
import { useGraphStore } from '@/store/useGraphStore'
import { formatCompactCurrency } from '@/lib/format'
import type { Graph3DNode } from '@/lib/buildGraph3D'

const tmpColor = new THREE.Color()
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3)
const FLOOR_Y = -5 // reflection mirror line

const NAME_SIZE: Record<string, number> = { household: 3.2, portfolio: 2.2, account: 1.6 }
const VALUE_SIZE: Record<string, number> = { household: 2.3, portfolio: 1.5, account: 1.2 }

/** A per-type minted-metal icon (tier metal + identifying accent), with a
 *  mirrored reflection ghost below. Rises in on load; gently glows on events. */
export function NodeMesh({ node, index }: { node: Graph3DNode; index: number }) {
  const invalidate = useThree((s) => s.invalidate)
  const scaleRef = useRef<THREE.Group>(null)
  const ghostRef = useRef<THREE.Group>(null)

  const faceted = node.modelType === 'alternative'
  const palette = MODEL_PALETTE[node.modelType]
  const color = palette.body
  const baseColor = useMemo(() => new THREE.Color(color), [color])
  const material = useMemo(() => makeNodeMaterial(color, node.kind, faceted), [color, node.kind, faceted])
  const accentMaterial = useMemo(
    () => makeAccentMaterial(palette.accent, faceted),
    [palette.accent, faceted],
  )
  const glowMaterial = useMemo(() => makeGlowMaterial(palette.glow), [palette.glow])
  const tierScale = TIER_SCALE[node.kind]
  const baseEmissive = BASE_EMISSIVE[node.kind]
  const accent = node.isAlt || node.kind === 'household' ? '#E2C88C' : '#C7D4E2'

  const selectedId = useGraphStore((s) => s.selectedId)
  const lineage = useGraphStore((s) => s.lineage)
  const selectNode = useGraphStore((s) => s.selectNode)
  const liveValue = useGraphStore((s) => s.liveValues[node.id] ?? node.baseValue)
  const lastEvent = useGraphStore((s) => s.lastEvent[node.id])

  const selected = selectedId === node.id
  const inLineage = lineage ? lineage.nodeIds.has(node.id) : false
  const traced = !!lineage && inLineage
  const dimmed = !!lineage && !inLineage

  const valueFactor = THREE.MathUtils.clamp(liveValue / node.baseValue, 0.78, 1.35)

  const appear = useRef(0)
  const appearDelay = useRef(0.2 + index * 0.07)
  const pulse = useRef({ active: false, t: 0, intensity: 0 })
  const pulseColor = useRef(new THREE.Color(color))

  useEffect(() => {
    if (!lastEvent) return
    pulse.current.active = true
    pulse.current.t = 0
    pulse.current.intensity = Math.min(Math.abs(lastEvent.deltaPct) * 10 + 0.5, 1.6)
    pulseColor.current.set(EVENT_COLOR[lastEvent.kind])
    invalidate()
  }, [lastEvent, invalidate])

  useEffect(() => {
    invalidate()
  }, [selected, traced, dimmed, invalidate])

  useFrame((_, delta) => {
    const sc = scaleRef.current
    if (!sc) return
    let animating = false

    if (appear.current < 1) {
      if (appearDelay.current > 0) appearDelay.current -= delta
      else appear.current = Math.min(appear.current + delta / 0.9, 1)
      animating = true
    }
    const a = easeOutCubic(appear.current)

    let pulseScale = 1
    let env = 0
    const targetEmissive = traced ? 1.5 : selected ? 1.1 : dimmed ? 0.1 : baseEmissive
    const targetAccent = traced ? 1.3 : selected ? 0.9 : dimmed ? 0.08 : 0.32
    if (pulse.current.active) {
      pulse.current.t += delta
      const x = pulse.current.t / 1.6
      if (x >= 1) pulse.current.active = false
      else animating = true
      env = Math.sin(Math.min(x, 1) * Math.PI)
      const k = pulse.current.intensity / 2
      pulseScale = 1 + env * 0.16 * k
      tmpColor.copy(baseColor).lerp(pulseColor.current, env)
      material.emissive.copy(tmpColor)
      material.emissiveIntensity = targetEmissive + env * 1.0
      accentMaterial.emissiveIntensity = targetAccent + env * 0.8
    } else {
      material.emissive.lerp(baseColor, 0.2)
      const nextE = THREE.MathUtils.lerp(material.emissiveIntensity, targetEmissive, 0.1)
      const nextA = THREE.MathUtils.lerp(accentMaterial.emissiveIntensity, targetAccent, 0.1)
      if (Math.abs(nextE - targetEmissive) > 0.01) animating = true
      material.emissiveIntensity = nextE
      accentMaterial.emissiveIntensity = nextA
    }

    const S = tierScale * valueFactor * a * pulseScale
    sc.scale.setScalar(S)
    if (ghostRef.current) ghostRef.current.scale.set(S, -S, S)

    material.transparent = dimmed
    material.opacity = dimmed ? 0.4 : 1
    accentMaterial.transparent = dimmed
    accentMaterial.opacity = dimmed ? 0.4 : 1
    glowMaterial.transparent = dimmed
    glowMaterial.opacity = dimmed ? 0.4 : 1

    if (animating) invalidate()
  })

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    selectNode(node.id)
  }
  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    document.body.style.cursor = 'pointer'
    invalidate()
  }
  const onOut = () => {
    document.body.style.cursor = 'auto'
    invalidate()
  }

  const labelOpacity = dimmed ? 0.32 : 1
  const labelY = tierScale * 1.35 + 2

  return (
    <group position={[node.x, 0, node.z]}>
      <group ref={scaleRef} onClick={onClick} onPointerOver={onOver} onPointerOut={onOut}>
        <NodeModel modelType={node.modelType} m={material} a={accentMaterial} g={glowMaterial} />
      </group>

      {/* Mirrored reflection ghost (no labels), below the floor line. */}
      <group ref={ghostRef} position={[0, 2 * FLOOR_Y, 0]}>
        <NodeModel modelType={node.modelType} m={GHOST_MATERIAL} a={GHOST_MATERIAL} g={GHOST_MATERIAL} />
      </group>

      <Billboard position={[0, labelY, 0]}>
        <Text
          position={[0, VALUE_SIZE[node.kind] * 0.9, 0]}
          fontSize={NAME_SIZE[node.kind]}
          color="#EEF3F9"
          fillOpacity={labelOpacity}
          maxWidth={node.kind === 'account' ? 24 : 44}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.06}
          outlineColor="#040b16"
        >
          {node.label}
        </Text>
        <Text
          position={[0, -NAME_SIZE[node.kind] * 0.55, 0]}
          fontSize={VALUE_SIZE[node.kind]}
          color={accent}
          fillOpacity={labelOpacity}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.05}
          outlineColor="#040b16"
        >
          {formatCompactCurrency(liveValue)}
        </Text>
      </Billboard>
    </group>
  )
}
