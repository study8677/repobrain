"""Tests for user-actionable rb-mcp error formatting."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest


def test_redact_secrets_covers_common_token_patterns() -> None:
    """Diagnostics should not persist common API key or auth token shapes."""
    from repobrain_engine.hub.mcp_server import _redact_secrets

    raw = (
        "OPENAI_API_KEY=sk-test-123456789 "
        "GOOGLE_API_KEY=AIzaSyTestSecret123456789 "
        "ANTHROPIC_API_KEY=anthropic-secret "
        "CUSTOM_API_KEY=custom-secret "
        "Authorization: Bearer auth-token-123 "
        "Bearer standalone-token-456 "
        "sk-live-abcdef123456789"
    )

    redacted = _redact_secrets(raw)

    assert "sk-test-123456789" not in redacted
    assert "AIzaSyTestSecret123456789" not in redacted
    assert "anthropic-secret" not in redacted
    assert "custom-secret" not in redacted
    assert "auth-token-123" not in redacted
    assert "standalone-token-456" not in redacted
    assert "sk-live-abcdef123456789" not in redacted
    assert "OPENAI_API_KEY=<redacted>" in redacted
    assert "GOOGLE_API_KEY=<redacted>" in redacted
    assert "ANTHROPIC_API_KEY=<redacted>" in redacted
    assert "CUSTOM_API_KEY=<redacted>" in redacted
    assert "Authorization: <redacted>" in redacted
    assert "Bearer <redacted>" in redacted


def test_mcp_log_permissions_are_private(tmp_path: Path, monkeypatch) -> None:
    """The diagnostic directory and log file should not be world-readable."""
    from repobrain_engine.hub.mcp_server import _log_mcp_event

    monkeypatch.setenv("CLAUDE_PLUGIN_DATA_DIR", str(tmp_path))

    log_path = _log_mcp_event("startup failed with OPENAI_API_KEY=sk-test-123456789")

    assert (tmp_path.stat().st_mode & 0o777) == 0o700
    assert (log_path.stat().st_mode & 0o777) == 0o600
    assert "sk-test-123456789" not in log_path.read_text(encoding="utf-8")


def test_format_tool_error_redacts_secrets_in_response_and_log(
    tmp_path: Path,
    monkeypatch,
) -> None:
    """The full tool-error path must redact both user response and log."""
    from repobrain_engine.hub.mcp_server import _format_tool_error

    monkeypatch.setenv("CLAUDE_PLUGIN_DATA_DIR", str(tmp_path))
    raw_tokens = (
        "OPENAI_API_KEY=sk-test123fake",
        "Authorization: Bearer test456fake",
        "Bearer xyzfaketoken",
        "sk-fake789",
        "AIzafake000",
    )
    response = _format_tool_error(
        "refresh_project",
        RuntimeError("provider failed: " + " ".join(raw_tokens)),
    )
    log_text = (tmp_path / "rb-mcp.log").read_text(encoding="utf-8")

    assert "Diagnostic log:" in response
    for raw_token in raw_tokens:
        assert raw_token not in response
        assert raw_token not in log_text


def test_no_llm_error_points_to_setup_and_restart(
    tmp_path: Path,
    monkeypatch,
) -> None:
    """Missing LLM config should not look like an MCP registration failure."""
    from repobrain_engine.hub.mcp_server import _format_tool_error

    monkeypatch.setenv("CLAUDE_PLUGIN_DATA_DIR", str(tmp_path))

    text = _format_tool_error(
        "refresh_project",
        ValueError(
            "No LLM configured. Run rb-setup or set OPENAI_BASE_URL, "
            "OPENAI_API_KEY, and OPENAI_MODEL in .env"
        ),
    )

    assert "/repobrain:rb-setup" in text
    assert "/rb-setup" in text
    assert "restart the host" in text
    assert (tmp_path / "rb-mcp.log").exists()


def test_generic_tool_error_includes_log_path(tmp_path: Path, monkeypatch) -> None:
    """Unexpected tool failures should expose the diagnostic log location."""
    from repobrain_engine.hub.mcp_server import _format_tool_error

    monkeypatch.setenv("CLAUDE_PLUGIN_DATA_DIR", str(tmp_path))

    text = _format_tool_error("refresh_project", RuntimeError("boom"))

    assert "Diagnostic log:" in text
    assert str(tmp_path / "rb-mcp.log") in text


@pytest.mark.asyncio
async def test_rb_mcp_exposes_project_tools(tmp_path: Path, monkeypatch) -> None:
    """The stdio MCP server should register the plugin tools successfully."""
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client

    monkeypatch.setenv("CLAUDE_PLUGIN_DATA_DIR", str(tmp_path / "logs"))

    params = StdioServerParameters(
        command=sys.executable,
        args=[
            "-m",
            "repobrain_engine.hub.mcp_server",
            "--workspace",
            str(tmp_path),
        ],
        env={
            "CLAUDE_PLUGIN_DATA_DIR": str(tmp_path / "logs"),
            "WORKSPACE_PATH": str(tmp_path),
        },
    )

    async with stdio_client(params) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            result = await session.list_tools()

    names = {tool.name for tool in result.tools}
    assert {"ask_project", "refresh_project"} <= names


@pytest.mark.asyncio
async def test_refresh_tool_schema_and_removed_arguments(tmp_path, monkeypatch):
    from repobrain_engine.hub import mcp_server
    captured = []
    monkeypatch.setenv('CLAUDE_PLUGIN_DATA_DIR', str(tmp_path / 'logs'))
    monkeypatch.setattr(mcp_server.RepoBrainMCP, 'run', lambda self, **kwargs: captured.append(self))
    mcp_server.serve(tmp_path)
    server = captured[0]
    tools = await server.list_tools()
    refresh = next(tool for tool in tools if tool.name == 'refresh_project')
    assert set(refresh.inputSchema['properties']) == {'full'}
    assert refresh.inputSchema['additionalProperties'] is False
    for old_argument in ('quick', 'failed_only'):
        with pytest.raises(ValueError, match='Unsupported refresh argument'):
            await server.call_tool('refresh_project', {old_argument: True})


@pytest.mark.asyncio
@pytest.mark.parametrize('state,mode,resumed,expected', [
    ('success', 'full', False, 'Full build completed'),
    ('success', 'incremental', False, 'Incremental update completed'),
    ('success', 'incremental', True, 'Continuation of the previous refresh completed'),
    ('success', 'noop', False, 'already up to date'),
    ('partial', 'full', False, 'incomplete'),
    ('unresolved', 'incremental', False, 'remains unresolved'),
    ('failed', 'full', True, 'refresh failed'),
])
async def test_refresh_tool_reports_actual_result(state, mode, resumed, expected, tmp_path, monkeypatch):
    from types import SimpleNamespace
    from repobrain_engine.hub import mcp_server, pipeline
    captured = []
    calls = []
    monkeypatch.setenv('CLAUDE_PLUGIN_DATA_DIR', str(tmp_path / 'logs'))
    monkeypatch.setattr(mcp_server.RepoBrainMCP, 'run', lambda self, **kwargs: captured.append(self))
    async def fake_refresh(workspace, *, full=False):
        calls.append((workspace, full))
        return SimpleNamespace(overall_status=state, mode=mode, resumed=resumed,
                               failures=[], impact_plan_path=None)
    monkeypatch.setattr(pipeline, 'refresh_pipeline', fake_refresh)
    mcp_server.serve(tmp_path)
    result = await captured[0]._tool_manager.get_tool('refresh_project').fn(full=True)
    assert calls == [(tmp_path, True)]
    assert expected in result
    if state != 'success' or mode == 'noop':
        assert 'conventions.md' not in result
    if state != 'success':
        assert 'Knowledge base updated' not in result
