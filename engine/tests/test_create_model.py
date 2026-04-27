"""Tests for removal of local LLM model configuration."""

import os

import pytest

from antigravity_engine.hub.agents import create_model


class _FakeSettings:
    pass


def test_create_model_rejects_local_configuration(monkeypatch: pytest.MonkeyPatch) -> None:
    """Provider env vars must not re-enable local model resolution."""
    monkeypatch.setenv("GOOGLE_API_KEY", "ignored-google-key")
    monkeypatch.setenv("OPENAI_API_KEY", "ignored-openai-key")
    monkeypatch.setenv("OPENAI_BASE_URL", "https://example.test/v1")

    with pytest.raises(ValueError, match="Local LLM configuration has been removed"):
        create_model(_FakeSettings())

    assert os.environ["GOOGLE_API_KEY"] == "ignored-google-key"
    assert os.environ["OPENAI_API_KEY"] == "ignored-openai-key"
