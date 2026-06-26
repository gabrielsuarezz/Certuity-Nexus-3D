"""Portfolio data access.

`WealthRepository` is the seam: today it reads the bundled Salentica-shaped mock
(`familyOffice.json`); a SS&C Black Diamond / Salentica / Azure SQL implementation
drops in behind the same interface later. Every accessor is scoped to ONE client.
"""

from __future__ import annotations

import json
import hashlib
from pathlib import Path
from typing import Any

DATA_PATH = Path(__file__).parent / "familyOffice.json"


def _records(envelope: dict | None) -> list[dict]:
    return (envelope or {}).get("records", [])


def _ytd_pct(account_id: str, account_type: str) -> float:
    """Deterministic, plausible synthetic YTD return (mock 'performance')."""
    base = {
        "Brokerage": 9.0,
        "Managed Account": 7.5,
        "Alternative Investment": 14.0,
        "Custody": 3.5,
        "Direct Real Estate": 6.0,
    }.get(account_type, 6.5)
    jitter = (int(hashlib.md5(account_id.encode()).hexdigest(), 16) % 90) / 10 - 4.5
    return round(base + jitter, 1)


class WealthRepository:
    """Interface (data-source agnostic)."""

    def summary(self) -> dict[str, Any]: ...
    def list_accounts(self) -> list[dict[str, Any]]: ...
    def get_account(self, name_or_id: str) -> dict[str, Any] | None: ...
    def exposure_by_category(self) -> list[dict[str, Any]]: ...
    def lineage(self, account_id: str) -> list[dict[str, str]]: ...
    def performance(self) -> dict[str, Any]: ...


class JsonRepository(WealthRepository):
    def __init__(self, client_id: str, path: Path = DATA_PATH) -> None:
        raw = json.loads(path.read_text(encoding="utf-8"))
        self.household = _records(raw.get("SalenticaLMNTS__Relationship__c"))[0]
        self.portfolios = _records(raw.get("SalenticaLMNTS__Portfolio__c"))
        self.accounts = _records(raw.get("SalenticaLMNTS__FinancialAccount__c"))
        # Least privilege: refuse to operate on any client but the bound one.
        if self.household["Id"] != client_id:
            raise PermissionError("Repository is scoped to a single client.")

    # ── helpers ───────────────────────────────────────────────────────────
    def _portfolio(self, pid: str) -> dict | None:
        return next((p for p in self.portfolios if p["Id"] == pid), None)

    def _accounts_of(self, pid: str) -> list[dict]:
        return [a for a in self.accounts if a["SalenticaLMNTS__Portfolio__c"] == pid]

    # ── read API (all client-scoped) ─────────────────────────────────────
    def summary(self) -> dict[str, Any]:
        return {
            "household": self.household["Name"],
            "type": self.household["SalenticaLMNTS__Relationship_Type__c"],
            "total_aum": self.household["SalenticaLMNTS__Total_AUM__c"],
            "advisor": self.household["SalenticaLMNTS__Primary_Advisor__c"],
            "entities": len(self.portfolios),
            "accounts": len(self.accounts),
        }

    def list_entities(self) -> list[dict[str, Any]]:
        return [
            {
                "id": p["Id"],
                "name": p["Name"],
                "type": p["SalenticaLMNTS__Entity_Type__c"],
                "aum": p["SalenticaLMNTS__AUM__c"],
                "jurisdiction": p["SalenticaLMNTS__Jurisdiction__c"],
            }
            for p in self.portfolios
        ]

    def list_accounts(self) -> list[dict[str, Any]]:
        return [
            {
                "id": a["Id"],
                "name": a["Name"],
                "type": a["SalenticaLMNTS__Account_Type__c"],
                "custodian": a["SalenticaLMNTS__Custodian__c"],
                "value": a["SalenticaLMNTS__Market_Value__c"],
                "entity": (self._portfolio(a["SalenticaLMNTS__Portfolio__c"]) or {}).get("Name"),
            }
            for a in self.accounts
        ]

    def get_account(self, name_or_id: str) -> dict[str, Any] | None:
        q = name_or_id.strip().lower()
        a = next(
            (
                x
                for x in self.accounts
                if x["Id"].lower() == q or q in x["Name"].lower()
            ),
            None,
        )
        if not a:
            return None
        return {
            "id": a["Id"],
            "name": a["Name"],
            "type": a["SalenticaLMNTS__Account_Type__c"],
            "custodian": a["SalenticaLMNTS__Custodian__c"],
            "value": a["SalenticaLMNTS__Market_Value__c"],
            "account_number": a["SalenticaLMNTS__Account_Number__c"],  # already masked
            "liquidity": a["SalenticaLMNTS__Liquidity__c"],
            "as_of": a["SalenticaLMNTS__As_Of_Date__c"],
            "entity": (self._portfolio(a["SalenticaLMNTS__Portfolio__c"]) or {}).get("Name"),
            "ytd_return_pct": _ytd_pct(a["Id"], a["SalenticaLMNTS__Account_Type__c"]),
        }

    def exposure_by_category(self) -> list[dict[str, Any]]:
        total = self.household["SalenticaLMNTS__Total_AUM__c"] or 1
        buckets: dict[str, float] = {}
        for a in self.accounts:
            buckets[a["SalenticaLMNTS__Account_Type__c"]] = (
                buckets.get(a["SalenticaLMNTS__Account_Type__c"], 0)
                + a["SalenticaLMNTS__Market_Value__c"]
            )
        return sorted(
            (
                {"category": k, "value": v, "pct": round(v / total * 100, 1)}
                for k, v in buckets.items()
            ),
            key=lambda x: x["value"],
            reverse=True,
        )

    def lineage(self, account_id: str) -> list[dict[str, str]]:
        a = next((x for x in self.accounts if x["Id"] == account_id), None)
        if not a:
            return []
        p = self._portfolio(a["SalenticaLMNTS__Portfolio__c"])
        chain = [{"id": a["Id"], "name": a["Name"], "tier": "account"}]
        if p:
            chain.append({"id": p["Id"], "name": p["Name"], "tier": "entity"})
        chain.append({"id": self.household["Id"], "name": self.household["Name"], "tier": "household"})
        return chain

    def performance(self) -> dict[str, Any]:
        accts = [
            {"name": a["name"], "type": a["type"], "value": a["value"],
             "ytd_return_pct": _ytd_pct(a["id"], a["type"])}
            for a in self.list_accounts()
        ]
        total = sum(a["value"] for a in accts) or 1
        weighted = round(sum(a["value"] * a["ytd_return_pct"] for a in accts) / total, 1)
        return {"portfolio_ytd_return_pct": weighted, "by_account": accts}
