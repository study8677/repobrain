"""Tests for hub agent ImportError handling and area detection."""
import sys
import types
from pathlib import Path

import pytest
from unittest.mock import patch


def test_build_refresh_swarm_import_error():
    """build_refresh_swarm raises ImportError with helpful message when agents SDK missing."""
    from antigravity_engine.hub.agents import build_refresh_swarm

    with patch.dict(sys.modules, {"agents": None}):
        with pytest.raises(ImportError, match="OpenAI Agent SDK not found"):
            build_refresh_swarm("test-model")


def test_build_ask_swarm_import_error():
    """build_ask_swarm raises ImportError with helpful message when agents SDK missing."""
    from antigravity_engine.hub.agents import build_ask_swarm

    with patch.dict(sys.modules, {"agents": None}):
        with pytest.raises(ImportError, match="OpenAI Agent SDK not found"):
            build_ask_swarm("test-model")


def test_reasoning_effort_is_passed_through_model_settings_extra_body(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """AG_REASONING_EFFORT is sent through ModelSettings.extra_body."""
    from antigravity_engine.hub.agents import build_refresh_swarm

    class ModelSettings:
        def __init__(self, extra_body: dict[str, str] | None = None) -> None:
            self.extra_body = extra_body

    class Agent:
        instances: list["Agent"] = []

        def __init__(
            self,
            name: str,
            instructions: str,
            model: str,
            handoffs: list["Agent"] | None = None,
            model_settings: ModelSettings | None = None,
        ) -> None:
            self.name = name
            self.instructions = instructions
            self.model = model
            self.handoffs = handoffs or []
            self.model_settings = model_settings
            Agent.instances.append(self)

    monkeypatch.setitem(
        sys.modules,
        "agents",
        types.SimpleNamespace(Agent=Agent, ModelSettings=ModelSettings),
    )
    monkeypatch.setenv("AG_REASONING_EFFORT", "high")

    swarm = build_refresh_swarm("test-model")

    assert swarm.name == "ScanAnalyst"
    assert [agent.name for agent in Agent.instances] == [
        "ConventionWriter",
        "ArchitectureReviewer",
        "ScanAnalyst",
    ]
    assert [agent.model_settings.extra_body for agent in Agent.instances] == [
        {"reasoning_effort": "high"},
        {"reasoning_effort": "high"},
        {"reasoning_effort": "high"},
    ]


def test_detect_areas_finds_source_dirs(tmp_path: Path) -> None:
    """_detect_areas finds directories containing real source code files.

    Directories with only documentation (.md) are now excluded since they
    don't benefit from having a dedicated ModuleAgent.
    """
    from antigravity_engine.hub.agents import _detect_areas

    (tmp_path / "engine").mkdir()
    (tmp_path / "engine" / "main.py").write_text("x = 1")
    (tmp_path / "cli").mkdir()
    (tmp_path / "cli" / "app.py").write_text("y = 2")
    (tmp_path / "docs").mkdir()
    (tmp_path / "docs" / "readme.md").write_text("# docs")

    areas = _detect_areas(tmp_path)
    assert "engine" in areas
    assert "cli" in areas
    # docs-only directories are no longer treated as code modules
    assert "docs" not in areas


def test_detect_areas_skips_hidden_and_skip_dirs(tmp_path: Path) -> None:
    """_detect_areas ignores .git, node_modules, etc."""
    from antigravity_engine.hub.agents import _detect_areas

    (tmp_path / ".git").mkdir()
    (tmp_path / ".git" / "config").write_text("x")
    (tmp_path / "node_modules").mkdir()
    (tmp_path / "node_modules" / "pkg.js").write_text("x")
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "main.py").write_text("x = 1")

    areas = _detect_areas(tmp_path)
    assert ".git" not in areas
    assert "node_modules" not in areas
    assert "src" in areas
