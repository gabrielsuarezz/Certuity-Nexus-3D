"""Real Semantic Kernel agent path (used when USE_MOCK_LLM=false).

Builds a Kernel with Azure OpenAI + the portfolio/map/action plugins and lets
SK auto-invoke tools (FunctionChoiceBehavior.Auto). The action tool only ever
creates a pending approval, so even with auto-invocation nothing sensitive
executes without human confirmation. Input/output guardrails wrap this call in
the orchestrator.
"""

from __future__ import annotations

from app.config import settings
from app.sk.context import TurnContext
from app.sk.persona import SYSTEM_PROMPT
from app.sk.plugins.actions import ActionsPlugin
from app.sk.plugins.portfolio import PortfolioPlugin
from app.sk.plugins.visualize import VisualizePlugin


async def sk_agent_turn(message: str, history: list[dict], repo, ctx: TurnContext) -> str:
    from semantic_kernel import Kernel
    from semantic_kernel.connectors.ai import FunctionChoiceBehavior
    from semantic_kernel.connectors.ai.open_ai import (
        AzureChatCompletion,
        AzureChatPromptExecutionSettings,
    )
    from semantic_kernel.contents import ChatHistory

    kernel = Kernel()
    kernel.add_service(
        AzureChatCompletion(
            service_id="azure",
            deployment_name=settings.azure_openai_deployment,
            endpoint=settings.azure_openai_endpoint,
            api_key=settings.azure_openai_api_key,
            api_version=settings.azure_openai_api_version,
        )
    )
    kernel.add_plugin(PortfolioPlugin(repo, ctx), "portfolio")
    kernel.add_plugin(VisualizePlugin(repo, ctx), "map")
    kernel.add_plugin(ActionsPlugin(ctx), "actions")

    chat = ChatHistory()
    chat.add_system_message(SYSTEM_PROMPT)
    for turn in (history or [])[-8:]:
        if turn.get("role") == "user":
            chat.add_user_message(turn.get("content", ""))
        elif turn.get("role") == "assistant":
            chat.add_assistant_message(turn.get("content", ""))
    chat.add_user_message(message)

    exec_settings = AzureChatPromptExecutionSettings(
        function_choice_behavior=FunctionChoiceBehavior.Auto(),
        max_tokens=600,
        temperature=0.3,
    )
    service = kernel.get_service("azure")
    result = await service.get_chat_message_content(
        chat_history=chat, settings=exec_settings, kernel=kernel
    )
    return (str(result).strip() if result else "") or "I'm sorry, I didn't quite catch that."
