from dataclasses import dataclass, field


@dataclass
class TurnContext:
    """Collects side effects produced by tools during one turn: UI actions that
    drive the 3D map, and any human-in-the-loop approval requests."""

    ui_actions: list[dict] = field(default_factory=list)
    approvals: list[dict] = field(default_factory=list)

    def act(self, **action) -> None:
        self.ui_actions.append(action)
