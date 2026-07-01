"""Real Semantic Kernel agent path (used when USE_MOCK_LLM=false).

Builds a Kernel with the configured chat model (GitHub Models = Azure-hosted
GPT-4o-mini by default, or Azure OpenAI) plus the portfolio/map/action plugins,
and lets SK auto-invoke tools (FunctionChoiceBehavior.Auto). The action tool only
ever creates a pending approval, so even with auto-invocation nothing sensitive
executes without human confirmation. Input/output guardrails wrap this call in
the orchestrator.
"""

from __future__ import annotations

from app.config import settings
from app.sk.context import TurnContext
from app.sk.persona import system_prompt
from app.sk.plugins.actions import ActionsPlugin
from app.sk.plugins.market import MarketPlugin
from app.sk.plugins.portfolio import PortfolioPlugin
from app.sk.plugins.research import SearchPlugin
from app.sk.plugins.scenario import ScenarioPlugin
from app.sk.plugins.visualize import VisualizePlugin


def _build_service(service_id: str):
    """An SK chat-completion service for the configured provider.

    Default `github` points Semantic Kernel at GitHub Models — real GPT-4o-mini on
    Azure's inference infrastructure, OpenAI-compatible — so the identical code path
    runs against a production Azure OpenAI deployment by flipping one env var.
    """
    if settings.llm_provider == "azure":
        from semantic_kernel.connectors.ai.open_ai import AzureChatCompletion

        return AzureChatCompletion(
            service_id=service_id,
            deployment_name=settings.azure_openai_deployment,
            endpoint=settings.azure_openai_endpoint,
            api_key=settings.azure_openai_api_key,
            api_version=settings.azure_openai_api_version,
        )

    from openai import AsyncOpenAI
    from semantic_kernel.connectors.ai.open_ai import OpenAIChatCompletion

    client = AsyncOpenAI(
        base_url=settings.github_models_endpoint,
        api_key=settings.github_models_token,
    )
    return OpenAIChatCompletion(
        service_id=service_id,
        ai_model_id=settings.github_models_model,
        async_client=client,
    )


async def sk_agent_turn(message: str, history: list[dict], repo, ctx: TurnContext) -> str:
    from semantic_kernel import Kernel
    from semantic_kernel.connectors.ai import FunctionChoiceBehavior
    from semantic_kernel.contents import ChatHistory

    if settings.llm_provider == "azure":
        from semantic_kernel.connectors.ai.open_ai import (
            AzureChatPromptExecutionSettings as ExecSettings,
        )
    else:
        from semantic_kernel.connectors.ai.open_ai import (
            OpenAIChatPromptExecutionSettings as ExecSettings,
        )

    kernel = Kernel()
    service = _build_service("brain")
    kernel.add_service(service)
    kernel.add_plugin(PortfolioPlugin(repo, ctx), "portfolio")
    kernel.add_plugin(VisualizePlugin(repo, ctx), "map")
    kernel.add_plugin(ScenarioPlugin(repo, ctx), "scenario")
    kernel.add_plugin(ActionsPlugin(ctx), "actions")
    kernel.add_plugin(MarketPlugin(ctx), "market")
    kernel.add_plugin(SearchPlugin(ctx), "research")

    chat = ChatHistory()
    chat.add_system_message(system_prompt())
    for turn in (history or [])[-8:]:
        if turn.get("role") == "user":
            chat.add_user_message(turn.get("content", ""))
        elif turn.get("role") == "assistant":
            chat.add_assistant_message(turn.get("content", ""))
    chat.add_user_message(message)

    exec_settings = ExecSettings(
        function_choice_behavior=FunctionChoiceBehavior.Auto(),
        max_tokens=600,
        temperature=0.3,
    )
    result = await service.get_chat_message_content(
        chat_history=chat, settings=exec_settings, kernel=kernel
    )
    return (str(result).strip() if result else "") or "I'm sorry, I didn't quite catch that."
