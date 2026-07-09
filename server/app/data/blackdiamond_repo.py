"""Black Diamond portfolio-accounting source.

`BlackDiamondRepository` reads the bundled SS&C Black Diamond-shaped export
(`blackDiamond.json`): custodian-fed market values, positions, and performance,
keyed by BD portfolio IDs — a deliberately separate key space from the CRM's
Salesforce IDs. It is a raw source, not a `WealthRepository`; the join to CRM
structure happens in `ReconciledRepository` via the ID crosswalk.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

BD_DATA_PATH = Path(__file__).parent / "blackDiamond.json"


class BlackDiamondRepository:
    def __init__(self, path: Path = BD_DATA_PATH) -> None:
        raw = json.loads(path.read_text(encoding="utf-8"))
        self.accounts: list[dict] = raw.get("accounts", [])

    def get_by_bd_id(self, bd_id: str) -> dict[str, Any] | None:
        return next((a for a in self.accounts if a["bd_portfolio_id"] == bd_id), None)

    def list_all(self) -> list[dict[str, Any]]:
        return list(self.accounts)

    def feed_as_of(self) -> str:
        """Freshest `as_of` in the feed — the reconciliation reference date."""
        return max(a["as_of"] for a in self.accounts)
