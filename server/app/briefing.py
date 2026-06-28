"""Proactive client briefing — the '24/7 associate' opening with what matters,
grounded entirely in the client's real data: portfolio value, a small simulated
intraday move (consistent with the app's existing mock live-market feed), and a
few 'worth noting' items (concentration, liquidity, top performer)."""

from __future__ import annotations

import math
from datetime import datetime

from app.data.repository import WealthRepository
from app.util import money

# Account types treated as readily liquid (vs. alternatives / direct real estate).
_LIQUID_TYPES = {"Brokerage", "Managed Account", "Custody"}


def _time_greeting() -> str:
    h = datetime.now().hour
    if h < 12:
        return "Good morning"
    if h < 17:
        return "Good afternoon"
    return "Good evening"


def _today_change() -> float:
    """Small, deterministic-per-day simulated intraday move (matches the app's
    existing mock live-market feed)."""
    day = datetime.now().timetuple().tm_yday
    return round(math.sin(day * 1.3) * 0.9 + 0.25, 2)


def build_briefing(repo: WealthRepository) -> dict:
    s = repo.summary()
    total = s["total_aum"]
    exposure = repo.exposure_by_category()  # sorted desc by value
    perf = repo.performance()

    change = _today_change()
    direction = "up" if change >= 0 else "down"

    items: list[dict] = []

    # Concentration — largest single category as a share of AUM.
    if exposure and exposure[0]["pct"] >= 18:
        top = exposure[0]
        items.append({
            "kind": "concentration",
            "text": f"{top['category']} is your largest exposure at {top['pct']}% of the portfolio.",
        })

    # Liquidity — readily liquid assets as a share of AUM.
    liquid_val = sum(r["value"] for r in exposure if r["category"] in _LIQUID_TYPES)
    liquid_pct = round(liquid_val / total * 100, 1) if total else 0.0
    items.append({
        "kind": "liquidity",
        "text": f"You hold about {money(liquid_val)} in liquid assets — roughly {liquid_pct}% of AUM.",
    })

    # Top performer YTD.
    best = max(perf["by_account"], key=lambda a: a["ytd_return_pct"])
    items.append({
        "kind": "performance",
        "text": f"Your strongest position this year is {best['name']}, up {best['ytd_return_pct']}%.",
    })

    greeting = _time_greeting()
    headline = f"{money(total)} · {s['accounts']} accounts across {s['entities']} entities"
    speak = (
        f"{greeting}. Your portfolio stands at {money(total)}, {direction} about "
        f"{abs(change)} percent today. A few things worth noting. "
        + " ".join(i["text"] for i in items)
        + " What would you like to look at?"
    )
    return {
        "greeting": greeting,
        "household": s["household"],
        "total_aum": total,
        "change_pct": change,
        "headline": headline,
        "items": items,
        "speak": speak,
    }
