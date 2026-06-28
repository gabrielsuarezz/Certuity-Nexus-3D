"""The ONLY tool that can change anything. It never executes — it creates a
pending request and surfaces it for explicit human confirmation on screen
(human-in-the-loop). Money/ownership never moves autonomously."""

from app.sk._compat import kernel_function
from app.sk.context import TurnContext
from app import approvals


class ActionsPlugin:
    def __init__(self, ctx: TurnContext) -> None:
        self.ctx = ctx

    @kernel_function(
        description=(
            "Call this IMMEDIATELY whenever the client asks to move money, withdraw, transfer, "
            "wire, buy or sell, rebalance, change a beneficiary, or take any action that changes "
            "money or ownership. It does NOT execute anything — it places a confirmation card on "
            "the client's screen for them to approve (human-in-the-loop). Do NOT ask the client "
            "whether to create the confirmation; just call this. `kind` is a short label "
            "(e.g. 'withdrawal', 'transfer', 'trade'); `details` restates the specifics."
        )
    )
    def request_action(self, kind: str, details: str) -> str:
        rec = approvals.create(kind=kind, details=details)
        self.ctx.approvals.append(rec)
        return (
            f"I can't do that automatically, but I've placed a confirmation for '{kind}' "
            "on your screen. It will only proceed once you review and approve it — and your "
            "advisor is notified. Would you like me to explain anything about it first?"
        )
