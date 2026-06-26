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
            "Request a sensitive action that changes money or ownership "
            "(e.g. withdrawal, transfer, trade, beneficiary change, contacting the advisor). "
            "This does NOT execute it — it asks the client to confirm on screen."
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
