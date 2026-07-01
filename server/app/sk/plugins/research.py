"""Web search (read-only) with the SAME prompt-injection screening used on uploaded
documents, so untrusted web content can never hijack the agent. Uses Tavily's
agent-friendly search API and returns a short, screened, redacted answer with
sources — strictly as DATA, never as instructions to follow."""

from __future__ import annotations

import httpx

from app.config import settings
from app.guardrails import audit
from app.guardrails.content_safety import detect_injection
from app.guardrails.redaction import redact
from app.sk._compat import kernel_function
from app.sk.context import TurnContext

_URL = "https://api.tavily.com/search"


class SearchPlugin:
    def __init__(self, ctx: TurnContext) -> None:
        self.ctx = ctx

    @kernel_function(
        description="Search the web for current, general information the portfolio tools don't cover "
        "(market news, what's happening with a company, sector, or topic). Returns screened, "
        "factual results with sources."
    )
    async def web_search(self, query: str) -> str:
        q = (query or "").strip()
        if not q:
            return "What would you like me to look up?"
        if not settings.search_ready:
            return "Web search isn't available right now."
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    _URL,
                    json={
                        "api_key": settings.tavily_api_key,
                        "query": q,
                        "max_results": 4,
                        "search_depth": "basic",
                        "include_answer": True,
                    },
                )
                resp.raise_for_status()
                data = resp.json()
        except Exception:
            return "I couldn't reach the web just now."

        results = data.get("results", []) or []
        answer = (data.get("answer") or "").strip()
        corpus = answer + "\n" + "\n".join(str(r.get("content", "")) for r in results)

        # SAFETY: screen the UNTRUSTED web content for embedded prompt-injection,
        # the same shields used on chat input and uploaded documents.
        injection = await detect_injection(q, documents=[corpus[:4000]])
        if injection["flagged"]:
            audit.log("blocked_web", query=q, source=injection["source"])
            self.ctx.note("blocked", "Web result quarantined")
            return (
                "I searched, but the top results contained content trying to manipulate me "
                "(a prompt-injection attempt), so I've set them aside and won't act on anything in them."
            )

        self.ctx.note("grounded", "Searched the web — screened clean")
        if not answer and not results:
            return f"I didn't find much on '{q}'."
        summary = redact(answer or str(results[0].get("content", ""))[:400])
        titles = [str(r.get("title", "")).strip() for r in results[:3] if r.get("title")]
        sources = f" (Sources: {'; '.join(titles)}.)" if titles else ""
        return f"{summary}{sources} That's from a live web search, screened for safety."
