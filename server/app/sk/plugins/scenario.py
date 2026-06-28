"""What-if scenario tool. Models a hypothetical change and surfaces a before/after
card to the client — no real change is ever made (read-only projection)."""

from app.sk._compat import kernel_function
from app.sk.context import TurnContext
from app.data.repository import WealthRepository
from app.scenario import simulate


class ScenarioPlugin:
    def __init__(self, repo: WealthRepository, ctx: TurnContext) -> None:
        self.repo = repo
        self.ctx = ctx

    @kernel_function(
        description=(
            "Model a hypothetical 'what if' change to the portfolio and show its impact on allocation, "
            "concentration, and liquidity — WITHOUT making any real change. Use for questions like "
            "'what if I commit $5M to private equity' or 'what if I sold the Aspen estate'. "
            "action: 'add' to commit/invest, or 'sell' to divest/liquidate. "
            "amount: the dollar amount (use 0 to sell a holding's full value). "
            "category: the asset category or account name affected (e.g. 'alternatives', 'real estate', 'Aspen')."
        )
    )
    def simulate_scenario(self, action: str, amount: float, category: str) -> str:
        result = simulate(self.repo, action, amount, category)
        if not result.get("ok"):
            return result.get("message", "I couldn't model that scenario.")
        self.ctx.scenario = result["scenario"]
        self.ctx.note("grounded", "Modeled what-if scenario")
        if result.get("focus_id"):
            self.ctx.act(action="focus", node_id=result["focus_id"])
            self.ctx.note("map", "Highlighted affected holding")
        return result["speak"] + " I've put the before-and-after on your screen — nothing has actually changed."
