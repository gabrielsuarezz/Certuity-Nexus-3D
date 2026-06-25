import { useMemo } from 'react'
import {
  Controls,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  type EdgeTypes,
  type NodeMouseHandler,
  type NodeTypes,
} from '@xyflow/react'
import { AnimatePresence, motion } from 'framer-motion'
import { buildGraph } from '@/lib/buildGraph'
import { useForceLayout } from '@/hooks/useForceLayout'
import { useGraphStore } from '@/store/useGraphStore'
import { HouseholdNode } from '@/components/nodes/HouseholdNode'
import { PortfolioNode } from '@/components/nodes/PortfolioNode'
import { AccountNode } from '@/components/nodes/AccountNode'
import { GlowEdge } from '@/components/edges/GlowEdge'
import type { WealthData, WealthNode } from '@/types/salesforce'

const nodeTypes: NodeTypes = {
  household: HouseholdNode,
  portfolio: PortfolioNode,
  account: AccountNode,
}

const edgeTypes: EdgeTypes = {
  glow: GlowEdge,
}

export function GraphCanvas({ data }: { data: WealthData }) {
  return (
    <ReactFlowProvider>
      <Flow key={data.household.Id} data={data} />
    </ReactFlowProvider>
  )
}

function Flow({ data }: { data: WealthData }) {
  const { nodes, edges } = useMemo(() => buildGraph(data), [data])
  const drag = useForceLayout()

  const selectNode = useGraphStore((s) => s.selectNode)
  const clearSelection = useGraphStore((s) => s.clearSelection)
  const lookThrough = useGraphStore((s) => s.lookThrough)
  const activeLeafId = useGraphStore((s) => s.activeLeafId)

  const onNodeClick: NodeMouseHandler<WealthNode> = (_, node) => {
    selectNode(node.id)
  }

  const showHint = lookThrough && !activeLeafId

  return (
    <ReactFlow
      defaultNodes={nodes}
      defaultEdges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodeOrigin={[0.5, 0.5]}
      onNodeClick={onNodeClick}
      onNodeDragStart={drag.onNodeDragStart}
      onNodeDrag={drag.onNodeDrag}
      onNodeDragStop={drag.onNodeDragStop}
      onPaneClick={clearSelection}
      fitView
      fitViewOptions={{ padding: 0.32, duration: 700 }}
      minZoom={0.3}
      maxZoom={1.8}
      nodesConnectable={false}
      proOptions={{ hideAttribution: true }}
      className="h-full w-full"
    >
      <Controls
        showInteractive={false}
        position="bottom-right"
        className="!shadow-none"
      />

      <AnimatePresence>
        {showHint && (
          <Panel position="top-center">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="glass mt-2 flex items-center gap-2 rounded-full border border-emr/30 px-4 py-1.5 text-xs text-ink-muted"
              style={{ boxShadow: '0 0 24px -8px rgba(16,185,129,0.5)' }}
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emr-bright" />
              Select an account node to trace its lineage to the family office
            </motion.div>
          </Panel>
        )}
      </AnimatePresence>
    </ReactFlow>
  )
}
