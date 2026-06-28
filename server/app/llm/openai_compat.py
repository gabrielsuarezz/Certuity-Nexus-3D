"""OpenAI-compatible /v1/chat/completions for ElevenLabs' "custom LLM".

ElevenLabs Conversational AI calls this as its LLM. Rather than a thin proxy, we
run the SAME guardrailed Semantic Kernel brain the text path uses (`run_turn`):
it grounds answers in the client's real portfolio, enforces injection/scope/PII
guards, and gates actions behind human approval. Any map movements or approval
cards the turn produces are pushed to the browser over its open /ws/agent socket
(see app.realtime.hub), so the 3D map reacts live while the associate speaks.
Responses are returned in OpenAI format (streaming SSE when requested).
"""

from __future__ import annotations

import json
import time
import uuid

from fastapi.responses import JSONResponse, StreamingResponse

from app.config import settings
from app.realtime import hub
from app.sk.orchestrator import run_turn


def _model_name() -> str:
    return (
        settings.azure_openai_deployment
        if settings.llm_provider == "azure"
        else settings.github_models_model
    )


def _flatten(content) -> str:
    if isinstance(content, list):
        return " ".join(p.get("text", "") for p in content if isinstance(p, dict))
    return content or ""


def _split(messages: list[dict]) -> tuple[str, list[dict]]:
    """Split OpenAI-style messages into (latest user text, prior chat history)."""
    last_user_idx = None
    for i in range(len(messages) - 1, -1, -1):
        if messages[i].get("role") == "user":
            last_user_idx = i
            break

    user_text = ""
    history: list[dict] = []
    for i, msg in enumerate(messages):
        role = msg.get("role")
        text = _flatten(msg.get("content"))
        if i == last_user_idx:
            user_text = text
        elif role in ("user", "assistant"):
            history.append({"role": role, "content": text})
    return user_text, history


def _completion(text: str) -> dict:
    return {
        "id": "chatcmpl-" + uuid.uuid4().hex[:12],
        "object": "chat.completion",
        "created": int(time.time()),
        "model": _model_name(),
        "choices": [{"index": 0, "message": {"role": "assistant", "content": text}, "finish_reason": "stop"}],
    }


def _chunk(text: str, role: bool = False, done: bool = False) -> dict:
    delta: dict = {}
    if not done:
        if role:
            delta["role"] = "assistant"
        delta["content"] = text
    return {
        "id": "chatcmpl-stream",
        "object": "chat.completion.chunk",
        "created": int(time.time()),
        "model": _model_name(),
        "choices": [{"index": 0, "delta": delta, "finish_reason": ("stop" if done else None)}],
    }


async def chat_completions(body: dict):
    messages = body.get("messages", [])
    stream = bool(body.get("stream"))

    user_text, history = _split(messages)

    # Full guardrailed SK brain: grounding + injection/scope/PII guards + human-in-the-loop.
    result = await run_turn(user_text, history)
    reply = result["reply"]

    # Push any map actions / approvals to the browser's open socket → live 3D map during voice.
    if result.get("ui_actions") or result.get("approvals"):
        await hub.broadcast(
            {
                "type": "voice_ui",
                "ui_actions": result.get("ui_actions", []),
                "approvals": result.get("approvals", []),
            }
        )

    if stream:
        def gen():
            yield f"data: {json.dumps(_chunk(reply, role=True))}\n\n"
            yield f"data: {json.dumps(_chunk('', done=True))}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(gen(), media_type="text/event-stream")

    return JSONResponse(_completion(reply))
