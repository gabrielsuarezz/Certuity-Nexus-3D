/**
 * Minimal ambient declarations for `d3-force-3d` (no official @types).
 * Covers only the surface we use; forces are intentionally loose.
 */
declare module 'd3-force-3d' {
  export interface SimulationNodeDatum {
    index?: number
    x?: number
    y?: number
    z?: number
    vx?: number
    vy?: number
    vz?: number
    fx?: number | null
    fy?: number | null
    fz?: number | null
  }

  export interface SimulationLinkDatum<N> {
    source: string | number | N
    target: string | number | N
    index?: number
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type Force = any

  export interface Simulation<N, L> {
    nodes(): N[]
    nodes(nodes: N[]): this
    alpha(): number
    alpha(alpha: number): this
    alphaMin(min: number): this
    alphaDecay(decay: number): this
    alphaTarget(target: number): this
    velocityDecay(decay: number): this
    numDimensions(n: number): this
    force(name: string): Force
    force(name: string, force: Force | null): this
    on(typenames: string, listener: ((this: Simulation<N, L>) => void) | null): this
    tick(iterations?: number): this
    restart(): this
    stop(): this
    find(x: number, y: number, z?: number, radius?: number): N | undefined
  }

  export function forceSimulation<N = SimulationNodeDatum>(
    nodes?: N[],
    numDimensions?: number,
  ): Simulation<N, SimulationLinkDatum<N>>

  export function forceManyBody<N = SimulationNodeDatum>(): Force
  export function forceLink<N = SimulationNodeDatum, L = SimulationLinkDatum<N>>(
    links?: L[],
  ): Force
  export function forceCenter<N = SimulationNodeDatum>(
    x?: number,
    y?: number,
    z?: number,
  ): Force
  export function forceCollide<N = SimulationNodeDatum>(
    radius?: number | ((node: N, i: number, nodes: N[]) => number),
  ): Force
  export function forceX<N = SimulationNodeDatum>(
    x?: number | ((node: N, i: number, nodes: N[]) => number),
  ): Force
  export function forceY<N = SimulationNodeDatum>(
    y?: number | ((node: N, i: number, nodes: N[]) => number),
  ): Force
  export function forceZ<N = SimulationNodeDatum>(
    z?: number | ((node: N, i: number, nodes: N[]) => number),
  ): Force
  export function forceRadial<N = SimulationNodeDatum>(
    radius: number | ((node: N, i: number, nodes: N[]) => number),
    x?: number,
    y?: number,
    z?: number,
  ): Force
}
