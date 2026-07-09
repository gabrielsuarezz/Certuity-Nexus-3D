"""Reconciled data facade: CRM structure + Black Diamond values.

`ReconciledRepository` composes the CRM-shaped `JsonRepository` (entity and
relationship truth) with `BlackDiamondRepository` (market-value and performance
truth), joined only through the ID crosswalk (`crosswalk.json`) — the two systems
share no key space. Structure always comes from the CRM; where a crosswalk link
exists, values and returns are overlaid from Black Diamond with provenance keys,
and `reconcile_book` reports every discrepancy deterministically. All arbitration
happens here in plain Python — the agent only narrates fields this layer computed.
"""

from __future__ import annotations

import json
from datetime import date, timedelta
from pathlib import Path
from typing import Any

from app.data.blackdiamond_repo import BlackDiamondRepository
from app.data.repository import JsonRepository, WealthRepository

CROSSWALK_PATH = Path(__file__).parent / "crosswalk.json"

# Linked values farther apart than this are a variance; under it, rounding noise.
VARIANCE_THRESHOLD_PCT = 0.5
# A BD account this much older than the freshest feed date is a stale feed.
STALE_FEED_DAYS = 30


class ReconciledRepository(WealthRepository):
    def __init__(self, client_id: str) -> None:
        self.crm = JsonRepository(client_id)
        self.bd = BlackDiamondRepository()
        links = json.loads(CROSSWALK_PATH.read_text(encoding="utf-8"))
        self.crm_to_bd = {link["crm_id"]: link["bd_id"] for link in links}
        self.linked_bd_ids = set(self.crm_to_bd.values())

    # ── helpers ───────────────────────────────────────────────────────────
    def _bd_for(self, crm_id: str) -> dict | None:
        bd_id = self.crm_to_bd.get(crm_id)
        return self.bd.get_by_bd_id(bd_id) if bd_id else None

    @staticmethod
    def _variance_pct(bd_value: float, crm_value: float) -> float:
        return round((bd_value - crm_value) / crm_value * 100, 2) if crm_value else 0.0

    def _is_stale(self, as_of: str) -> bool:
        # Measured against the feed's own freshest date, so results never drift.
        feed = date.fromisoformat(self.bd.feed_as_of())
        return date.fromisoformat(as_of) < feed - timedelta(days=STALE_FEED_DAYS)

    def _flag(self, variance_pct: float, as_of: str) -> str:
        if abs(variance_pct) >= VARIANCE_THRESHOLD_PCT:
            return "value_variance"
        if self._is_stale(as_of):
            return "stale_feed"
        return "none"

    def _overlay(self, account: dict[str, Any]) -> dict[str, Any]:
        """Overwrite value/performance with BD truth (when linked) + provenance."""
        bd = self._bd_for(account["id"])
        if not bd:
            account["source"] = "crm_only"
            account["recon_flag"] = "no_bd_link"
            return account
        crm_value = account["value"]
        variance = self._variance_pct(bd["market_value"], crm_value)
        account["value"] = bd["market_value"]
        account["as_of"] = bd["as_of"]
        account["source"] = "black_diamond"
        account["crm_stated_value"] = crm_value
        account["variance_pct"] = variance
        account["recon_flag"] = self._flag(variance, bd["as_of"])
        if "ytd_return_pct" in account:
            account["ytd_return_pct"] = bd["ytd_return_pct"]
        return account

    # ── read API (CRM structure, BD values) ──────────────────────────────
    def summary(self) -> dict[str, Any]:
        s = self.crm.summary()
        s["total_aum"] = round(sum(a["value"] for a in self.list_accounts()), 2)
        s["as_of"] = self.bd.feed_as_of()
        return s

    def list_entities(self) -> list[dict[str, Any]]:
        return self.crm.list_entities()

    def list_accounts(self) -> list[dict[str, Any]]:
        return [self._overlay(a) for a in self.crm.list_accounts()]

    def get_account(self, name_or_id: str) -> dict[str, Any] | None:
        a = self.crm.get_account(name_or_id)
        if not a:
            return None
        a = self._overlay(a)
        bd = self._bd_for(a["id"])
        if bd:
            a["one_year_return_pct"] = bd["one_year_return_pct"]
            a["inception_return_pct"] = bd["inception_return_pct"]
        return a

    def exposure_by_category(self) -> list[dict[str, Any]]:
        accounts = self.list_accounts()
        total = sum(a["value"] for a in accounts) or 1
        buckets: dict[str, float] = {}
        for a in accounts:
            buckets[a["type"]] = buckets.get(a["type"], 0) + a["value"]
        return sorted(
            (
                {"category": k, "value": v, "pct": round(v / total * 100, 1)}
                for k, v in buckets.items()
            ),
            key=lambda x: x["value"],
            reverse=True,
        )

    def lineage(self, account_id: str) -> list[dict[str, str]]:
        return self.crm.lineage(account_id)

    def performance(self) -> dict[str, Any]:
        # Real BD returns for linked accounts; the CRM synthetic only as fallback.
        synthetic = {a["name"]: a["ytd_return_pct"] for a in self.crm.performance()["by_account"]}
        accts = []
        for a in self.list_accounts():
            bd = self._bd_for(a["id"])
            accts.append({
                "name": a["name"], "type": a["type"], "value": a["value"],
                "ytd_return_pct": bd["ytd_return_pct"] if bd else synthetic[a["name"]],
                "source": "black_diamond" if bd else "crm_only",
            })
        linked = [x for x in accts if x["source"] == "black_diamond"]
        total = sum(x["value"] for x in linked) or 1
        weighted = round(sum(x["value"] * x["ytd_return_pct"] for x in linked) / total, 1)
        return {
            "portfolio_ytd_return_pct": weighted,
            "by_account": accts,
            "as_of": self.bd.feed_as_of(),
        }

    # ── reconciliation report ─────────────────────────────────────────────
    def reconcile_book(self) -> dict[str, Any]:
        """Deterministic CRM-vs-BD data-health report: largest value variances
        first, then orphans (BD only), ghosts (CRM only), stale feeds."""
        issues: list[dict[str, Any]] = []
        healthy = 0
        for a in self.crm.list_accounts():
            bd = self._bd_for(a["id"])
            if not bd:
                issues.append({
                    "type": "ghost",
                    "account_name": a["name"],
                    "crm_id": a["id"],
                    "crm_value": a["value"],
                    "suggested_action": "confirm closure and deactivate in CRM",
                })
                continue
            variance = self._variance_pct(bd["market_value"], a["value"])
            if abs(variance) >= VARIANCE_THRESHOLD_PCT:
                issues.append({
                    "type": "value_variance",
                    "account_name": a["name"],
                    "crm_id": a["id"],
                    "bd_id": bd["bd_portfolio_id"],
                    "crm_value": a["value"],
                    "bd_value": bd["market_value"],
                    "variance_pct": variance,
                    "suggested_action": "flag for CRM sync",
                })
            elif self._is_stale(bd["as_of"]):
                issues.append({
                    "type": "stale_feed",
                    "account_name": a["name"],
                    "crm_id": a["id"],
                    "bd_id": bd["bd_portfolio_id"],
                    "as_of": bd["as_of"],
                    "suggested_action": "check custodial feed connection",
                })
            else:
                healthy += 1
        for bd in self.bd.list_all():
            if bd["bd_portfolio_id"] not in self.linked_bd_ids:
                issues.append({
                    "type": "orphan",
                    "account_name": bd["account_name"],
                    "bd_id": bd["bd_portfolio_id"],
                    "bd_value": bd["market_value"],
                    "as_of": bd["as_of"],
                    "suggested_action": "create CRM record",
                })
        rank = {"value_variance": 0, "orphan": 1, "ghost": 2, "stale_feed": 3}
        issues.sort(key=lambda i: (rank[i["type"]], -abs(i.get("variance_pct", 0.0)), i["account_name"]))
        return {"as_of": self.bd.feed_as_of(), "healthy_count": healthy, "issues": issues}
