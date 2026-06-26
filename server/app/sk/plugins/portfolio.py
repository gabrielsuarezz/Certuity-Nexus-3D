"""Read-only portfolio tools (client-scoped). Each method returns a short,
plain-language string for the agent and may record a 3D-map UI action."""

from app.sk._compat import kernel_function
from app.sk.context import TurnContext
from app.data.repository import WealthRepository
from app.util import money


class PortfolioPlugin:
    def __init__(self, repo: WealthRepository, ctx: TurnContext) -> None:
        self.repo = repo
        self.ctx = ctx

    @kernel_function(description="Overview of the client's whole portfolio: total AUM, entity and account counts, advisor.")
    def get_summary(self) -> str:
        s = self.repo.summary()
        self.ctx.act(action="overview")
        return (
            f"{s['household']} is a {s['type']} with about {money(s['total_aum'])} in total assets, "
            f"across {s['entities']} legal entities and {s['accounts']} accounts. "
            f"The lead advisor is {s['advisor']}."
        )

    @kernel_function(description="How the portfolio is allocated across categories (brokerage, alternatives, real estate, etc.).")
    def get_exposure(self) -> str:
        rows = self.repo.exposure_by_category()
        parts = [f"{r['category']} {r['pct']}% ({money(r['value'])})" for r in rows]
        return "Here's how the wealth is allocated: " + "; ".join(parts) + "."

    @kernel_function(description="Year-to-date performance for the whole portfolio and a couple of highlights.")
    def get_performance(self) -> str:
        p = self.repo.performance()
        best = max(p["by_account"], key=lambda a: a["ytd_return_pct"])
        worst = min(p["by_account"], key=lambda a: a["ytd_return_pct"])
        return (
            f"The portfolio is up about {p['portfolio_ytd_return_pct']}% year-to-date. "
            f"The strongest is {best['name']} (+{best['ytd_return_pct']}%); "
            f"the softest is {worst['name']} ({worst['ytd_return_pct']:+}%)."
        )

    @kernel_function(description="List the client's accounts with their values.")
    def list_accounts(self) -> str:
        rows = self.repo.list_accounts()
        return "The accounts are: " + "; ".join(
            f"{a['name']} ({money(a['value'])})" for a in rows
        ) + "."

    @kernel_function(description="Details for one account, found by name. Also highlights it on the map.")
    def get_account(self, name: str) -> str:
        a = self.repo.get_account(name)
        if not a:
            return f"I couldn't find an account matching '{name}'."
        self.ctx.act(action="focus", node_id=a["id"])
        return (
            f"{a['name']} is a {a['type']} held at {a['custodian']}, under {a['entity']}. "
            f"It's worth about {money(a['value'])}, up {a['ytd_return_pct']}% year-to-date "
            f"(as of {a['as_of']}). I've highlighted it on your map."
        )

    @kernel_function(description="Trace an account's ownership up through its entity to the family office, and show it on the map.")
    def trace_lineage(self, name: str) -> str:
        a = self.repo.get_account(name)
        if not a:
            return f"I couldn't find an account matching '{name}' to trace."
        chain = self.repo.lineage(a["id"])
        self.ctx.act(action="trace", node_id=a["id"])
        path = " -> ".join(step["name"] for step in chain)
        return f"Here's how {a['name']} rolls up: {path}. I've traced it on your map for you."
