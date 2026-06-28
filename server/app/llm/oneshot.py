"""One-shot LLM completion against the configured provider (GitHub Models / Azure).
A single hardened call used for document analysis — separate from the chat loop."""

from __future__ import annotations

from app.config import settings


def _client_and_model():
    if settings.llm_provider == "azure":
        from openai import AzureOpenAI

        client = AzureOpenAI(
            api_key=settings.azure_openai_api_key,
            azure_endpoint=settings.azure_openai_endpoint,
            api_version=settings.azure_openai_api_version,
        )
        return client, settings.azure_openai_deployment

    from openai import OpenAI

    client = OpenAI(base_url=settings.github_models_endpoint, api_key=settings.github_models_token)
    return client, settings.github_models_model


def complete(system: str, user: str, max_tokens: int = 700) -> str:
    client, model = _client_and_model()
    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.2,
        max_tokens=max_tokens,
    )
    return resp.choices[0].message.content or ""
