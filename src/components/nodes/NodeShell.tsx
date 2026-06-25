import type { ReactNode } from 'react'
import { Handle, Position } from '@xyflow/react'
import clsx from 'clsx'
import type { NodeKind } from '@/types/salesforce'

interface NodeShellProps {
  kind: NodeKind
  selected: boolean
  dimmed: boolean
  traced: boolean
  isAlt?: boolean
  className?: string
  children: ReactNode
}

// Both handles sit at the node center so edges draw cleanly center-to-center;
// they're visually hidden via the global .react-flow__handle styles.
const handleStyle = {
  left: '50%',
  top: '50%',
  transform: 'translate(-50%, -50%)',
} as const

/** Shared glass-card chrome + state classes for every node kind. */
export function NodeShell({
  kind,
  selected,
  dimmed,
  traced,
  isAlt,
  className,
  children,
}: NodeShellProps) {
  return (
    <div
      className={clsx(
        'wg-node glass hairline relative rounded-2xl',
        `wg-node--${kind}`,
        selected && 'is-selected',
        dimmed && 'is-dimmed',
        traced && 'is-traced',
        isAlt && 'is-alt',
        className,
      )}
    >
      <Handle type="target" position={Position.Top} style={handleStyle} isConnectable={false} />
      <Handle type="source" position={Position.Bottom} style={handleStyle} isConnectable={false} />
      {children}
    </div>
  )
}
