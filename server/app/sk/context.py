from dataclasses import dataclass, field


@dataclass
class TurnContext:
    """Collects side effects produced by tools during one turn: UI actions that
    drive the 3D map, and any human-in-the-loop approval requests."""

    ui_actions: list[dict] = field(default_factory=list)
    approvals: list[dict] = field(default_factory=list)
    events: list[dict] = field(default_factory=list)
    scenario: dict | None = None

    def act(self, **action) -> None:
        self.ui_actions.append(action)

    def note(self, kind: str, label: str) -> None:
        """Record a safeguard/activity event for the on-screen trust panel.
        kind: grounded | map | approval | blocked | scope | redacted."""
        self.events.append({"kind": kind, "label": label})
