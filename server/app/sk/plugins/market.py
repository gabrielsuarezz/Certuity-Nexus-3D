"""Live market data (read-only, informational). Uses Alpha Vantage's free API for
today's market movers and single-stock quotes. Everything here is reported as
factual DATA — never a buy/sell recommendation (the persona defers those to the
advisor, and the out-of-scope guard blocks 'should I buy/sell' up front)."""

from __future__ import annotations

import httpx

from app.config import settings
from app.sk._compat import kernel_function
from app.sk.context import TurnContext

_BASE = "https://www.alphavantage.co/query"


class MarketPlugin:
    def __init__(self, ctx: TurnContext) -> None:
        self.ctx = ctx

    async def _get(self, params: dict) -> dict | None:
        if not settings.market_ready:
            return None
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(
                    _BASE, params={**params, "apikey": settings.alpha_vantage_key}
                )
                resp.raise_for_status()
                data = resp.json()
            # Alpha Vantage returns these keys on rate limits / bad requests.
            if not isinstance(data, dict) or any(
                k in data for k in ("Note", "Information", "Error Message")
            ):
                return None
            return data
        except Exception:
            return None

    @kernel_function(
        description="Today's live US stock market movers (top gainers and most actively traded). "
        "Use when the client asks what's moving, what's up or down, or how the market is doing today."
    )
    async def market_movers(self) -> str:
        data = await self._get({"function": "TOP_GAINERS_LOSERS"})
        if not data:
            return "I can't reach live market data right now."
        gainers = data.get("top_gainers", [])[:4]
        actives = data.get("most_actively_traded", [])[:3]
        self.ctx.note("grounded", "Read live market movers")
        if not gainers:
            return "The live market feed didn't return movers just now."
        g = ", ".join(f"{x.get('ticker')} ({x.get('change_percentage')})" for x in gainers)
        a = ", ".join(x.get("ticker", "") for x in actives if x.get("ticker"))
        tail = f" Most active: {a}." if a else ""
        return (
            f"Today's biggest gainers are {g}.{tail} "
            "That's live market information, not a recommendation."
        )

    @kernel_function(
        description="A live quote for one stock by its ticker symbol (e.g. AAPL, NVDA): "
        "current price and today's percentage move."
    )
    async def stock_quote(self, symbol: str) -> str:
        sym = (symbol or "").strip().upper()
        if not sym:
            return "Which ticker symbol would you like a quote for?"
        data = await self._get({"function": "GLOBAL_QUOTE", "symbol": sym})
        quote = (data or {}).get("Global Quote", {})
        price = quote.get("05. price")
        if not price:
            return f"I couldn't get a live quote for {sym} right now."
        self.ctx.note("grounded", f"Read live quote: {sym}")
        change = quote.get("10. change percent", "").strip()
        move = f", {change} today" if change else ""
        return f"{sym} is trading around ${float(price):.2f}{move}. Live market data, not advice."
