"""Pytest config for the guardrail suite.

Pins the brain to mock mode so the tests stay deterministic and keyless,
regardless of the local .env (which may point the brain at a live provider
such as GitHub Models). Guardrail behavior is what's under test here — not the
model — so we never spend API calls or depend on network for these.
"""

import pytest

from app.config import settings


@pytest.fixture(autouse=True)
def _force_mock_llm(monkeypatch):
    monkeypatch.setattr(settings, "use_mock_llm", True)
    monkeypatch.setattr(settings, "data_source", "json")
