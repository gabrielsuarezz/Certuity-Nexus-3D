import json
import time
from pathlib import Path

from app.config import settings
from app.guardrails.redaction import redact

_PATH = Path(settings.audit_log_path)


def log(event: str, **fields) -> dict:
    """Append a redacted audit record (one JSON object per line)."""
    record = {
        "ts": round(time.time(), 3),
        "event": event,
        "client": settings.demo_client_id,
    }
    for key, value in fields.items():
        record[key] = redact(value) if isinstance(value, str) else value
    try:
        with _PATH.open("a", encoding="utf-8") as f:
            f.write(json.dumps(record) + "\n")
    except Exception:
        pass
    return record
