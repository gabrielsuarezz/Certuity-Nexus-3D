import { useAgentStore, type DocumentResult } from './agentStore'

/** Result of analyzing an uploaded client document. The footer makes the safety
 *  story explicit: the document's text was screened for hidden instructions
 *  before anything was summarized, and nothing in it was ever executed. */
export function DocumentCard({ doc }: { doc: DocumentResult }) {
  const setDocument = useAgentStore((s) => s.setDocument)

  return (
    <div className="rounded-2xl border border-ink/10 bg-white/70 p-3 shadow-sm">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-md"
            style={{ background: 'linear-gradient(160deg, #2E5788, #1D3A5E)' }}
          >
            <svg width="12" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" stroke="#E2C88C" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M14 3v5h5" stroke="#E2C88C" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <p className="text-[12px] font-semibold leading-tight text-ink">{doc.doc_type || 'Document'}</p>
            <p className="text-[10px] text-ink-faint">{doc.filename}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDocument(null)}
          aria-label="Dismiss document"
          className="text-[14px] leading-none text-ink-faint transition hover:text-ink"
        >
          ×
        </button>
      </div>

      <p className="mb-2 text-[11.5px] leading-snug text-ink">{doc.summary}</p>

      {doc.key_facts && doc.key_facts.length > 0 && (
        <div className="mb-2 space-y-1">
          {doc.key_facts.map((f, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-gld/70" />
              <span className="text-[11px] leading-snug text-ink-muted">{f}</span>
            </div>
          ))}
        </div>
      )}

      {doc.portfolio_note && (
        <p className="rounded-lg bg-emr/10 px-2 py-1.5 text-[11px] leading-snug text-ink">{doc.portfolio_note}</p>
      )}

      <p className="mt-2 text-[10px] text-ink-faint">Screened for hidden instructions before analysis.</p>
    </div>
  )
}
