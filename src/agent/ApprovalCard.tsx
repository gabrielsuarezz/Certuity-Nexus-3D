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
      className="rounded-xl border border-gld/40 bg-gld/[0.12] p-3"
      style={{ boxShadow: '0 12px 28px -18px rgba(122,94,42,0.6)' }}
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gld-deep">
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
            className="flex-1 rounded-lg bg-gld px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-sm transition hover:bg-gld-deep"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => decide(false)}
            className="flex-1 rounded-lg border border-ink/15 px-3 py-1.5 text-[12.5px] text-ink-muted transition hover:bg-ink/5"
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
