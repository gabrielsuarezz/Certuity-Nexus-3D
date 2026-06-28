"""What-if scenario modeling. Recomputes allocation, concentration and liquidity
under a hypothetical change — committing capital to a category, or selling a
holding — grounded in the client's real positions. Nothing is ever changed; this
only projects the impact. Commitments are funded from (and sale proceeds land in)
liquidity, so total AUM is held constant."""

from __future__ import annotations

from app.data.repository import WealthRepository
from app.util import money

_LIQUID_TYPES = {"Brokerage", "Managed Account", "Custody"}
_FUND_FROM = "Brokerage"

_ALIASES = {
    "real estate": "Direct Real Estate", "property": "Direct Real Estate", "properties": "Direct Real Estate",
    "alternative": "Alternative Investment", "alternatives": "Alternative Investment", "alts": "Alternative Investment",
    "private equity": "Alternative Investment", "private credit": "Alternative Investment",
    "venture": "Alternative Investment", "hedge": "Alternative Investment", "pe ": "Alternative Investment",
    "brokerage": "Brokerage", "stocks": "Brokerage", "equities": "Brokerage", "equity": "Brokerage",
    "managed": "Managed Account", "custody": "Custody", "custodial": "Custody",
}


def _friendly(cat: str) -> str:
    return {"Alternative Investment": "alternatives", "Direct Real Estate": "real estate"}.get(cat, cat.lower())


def _pct(value: float, total: float) -> float:
    return round(value / total * 100, 1) if total else 0.0


def _liquidity(buckets: dict) -> float:
    return sum(v for k, v in buckets.items() if k in _LIQUID_TYPES)


def _top(buckets: dict) -> tuple[str, float]:
    cat = max(buckets, key=buckets.get)
    return cat, buckets[cat]


def _dir(before: float, after: float) -> str:
    return "up" if after > before else "down" if after < before else "flat"


def _resolve(repo: WealthRepository, category: str):
    q = (category or "").strip().lower()
    if not q:
        return None, None
    acct = repo.get_account(category)
    if acct:
        return "account", acct
    for word, cat in _ALIASES.items():
        if word in q:
            return "category", cat
    for cat in {a["type"] for a in repo.list_accounts()}:
        if q in cat.lower():
            return "category", cat
    return None, None


def simulate(repo: WealthRepository, action: str, amount: float, category: str) -> dict:
    buckets = {r["category"]: r["value"] for r in repo.exposure_by_category()}
    total = sum(buckets.values())
    is_add = (action or "").strip().lower() in ("add", "commit", "invest", "buy", "increase", "allocate")
    kind, obj = _resolve(repo, category)

    if kind is None or _FUND_FROM not in buckets:
        return {"ok": False, "message": f"I couldn't map '{category}' to one of your holdings. Try a category like 'alternatives' or 'real estate', or a holding name."}

    if kind == "account":
        cat, label, focus_id, default_full = obj["type"], obj["name"], obj["id"], obj["value"]
    else:
        cat, label = obj, _friendly(obj).title()
        accts = [a for a in repo.list_accounts() if a["type"] == cat]
        focus_id = max(accts, key=lambda a: a["value"])["id"] if accts else None
        default_full = sum(a["value"] for a in accts)

    if amount and amount > 0:
        amt = float(amount)
    elif not is_add:
        amt = default_full  # selling without an amount = the whole position
    else:
        return {"ok": False, "message": "How much would you like to commit? For example, '$5 million to private equity'."}

    after = dict(buckets)
    if is_add:
        after[cat] = after.get(cat, 0) + amt
        after[_FUND_FROM] = after.get(_FUND_FROM, 0) - amt
    else:
        after[cat] = max(0.0, after.get(cat, 0) - amt)
        after[_FUND_FROM] = after.get(_FUND_FROM, 0) + amt

    cat_b, cat_a = _pct(buckets.get(cat, 0), total), _pct(after.get(cat, 0), total)
    liq_b, liq_a = _pct(_liquidity(buckets), total), _pct(_liquidity(after), total)
    tb_cat, tb_val = _top(buckets)
    ta_cat, ta_val = _top(after)
    tb_pct, ta_pct = _pct(tb_val, total), _pct(ta_val, total)

    metrics = [
        {"label": _friendly(cat).title(), "before": f"{cat_b}%", "after": f"{cat_a}%", "dir": _dir(cat_b, cat_a)},
        {"label": "Liquidity", "before": f"{liq_b}%", "after": f"{liq_a}%", "dir": _dir(liq_b, liq_a)},
        {"label": "Top concentration", "before": f"{tb_cat} {tb_pct}%", "after": f"{ta_cat} {ta_pct}%", "dir": _dir(tb_pct, ta_pct)},
    ]
    verb_ing, prep = ("Committing", "to") if is_add else ("Selling", "of")
    summary = (
        f"{verb_ing} {money(amt)} {prep} {label} would move {_friendly(cat)} from {cat_b}% to "
        f"{cat_a}% of AUM, and your liquidity from {liq_b}% to {liq_a}%."
    )
    return {
        "ok": True,
        "scenario": {
            "title": f"{'Commit' if is_add else 'Sell'} {money(amt)} · {label}",
            "summary": summary,
            "metrics": metrics,
        },
        "focus_id": focus_id,
        "speak": summary,
    }
