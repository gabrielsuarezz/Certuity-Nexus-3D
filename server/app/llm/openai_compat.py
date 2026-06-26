"""OpenAI-compatible /v1/chat/completions for ElevenLabs' "custom LLM".

ElevenLabs Conversational AI calls this as its LLM; we run an input injection
guard, forward to Azure OpenAI (passing through any tools ElevenLabs defined),
and redact output. Streams in OpenAI SSE format.
"""

from __future__ import annotations

import asyncio
import json
import time
import uuid

from fastapi.responses import JSONResponse, StreamingResponse

from app.config import settings
from app.guardrails.content_safety import detect_injection
from app.guardrails.redaction import redact

REFUSAL = (
    "I'm sorry, but I can't help with that — I can only assist with your own Certuity "
    "portfolio. I'd be glad to connect you with your advisor if you'd like."
)


def _last_user(messages: list[dict]) -> str:
    for msg in reversed(messages):
        if msg.get("role") == "user":
            content = msg.get("content")
            if isinstance(content, list):
                return " ".join(p.get("text", "") for p in content if isinstance(p, dict))
            return content or ""
    return ""


def _completion(text: str) -> dict:
    return {
        "id": "chatcmpl-" + uuid.uuid4().hex[:12],
        "object": "chat.completion",
        "created": int(time.time()),
        "model": settings.azure_openai_deployment,
        "choices": [{"index": 0, "message": {"role": "assistant", "content": text}, "finish_reason": "stop"}],
    }


def _chunk(text: str, done: bool = False) -> dict:
    return {
        "id": "chatcmpl-stream",
        "object": "chat.completion.chunk",
        "created": int(time.time()),
        "model": settings.azure_openai_deployment,
        "choices": [{"index": 0, "delta": ({} if done else {"content": text}), "finish_reason": ("stop" if done else None)}],
    }


async def chat_completions(body: dict):
    messages = body.get("messages", [])
    tools = body.get("tools")
    stream = bool(body.get("stream"))

    injection = await detect_injection(_last_user(messages))
    if injection["flagged"]:
        if stream:
            def refusal_gen():
                yield f"data: {json.dumps(_chunk(REFUSAL))}\n\n"
                yield f"data: {json.dumps(_chunk('', done=True))}\n\n"
                yield "data: [DONE]\n\n"

            return StreamingResponse(refusal_gen(), media_type="text/event-stream")
        return JSONResponse(_completion(REFUSAL))

    from openai import AzureOpenAI

    client = AzureOpenAI(
        api_key=settings.azure_openai_api_key,
        azure_endpoint=settings.azure_openai_endpoint,
        api_version=settings.azure_openai_api_version,
    )
    kwargs: dict = {"model": settings.azure_openai_deployment, "messages": messages, "temperature": 0.3, "max_tokens": 600}
    if tools:
        kwargs["tools"] = tools
        kwargs["tool_choice"] = body.get("tool_choice", "auto")

    if stream:
        def gen():
            for chunk in client.chat.completions.create(stream=True, **kwargs):
                yield f"data: {json.dumps(chunk.model_dump())}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(gen(), media_type="text/event-stream")

    resp = await asyncio.to_thread(lambda: client.chat.completions.create(**kwargs))
    data = resp.model_dump()
    for choice in data.get("choices", []):
        msg = choice.get("message") or {}
        if msg.get("content"):
            msg["content"] = redact(msg["content"])
    return JSONResponse(data)
