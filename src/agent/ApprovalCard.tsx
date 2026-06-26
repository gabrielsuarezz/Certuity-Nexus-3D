import { config } from '@/config/env'
import { useAgentStore, type Approval } from './agentStore'

/** Human-in-the-loop: nothing sensitive proceeds until the client clicks here. */
export function ApprovalCard({ approval }: { approval: Approval }) {
  const setApprovalStatus = useAgentStore((s) => s.setApprovalStatus)
  const pending = approval.status === 'pending'

  const decide = async (ok: boolean) => {
    try {
      await fetch(
        `${config.agentBaseUrl}/approvals/${approval.id}/${ok ? 'approve' : 'decline'}`,
        { method: 'POST' },
      )
    } catch {
      /* keep UI responsive even if the backend is unreachable */
    }
    setApprovalStatus(approval.id, ok ? 'approved' : 'declined')
  }

  return (
    <div
      className="rounded-xl border border-gld/40 bg-gld/10 p-3"
      style={{ boxShadow: '0 0 24px -10px rgba(201,168,106,0.5)' }}
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gld-bright">
          Confirmation required
        </span>
      </div>
      <p className="mt-1 text-[12px] capitalize text-ink">{approval.kind}</p>
      <p className="mt-0.5 text-[11px] text-ink-muted">“{approval.details}”</p>
      {pending ? (
        <div className="mt-2.5 flex gap-2">
          <button
            type="button"
            onClick={() => decide(true)}
            className="flex-1 rounded-lg bg-gld/20 px-3 py-1.5 text-[12px] font-medium text-gld-bright transition hover:bg-gld/30"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => decide(false)}
            className="flex-1 rounded-lg border border-white/10 px-3 py-1.5 text-[12px] text-ink-muted transition hover:bg-white/5"
          >
            Decline
          </button>
        </div>
      ) : (
        <p className={`mt-2 text-[11px] font-medium ${approval.status === 'approved' ? 'text-emr-bright' : 'text-ink-faint'}`}>
          {approval.status === 'approved' ? '✓ Approved — your advisor has been notified.' : 'Declined.'}
        </p>
      )}
    </div>
  )
}
