"""Reconciliation-layer tests (run in mock mode, no keys needed).
Run from server/:  .venv/Scripts/python -m pytest -q

Covers the CRM-vs-Black Diamond join: each planted discrepancy (orphan, ghost,
value variance, stale feed) is detected with the right fields, linked accounts
carry BD values + provenance, the default json source is byte-for-byte
unchanged, and `reconcile_book` is deterministic.
"""

import asyncio

from app.config import settings
from app.data.reconciled_repo import ReconciledRepository
from app.data.repository import JsonRepository
from app.sk.orchestrator import run_turn


def _repo() -> ReconciledRepository:
    return ReconciledRepository(settings.demo_client_id)


def _issues_of(report: dict, kind: str) -> list[dict]:
    return [i for i in report["issues"] if i["type"] == kind]


def test_orphan_detected():
    orphans = _issues_of(_repo().reconcile_book(), "orphan")
    assert len(orphans) == 1
    o = orphans[0]
    assert o["bd_id"] == "BD-90455"
    assert "crm_id" not in o  # no CRM counterpart, by construction
    assert o["bd_value"] == 2_750_000
    assert o["suggested_action"] == "create CRM record"


def test_ghost_detected():
    ghosts = _issues_of(_repo().reconcile_book(), "ghost")
    assert len(ghosts) == 1
    g = ghosts[0]
    assert g["crm_id"] == "a0F8d00000JPM001"
    assert "bd_id" not in g  # closed at custodian — nothing in the BD feed
    assert g["crm_value"] == 60_000_000
    assert g["suggested_action"] == "confirm closure and deactivate in CRM"


def test_value_variances_detected_largest_first():
    report = _repo().reconcile_book()
    variances = _issues_of(report, "value_variance")
    assert [v["account_name"] for v in variances] == [
        "Hamilton Lane Private Equity",  # ~9% — the big one
        "Fidelity Managed Account",  # ~1.6% — the small one
    ]
    big, small = variances
    assert big["variance_pct"] == 9.05
    assert (big["crm_value"], big["bd_value"]) == (60_000_000, 65_430_000)
    assert small["variance_pct"] == 1.59
    assert (small["crm_value"], small["bd_value"]) == (80_000_000, 81_275_900)
    assert all(v["suggested_action"] == "flag for CRM sync" for v in variances)
    # Variances always lead the report.
    assert report["issues"][:2] == variances


def test_stale_feed_detected():
    stale = _issues_of(_repo().reconcile_book(), "stale_feed")
    assert len(stale) == 1
    assert stale[0]["account_name"] == "Alts+ Fund"
    assert stale[0]["as_of"] == "2026-03-31"
    assert stale[0]["suggested_action"] == "check custodial feed connection"


def test_linked_account_carries_bd_value_and_provenance():
    a = _repo().get_account("Fidelity")
    assert a["value"] == 81_275_900  # BD is value truth…
    assert a["crm_stated_value"] == 80_000_000  # …and the CRM figure is kept
    assert a["source"] == "black_diamond"
    assert a["as_of"] == "2026-07-08"
    assert a["variance_pct"] == 1.59
    assert a["recon_flag"] == "value_variance"
    assert a["ytd_return_pct"] == 7.9  # real BD return, not the synthetic hash
    # Every key the json source returns is still present (only additions).
    json_keys = set(JsonRepository(settings.demo_client_id).get_account("Fidelity"))
    assert json_keys <= set(a)


def test_ghost_account_still_served_from_crm():
    a = _repo().get_account("J.P. Morgan Private Bank")
    assert a["value"] == 60_000_000
    assert a["source"] == "crm_only"
    assert a["recon_flag"] == "no_bd_link"


def test_json_source_unchanged():
    # The default data source must behave exactly as before the overlay existed.
    assert JsonRepository(settings.demo_client_id).get_account("Schwab Brokerage") == {
        "id": "a0F8d00000Schw01",
        "name": "Schwab Brokerage",
        "type": "Brokerage",
        "custodian": "Charles Schwab",
        "value": 88000000,
        "account_number": "****4821",
        "liquidity": "Daily",
        "as_of": "2026-06-20",
        "entity": "Smith Family Irrevocable Trust",
        "ytd_return_pct": 8.8,
    }


def test_reconcile_book_is_deterministic_and_ordered():
    repo = _repo()
    first, second = repo.reconcile_book(), repo.reconcile_book()
    assert first == second
    assert first == _repo().reconcile_book()  # stable across instances too
    assert first["as_of"] == "2026-07-08"
    assert first["healthy_count"] == 4
    assert [i["type"] for i in first["issues"]] == [
        "value_variance", "value_variance", "orphan", "ghost", "stale_feed",
    ]


def test_mock_brain_answers_data_health(monkeypatch):
    monkeypatch.setattr(settings, "data_source", "reconciled")
    r = asyncio.run(run_turn("Run a data health check — do our systems agree?"))
    assert r["blocked"] is False
    for name in ("Hamilton Lane", "Fidelity", "Schwab Cash Sweep", "J.P. Morgan", "Alts+"):
        assert name in r["reply"]  # every planted issue is surfaced
    assert "9.05" in r["reply"]


def test_mock_brain_cites_bd_value_and_variance(monkeypatch):
    monkeypatch.setattr(settings, "data_source", "reconciled")
    r = asyncio.run(run_turn("What is my Fidelity account worth?"))
    assert "$81.3M" in r["reply"]  # BD value, not the CRM's $80.0M
    assert "2026-07-08" in r["reply"]
    assert "1.59" in r["reply"]  # the CRM variance is mentioned
