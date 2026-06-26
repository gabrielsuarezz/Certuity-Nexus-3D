"""One turn of conversation, with guardrails wrapped around the brain.

Input guard (injection + scope) → brain (mock OR Semantic Kernel) → output guard
(PII redaction) → audit. The mock brain reuses the SAME tools the SK agent uses,
so the text demo is fully functional with no API keys.
"""

from __future__ import annotations

from app.config import settings
from app.data.repository import JsonRepository
from app.guardrails import audit
from app.guardrails.authz import is_out_of_scope
from app.guardrails.content_safety import detect_injection
from app.guardrails.redaction import redact
from app.sk.context import TurnContext
from app.sk.persona import ADVISOR_NAME
from app.sk.plugins.actions import ActionsPlugin
from app.sk.plugins.portfolio import PortfolioPlugin
from app.sk.plugins.visualize import VisualizePlugin
from app.util import money

SAFE_REFUSAL = (
    "I'm sorry, but I can't help with that. I'm only able to assist with your own Certuity "
    f"portfolio. If something's on your mind, I'm happy to connect you with your advisor, {ADVISOR_NAME}."
)
SCOPE_DEFLECT = (
    f"That's really one for your advisor, {ADVISOR_NAME} — it calls for specific tax, legal, or "
    "buy/sell advice that I shouldn't give. I can flag it for her if you'd like. Meanwhile, I can "
    "show you anything about your current holdings."
)

_ACTION_WORDS = (
    "withdraw", "transfer", "move money", "wire", "send money", "sell ", "buy ",
    "liquidate", "change beneficiary", "beneficiary", "rebalance", "close account",
    "open account", "pay ",
)
_ACCOUNT_KEYWORDS = {
    "schwab": "Schwab", "fidelity": "Fidelity", "goldman": "Goldman",
    "j.p. morgan": "J.P. Morgan", "jp morgan": "J.P. Morgan", "jpm": "J.P. Morgan",
    "hamilton": "Hamilton", "aspen": "Aspen", "manhattan": "Manhattan", "alts": "Alts+",
}


def _find_account(repo: JsonRepository, message: str):
    m = message.lower()
    for a in repo.list_accounts():
        if a["name"].lower() in m:
            return a
    for kw, query in _ACCOUNT_KEYWORDS.items():
        if kw in m:
            acc = repo.get_account(query)
            if acc:
                return acc
    return None


def mock_brain(message: str, repo: JsonRepository, ctx: TurnContext) -> str:
    port = PortfolioPlugin(repo, ctx)
    viz = VisualizePlugin(repo, ctx)
    act = ActionsPlugin(ctx)
    m = message.lower().strip()

    if any(w in m for w in _ACTION_WORDS):
        if any(w in m for w in ("withdraw", "wire", "send money")):
            kind = "withdrawal"
        elif "transfer" in m or "move money" in m:
            kind = "transfer"
        elif any(w in m for w in ("buy ", "sell ", "liquidate", "rebalance")):
            kind = "trade"
        elif "beneficiary" in m:
            kind = "beneficiary change"
        else:
            kind = "account change"
        return act.request_action(kind=kind, details=message)

    if m in ("hi", "hello", "hey") or "what can you" in m or m.startswith("help"):
        s = repo.summary()
        return (
            "Hello — I'm your Certuity associate. I can walk you through your portfolio "
            f"(about {money(s['total_aum'])} across {s['accounts']} accounts), show how any holding "
            "rolls up to your family office, and tell you how things are performing. What would you like to see?"
        )

    if any(w in m for w in ("trace", "lineage", "roll up", "rolls up", "flow up", "where does")):
        acc = _find_account(repo, message)
        return port.trace_lineage(acc["name"] if acc else "Alts+")

    if any(w in m for w in ("perform", "return", "ytd", "year to date", "how is", "how are", "doing", "growth")):
        return port.get_performance()

    if any(w in m for w in ("alloc", "exposure", "breakdown", "diversif", "spread", "mix")):
        return port.get_exposure()

    for word in ("real estate", "property", "properties", "alternative", "alts", "private equity", "brokerage", "managed", "custody"):
        if word in m:
            viz.focus_holding(word)
            return port.get_exposure()

    if any(w in m for w in ("list", "accounts", "holdings", "what do i have", "what do i own")):
        return port.list_accounts()

    acc = _find_account(repo, message)
    if acc:
        return port.get_account(acc["name"])

    if any(w in m for w in ("total", "aum", "net worth", "worth", "how much", "portfolio", "summary", "overview")):
        return port.get_summary()

    s = repo.summary()
    return (
        "I can help with anything about your portfolio — for example your total assets "
        f"({money(s['total_aum'])}), how your real estate or alternatives are doing, or tracing your "
        "Alts+ fund up to the family office. What would you like?"
    )


async def run_turn(message: str, history: list[dict] | None = None) -> dict:
    repo = JsonRepository(settings.demo_client_id)
    ctx = TurnContext()

    injection = await detect_injection(message)
    if injection["flagged"]:
        audit.log("blocked_injection", source=injection["source"], text=message)
        return {"reply": SAFE_REFUSAL, "ui_actions": [], "approvals": [], "blocked": True}

    if is_out_of_scope(message):
        audit.log("out_of_scope", text=message)
        return {"reply": SCOPE_DEFLECT, "ui_actions": [], "approvals": [], "blocked": False}

    if settings.use_mock_llm:
        reply = mock_brain(message, repo, ctx)
    else:
        from app.sk.agent import sk_agent_turn

        reply = await sk_agent_turn(message, history or [], repo, ctx)

    reply = redact(reply)
    audit.log("turn", user=message, reply=reply, ui=len(ctx.ui_actions), approvals=len(ctx.approvals))
    return {
        "reply": reply,
        "ui_actions": ctx.ui_actions,
        "approvals": ctx.approvals,
        "blocked": False,
    }
