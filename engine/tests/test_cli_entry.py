"""Tests for engine CLI entrypoint dispatch."""

from __future__ import annotations

import pytest


def test_engine_main_dispatches_ask(monkeypatch: pytest.MonkeyPatch) -> None:
    """engine_main dispatches ask subcommands to ask_main."""
    from antigravity_engine import _cli_entry

    calls: list[list[str]] = []

    monkeypatch.setattr(
        _cli_entry,
        "ask_main",
        lambda argv=None: calls.append(list(argv or [])),
    )

    _cli_entry.engine_main(["ask", "Where is auth?"])

    assert calls == [["Where is auth?"]]


def test_engine_main_dispatches_mcp(monkeypatch: pytest.MonkeyPatch) -> None:
    """engine_main dispatches mcp subcommands to mcp_main."""
    from antigravity_engine import _cli_entry

    calls: list[list[str]] = []

    monkeypatch.setattr(
        _cli_entry,
        "mcp_main",
        lambda argv=None: calls.append(list(argv or [])),
    )

    _cli_entry.engine_main(["mcp", "--workspace", "/tmp/project"])

    assert calls == [["--workspace", "/tmp/project"]]


def test_hub_main_dispatches_refresh(monkeypatch: pytest.MonkeyPatch) -> None:
    """hub_main dispatches refresh subcommands to refresh_main."""
    from antigravity_engine import _cli_entry

    calls: list[list[str]] = []

    monkeypatch.setattr(
        _cli_entry,
        "refresh_main",
        lambda argv=None: calls.append(list(argv or [])),
    )

    _cli_entry.hub_main(["refresh", "--quick"])

    assert calls == [["--quick"]]


def test_engine_main_rejects_unknown_subcommand() -> None:
    """engine_main exits with argparse usage on unknown subcommands."""
    from antigravity_engine import _cli_entry

    with pytest.raises(SystemExit) as exc_info:
        _cli_entry.engine_main(["unknown-command"])

    assert exc_info.value.code == 2
