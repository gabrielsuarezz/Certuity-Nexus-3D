"""Prompt-injection / jailbreak detection.

Uses Azure AI Content Safety **Prompt Shields** when configured; otherwise falls
back to a local heuristic so the guardrail still works with no keys. Also covers
'indirect' injection in any document/tool text passed as `documents`.
"""

import re

import httpx

from app.config import settings

_HEURISTICS = re.compile(
    "|".join(
        [
            r"ignore (all|any|the|your|previous|prior) (instruction|rule|prompt)",
            r"disregard (the|your|all|any) (instruction|rule|system|prompt)",
            r"you are now",
            r"reveal (your|the) (system )?(prompt|instructions|rules)",
            r"developer mode|jailbreak|do anything now|\bDAN\b",
            r"pretend (to be|you are)",
            r"\bact as\b",
            r"(other|another|different|all) (client|customer|account holder|portfolio)s?",
            r"bypass (the|your|all|any|safety|guard)",
            r"exfiltrate|leak (the|your)|print (the|your) (system|prompt|keys?)",
        ]
    ),
    re.IGNORECASE,
)


def _heuristic(text: str) -> bool:
    return bool(_HEURISTICS.search(text or ""))


async def detect_injection(text: str, documents: list[str] | None = None) -> dict:
    """-> {flagged: bool, source: 'prompt_shields'|'heuristic'}."""
    documents = documents or []
    if settings.content_safety_ready:
        try:
            url = (
                settings.azure_content_safety_endpoint.rstrip("/")
                + "/contentsafety/text:shieldPrompt?api-version=2024-09-01"
            )
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(
                    url,
                    headers={"Ocp-Apim-Subscription-Key": settings.azure_content_safety_key},
                    json={"userPrompt": text, "documents": documents},
                )
                resp.raise_for_status()
                data = resp.json()
                flagged = bool(
                    data.get("userPromptAnalysis", {}).get("attackDetected")
                ) or any(d.get("attackDetected") for d in data.get("documentsAnalysis", []))
                return {"flagged": flagged, "source": "prompt_shields"}
        except Exception:
            pass  # network/api issue → fall through to heuristic
    flagged = _heuristic(text) or any(_heuristic(d) for d in documents)
    return {"flagged": flagged, "source": "heuristic"}
