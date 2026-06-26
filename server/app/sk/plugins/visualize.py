"""Tools that drive the on-screen 3D wealth map. They record UI actions on the
turn context; the frontend applies them through the SAME store actions a click
uses (select / look-through / overview)."""

from app.sk._compat import kernel_function
from app.sk.context import TurnContext
from app.data.repository import WealthRepository

_CATEGORY = {
    "real estate": "Direct Real Estate",
    "property": "Direct Real Estate",
    "properties": "Direct Real Estate",
    "alternative": "Alternative Investment",
    "alternatives": "Alternative Investment",
    "alts": "Alternative Investment",
    "private equity": "Alternative Investment",
    "brokerage": "Brokerage",
    "stocks": "Brokerage",
    "equities": "Brokerage",
    "managed": "Managed Account",
    "custody": "Custody",
    "custodial": "Custody",
}


class VisualizePlugin:
    def __init__(self, repo: WealthRepository, ctx: TurnContext) -> None:
        self.repo = repo
        self.ctx = ctx

    @kernel_function(description="Highlight a holding, entity, or category on the 3D map (by name or category like 'real estate').")
    def focus_holding(self, query: str) -> str:
        q = (query or "").strip().lower()

        # exact-ish account match
        acct = self.repo.get_account(query)
        if acct:
            self.ctx.act(action="focus", node_id=acct["id"])
            return f"Highlighting {acct['name']} on your map."

        # entity match
        for e in self.repo.list_entities():
            if e["name"].lower() in q or q in e["name"].lower():
                self.ctx.act(action="focus", node_id=e["id"])
                return f"Highlighting {e['name']} on your map."

        # category match -> focus the largest holding of that type
        for word, category in _CATEGORY.items():
            if word in q:
                matches = [a for a in self.repo.list_accounts() if a["type"] == category]
                if matches:
                    biggest = max(matches, key=lambda a: a["value"])
                    self.ctx.act(action="focus", node_id=biggest["id"])
                    label = "alternative investments" if category == "Alternative Investment" else category.lower()
                    return f"Showing your {label} on the map."

        # overview
        if any(w in q for w in ("everything", "overview", "all", "whole", "family office")):
            self.ctx.act(action="overview")
            return "Showing your whole portfolio."

        self.ctx.act(action="overview")
        return "Showing your portfolio overview."

    @kernel_function(description="Turn the Look-Through Analyzer on or off.")
    def set_look_through(self, on: bool) -> str:
        self.ctx.act(action="setLookThrough", on=bool(on))
        return "Look-through is on." if on else "Look-through is off."

    @kernel_function(description="Reset the map to the full portfolio overview.")
    def show_overview(self) -> str:
        self.ctx.act(action="overview")
        return "Here's your whole portfolio."
