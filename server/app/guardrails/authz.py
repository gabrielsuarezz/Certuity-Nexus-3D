"""Least-privilege policy: which tools are auto-allowed (read) vs. require
human-in-the-loop approval (actions), plus a coarse out-of-scope check."""

import re

# Read-only tools the agent may call freely (all client-scoped in the repository).
READ_TOOLS = {
    "get_summary",
    "get_performance",
    "get_exposure",
    "get_account",
    "list_accounts",
    "trace_lineage",
}

# Tools that drive the on-screen 3D map (safe, client-side).
VISUAL_TOOLS = {"focus_holding", "set_look_through", "show_overview"}

# Anything that could change money/ownership — NEVER auto-executed.
ACTION_TOOLS = {"request_action"}


def requires_approval(tool_name: str) -> bool:
    return tool_name in ACTION_TOOLS


_OUT_OF_SCOPE = re.compile(
    "|".join(
        [
            r"should i (buy|sell|invest|put money)",
            r"\b(buy|sell|short|trade)\b.*\b(stock|shares?|crypto|bitcoin|nvidia|tesla|option)",
            r"\b(do|file|prepare) (my )?tax|tax (advice|return|deduction)",
            r"\blegal advice\b|\blawsuit\b|draft (my )?(will|trust)\b",
            r"what should i do with my money",
        ]
    ),
    re.IGNORECASE,
)


def is_out_of_scope(text: str) -> bool:
    """Specific tax/legal/buy-sell advice → defer to a human advisor."""
    return bool(_OUT_OF_SCOPE.search(text or ""))
