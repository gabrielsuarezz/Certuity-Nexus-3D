"""In-memory human-in-the-loop approval store. Nothing here moves real money —
approving simply marks the (mock) request executed and writes an audit record."""

import time
import uuid

from app.guardrails import audit

_store: dict[str, dict] = {}


def create(kind: str, details: str) -> dict:
    aid = uuid.uuid4().hex[:8]
    rec = {"id": aid, "kind": kind, "details": details, "status": "pending", "ts": time.time()}
    _store[aid] = rec
    audit.log("action_requested", id=aid, kind=kind, details=details)
    return rec


def decide(aid: str, approve: bool) -> dict | None:
    rec = _store.get(aid)
    if not rec:
        return None
    rec["status"] = "approved" if approve else "declined"
    audit.log("action_" + rec["status"], id=aid, kind=rec["kind"])
    return rec


def get(aid: str) -> dict | None:
    return _store.get(aid)
