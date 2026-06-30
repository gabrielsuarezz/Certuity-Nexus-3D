"""Live Salesforce data source. Reads the client's data from the Salentica-shaped
custom objects (Relationship__c -> Portfolio__c -> FinancialAccount__c) over the
REST/SOQL API, authenticating with OAuth client credentials. Implements the same
WealthRepository interface as JsonRepository — selected via DATA_SOURCE=salesforce.

Records are keyed by External_Id__c (the original ids), so the agent's map actions
still line up with the 3D map's node ids. A short cache keeps turns snappy while
still reading live from the CRM.
"""

from __future__ import annotations

import time

import httpx

from app.config import settings
from app.data.repository import WealthRepository, _ytd_pct

_API = "v59.0"
_TOKEN: dict = {"access_token": "", "instance_url": "", "exp": 0.0}
_CACHE: dict[str, tuple[float, dict]] = {}
_TTL = 60.0


def _token() -> tuple[str, str]:
    now = time.time()
    if _TOKEN["access_token"] and _TOKEN["exp"] > now:
        return _TOKEN["access_token"], _TOKEN["instance_url"]
    r = httpx.post(
        settings.sf_instance_url + "/services/oauth2/token",
        data={"grant_type": "client_credentials", "client_id": settings.sf_consumer_key, "client_secret": settings.sf_consumer_secret},
        timeout=30,
    )
    r.raise_for_status()
    j = r.json()
    _TOKEN.update(access_token=j["access_token"], instance_url=j["instance_url"], exp=now + 3000)
    return _TOKEN["access_token"], _TOKEN["instance_url"]


def _query(soql: str) -> list[dict]:
    tok, inst = _token()
    r = httpx.get(inst + f"/services/data/{_API}/query", headers={"Authorization": "Bearer " + tok}, params={"q": soql}, timeout=30)
    r.raise_for_status()
    return r.json().get("records", [])


def _fetch(client_id: str) -> dict:
    rels = _query(
        "SELECT Id, External_Id__c, Name, Relationship_Type__c, Total_AUM__c, Primary_Advisor__c "
        f"FROM Relationship__c WHERE External_Id__c = '{client_id}'"
    )
    if not rels:
        raise PermissionError("Repository is scoped to a single client.")
    rel = rels[0]
    ports = _query(
        "SELECT Id, External_Id__c, Name, Entity_Type__c, AUM__c, Jurisdiction__c "
        f"FROM Portfolio__c WHERE Relationship__c = '{rel['Id']}'"
    )
    sf_to_ext = {p["Id"]: p["External_Id__c"] for p in ports}
    accts = []
    if sf_to_ext:
        ids = "','".join(sf_to_ext)
        accts = _query(
            "SELECT External_Id__c, Name, Account_Type__c, Custodian__c, Market_Value__c, "
            "Account_Number__c, Liquidity__c, As_Of_Date__c, Portfolio__c "
            f"FROM FinancialAccount__c WHERE Portfolio__c IN ('{ids}')"
        )
    return {
        "household": {"id": rel["External_Id__c"], "name": rel["Name"], "type": rel["Relationship_Type__c"],
                      "total_aum": rel["Total_AUM__c"], "advisor": rel["Primary_Advisor__c"]},
        "portfolios": [{"id": p["External_Id__c"], "name": p["Name"], "type": p["Entity_Type__c"],
                        "aum": p["AUM__c"], "jurisdiction": p["Jurisdiction__c"]} for p in ports],
        "accounts": [{"id": a["External_Id__c"], "name": a["Name"], "type": a["Account_Type__c"],
                      "custodian": a["Custodian__c"], "value": a["Market_Value__c"], "account_number": a["Account_Number__c"],
                      "liquidity": a["Liquidity__c"], "as_of": a["As_Of_Date__c"], "portfolio_id": sf_to_ext.get(a["Portfolio__c"])}
                     for a in accts],
    }


class SalesforceRepository(WealthRepository):
    def __init__(self, client_id: str) -> None:
        now = time.time()
        cached = _CACHE.get(client_id)
        if cached and now - cached[0] < _TTL:
            data = cached[1]
        else:
            data = _fetch(client_id)
            _CACHE[client_id] = (now, data)
        self.household = data["household"]
        self.portfolios = data["portfolios"]
        self.accounts = data["accounts"]

    def _entity(self, pid: str | None) -> dict | None:
        return next((p for p in self.portfolios if p["id"] == pid), None)

    def summary(self) -> dict:
        h = self.household
        return {"household": h["name"], "type": h["type"], "total_aum": h["total_aum"],
                "advisor": h["advisor"], "entities": len(self.portfolios), "accounts": len(self.accounts)}

    def list_entities(self) -> list[dict]:
        return [{"id": p["id"], "name": p["name"], "type": p["type"], "aum": p["aum"], "jurisdiction": p["jurisdiction"]}
                for p in self.portfolios]

    def list_accounts(self) -> list[dict]:
        return [{"id": a["id"], "name": a["name"], "type": a["type"], "custodian": a["custodian"],
                 "value": a["value"], "entity": (self._entity(a["portfolio_id"]) or {}).get("name")}
                for a in self.accounts]

    def get_account(self, name_or_id: str) -> dict | None:
        q = (name_or_id or "").strip().lower()
        a = next((x for x in self.accounts if x["id"].lower() == q or q in x["name"].lower()), None)
        if not a:
            return None
        return {"id": a["id"], "name": a["name"], "type": a["type"], "custodian": a["custodian"], "value": a["value"],
                "account_number": a["account_number"], "liquidity": a["liquidity"], "as_of": a["as_of"],
                "entity": (self._entity(a["portfolio_id"]) or {}).get("name"), "ytd_return_pct": _ytd_pct(a["id"], a["type"])}

    def exposure_by_category(self) -> list[dict]:
        total = self.household["total_aum"] or 1
        buckets: dict[str, float] = {}
        for a in self.accounts:
            buckets[a["type"]] = buckets.get(a["type"], 0) + a["value"]
        return sorted(({"category": k, "value": v, "pct": round(v / total * 100, 1)} for k, v in buckets.items()),
                      key=lambda x: x["value"], reverse=True)

    def lineage(self, account_id: str) -> list[dict]:
        a = next((x for x in self.accounts if x["id"] == account_id), None)
        if not a:
            return []
        chain = [{"id": a["id"], "name": a["name"], "tier": "account"}]
        p = self._entity(a["portfolio_id"])
        if p:
            chain.append({"id": p["id"], "name": p["name"], "tier": "entity"})
        chain.append({"id": self.household["id"], "name": self.household["name"], "tier": "household"})
        return chain

    def performance(self) -> dict:
        accts = [{"name": a["name"], "type": a["type"], "value": a["value"], "ytd_return_pct": _ytd_pct(a["id"], a["type"])}
                 for a in self.accounts]
        total = sum(a["value"] for a in accts) or 1
        weighted = round(sum(a["value"] * a["ytd_return_pct"] for a in accts) / total, 1)
        return {"portfolio_ytd_return_pct": weighted, "by_account": accts}
