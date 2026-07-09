import json
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app import approvals
from app.briefing import build_briefing
from app.config import settings
from app.documents import analyze_document
from app.data.repository import make_repository
from app.guardrails import audit
from app.llm.openai_compat import chat_completions
from app.realtime import hub
from app.sk.context import TurnContext
from app.sk.orchestrator import run_turn
from app.sk.plugins.actions import ActionsPlugin
from app.sk.plugins.portfolio import PortfolioPlugin

DATA = Path(__file__).parent / "data" / "familyOffice.json"

app = FastAPI(title="Certuity Prism — Private Associate")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _warm_semantic_kernel() -> None:
    """Pre-import the heavy Semantic Kernel modules at startup so the FIRST live
    turn isn't stalled by a multi-second import — which could otherwise make
    ElevenLabs drop the very first voice call on a freshly deployed container."""
    if settings.use_mock_llm:
        return
    try:
        import semantic_kernel  # noqa: F401
        from semantic_kernel import Kernel  # noqa: F401
        from semantic_kernel.connectors.ai import FunctionChoiceBehavior  # noqa: F401
        from semantic_kernel.connectors.ai.open_ai import OpenAIChatCompletion  # noqa: F401
        from semantic_kernel.contents import ChatHistory  # noqa: F401
    except Exception:
        pass


@app.get("/healthz")
def healthz():
    return {"ok": True, "mock_llm": settings.use_mock_llm, "data_source": settings.data_source}


@app.get("/api/config")
def config():
    return {
        "agentId": settings.elevenlabs_agent_id,
        "voiceEnabled": bool(settings.elevenlabs_agent_id),
        "mockLlm": settings.use_mock_llm,
    }


@app.get("/api/briefing")
def briefing():
    """Proactive opening briefing for the demo client (client-scoped)."""
    return build_briefing(make_repository(settings.demo_client_id))


@app.post("/api/document/analyze")
async def analyze_doc(file: UploadFile = File(...)):
    """Sanitize, injection-screen, and summarize an uploaded client document."""
    data = await file.read()
    repo = make_repository(settings.demo_client_id)
    return await analyze_document(data, file.filename or "document", repo)


@app.get("/api/recon-flags")
def recon_flags():
    """Per-account data-health flags for the map's amber badges (client-scoped,
    read-only). Empty unless the data source carries a reconciliation overlay."""
    accounts = make_repository(settings.demo_client_id).list_accounts()
    return {
        "flags": {
            a["id"]: a["recon_flag"]
            for a in accounts
            if a.get("recon_flag") and a["recon_flag"] != "none"
        }
    }


@app.get("/api/wealth-graph")
def wealth_graph():
    """Realizes the frontend's service seam: serve the Salesforce-shaped portfolio."""
    return JSONResponse(json.loads(DATA.read_text(encoding="utf-8")))


# ── Text chat path: full SK/mock agent loop, streamed over WebSocket ──────────
@app.websocket("/ws/agent")
async def ws_agent(ws: WebSocket):
    await ws.accept()
    hub.join(ws)  # also receives voice-path UI pushes (map moves / approvals)
    history: list[dict] = []
    try:
        while True:
            data = json.loads(await ws.receive_text())
            text = (data.get("text") or "").strip()
            if not text:
                continue
            result = await run_turn(text, history)
            history.append({"role": "user", "content": text})
            history.append({"role": "assistant", "content": result["reply"]})
            await ws.send_text(json.dumps({"type": "reply", **result}))
    except WebSocketDisconnect:
        return
    finally:
        hub.leave(ws)


# ── ElevenLabs server tools (read-only, client-scoped, audited) ───────────────
def _portfolio() -> PortfolioPlugin:
    return PortfolioPlugin(make_repository(settings.demo_client_id), TurnContext())


class NameIn(BaseModel):
    name: str = ""


class ActionIn(BaseModel):
    kind: str
    details: str = ""


@app.post("/tools/get_summary")
def t_summary():
    audit.log("tool", name="get_summary")
    return {"result": _portfolio().get_summary()}


@app.post("/tools/get_exposure")
def t_exposure():
    audit.log("tool", name="get_exposure")
    return {"result": _portfolio().get_exposure()}


@app.post("/tools/get_performance")
def t_performance():
    audit.log("tool", name="get_performance")
    return {"result": _portfolio().get_performance()}


@app.post("/tools/list_accounts")
def t_list():
    audit.log("tool", name="list_accounts")
    return {"result": _portfolio().list_accounts()}


@app.post("/tools/get_account")
def t_account(body: NameIn):
    audit.log("tool", name="get_account", arg=body.name)
    return {"result": _portfolio().get_account(body.name)}


@app.post("/tools/trace_lineage")
def t_trace(body: NameIn):
    audit.log("tool", name="trace_lineage", arg=body.name)
    return {"result": _portfolio().trace_lineage(body.name)}


@app.post("/tools/request_action")
def t_action(body: ActionIn):
    ctx = TurnContext()
    msg = ActionsPlugin(ctx).request_action(kind=body.kind, details=body.details)
    return {"result": msg, "approvals": ctx.approvals}


# ── Human-in-the-loop approvals ───────────────────────────────────────────────
@app.post("/approvals/{aid}/approve")
def approve(aid: str):
    rec = approvals.decide(aid, True)
    return rec or JSONResponse({"error": "not found"}, status_code=404)


@app.post("/approvals/{aid}/decline")
def decline(aid: str):
    rec = approvals.decide(aid, False)
    return rec or JSONResponse({"error": "not found"}, status_code=404)


# ── ElevenLabs custom LLM (guardrailed Azure OpenAI proxy) ────────────────────
# ElevenLabs custom-LLM (guardrailed SK brain). Aliased so the agent's "Server URL"
# can be set to .../llm/v1, .../llm, /v1, or the full path — all resolve here.
@app.post("/llm/v1/chat/completions")
@app.post("/llm/chat/completions")
@app.post("/v1/chat/completions")
@app.post("/chat/completions")
async def llm(body: dict):
    return await chat_completions(body)
