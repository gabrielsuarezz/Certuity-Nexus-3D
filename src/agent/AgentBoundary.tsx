import { Component, type ReactNode } from 'react'

/** Contains any agent-dock error so it can never blank the 3D map. */
export class AgentBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error('[agent] dock error (contained):', error)
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
