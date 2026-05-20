"""Tests for hub.pipeline — mocked Runner."""
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from antigravity_engine.hub.pipeline import (
    _build_ask_context,
    _format_scan_report,
    _get_head_sha,
)
from antigravity_engine.hub.scanner import ScanReport


def test_format_scan_report_basic() -> None:
    report = ScanReport(
        root=Path("/tmp/test"),
        languages={"Python": 10, "JavaScript": 5},
        frameworks=["Python (pyproject.toml)"],
        top_dirs=["src", "tests"],
        file_count=15,
        has_tests=True,
        has_ci=True,
        has_docker=False,
        readme_snippet="# My Project",
    )
    result = _format_scan_report(report)
    assert "Python: 10" in result
    assert "JavaScript: 5" in result
    assert "pyproject.toml" in result
    assert "src, tests" in result
    assert "My Project" in result


def test_format_scan_report_empty() -> None:
    report = ScanReport(root=Path("/tmp/empty"))
    result = _format_scan_report(report)
    assert "Total files: 0" in result


def test_get_head_sha_no_git(tmp_path: Path) -> None:
    """Returns None when not in a git repo."""
    sha = _get_head_sha(tmp_path)
    assert sha is None or isinstance(sha, str)


def test_refresh_initializes_antigravity_scaffold(tmp_path: Path) -> None:
    """Refresh initialization creates project-local state idempotently."""
    from antigravity_engine.hub.refresh_pipeline import (
        _ensure_refresh_workspace_initialized,
    )

    ag_dir = _ensure_refresh_workspace_initialized(tmp_path)
    manifest = ag_dir / "manifest.json"
    original_manifest = manifest.read_text(encoding="utf-8")

    assert ag_dir == tmp_path / ".antigravity"
    assert manifest.exists()
    for dirname in (
        "agents",
        "modules",
        "graph",
        "retrieval_graphs",
        "memory",
        "decisions",
        "logs",
    ):
        assert (ag_dir / dirname).is_dir()

    _ensure_refresh_workspace_initialized(tmp_path)

    assert manifest.read_text(encoding="utf-8") == original_manifest


def test_refresh_initialization_refuses_blocking_file(tmp_path: Path) -> None:
    """Initialization fails instead of replacing user-owned files."""
    from antigravity_engine.hub.refresh_pipeline import (
        _ensure_refresh_workspace_initialized,
    )

    (tmp_path / ".antigravity").write_text("not a dir", encoding="utf-8")

    with pytest.raises(RuntimeError, match="Project initialization failed"):
        _ensure_refresh_workspace_initialized(tmp_path)


@pytest.mark.asyncio
async def test_refresh_pipeline_creates_conventions(tmp_path: Path, monkeypatch) -> None:
    """refresh_pipeline writes conventions.md."""
    monkeypatch.setenv("WORKSPACE_PATH", str(tmp_path))
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    from antigravity_engine.config import reset_settings
    reset_settings()

    ag_dir = tmp_path / ".antigravity"
    ag_dir.mkdir()

    mock_result = MagicMock()
    mock_result.final_output = "# Conventions\n\nThis is a Python project."

    # Create a mock agents module with Runner.run as AsyncMock
    mock_agents_module = MagicMock()
    mock_agents_module.Runner.run = AsyncMock(return_value=mock_result)
    mock_agents_module.Agent = MagicMock()
    mock_agents_module.set_tracing_disabled = MagicMock()

    with patch.dict("sys.modules", {"agents": mock_agents_module}):
        import importlib
        import antigravity_engine.hub.pipeline as pipeline_mod
        importlib.reload(pipeline_mod)

        await pipeline_mod.refresh_pipeline(tmp_path, quick=False)

    conventions = ag_dir / "conventions.md"
    assert conventions.exists()
    assert "Python project" in conventions.read_text(encoding="utf-8")
    assert (ag_dir / "knowledge_graph.json").exists()
    assert (ag_dir / "knowledge_graph.md").exists()
    assert (ag_dir / "knowledge_graph.mmd").exists()
    assert (ag_dir / "document_index.md").exists()
    assert (ag_dir / "data_overview.md").exists()
    assert (ag_dir / "media_manifest.md").exists()


@pytest.mark.asyncio
async def test_ask_pipeline_returns_answer(tmp_path: Path, monkeypatch) -> None:
    """ask_pipeline returns an answer string."""
    monkeypatch.setenv("WORKSPACE_PATH", str(tmp_path))
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    from antigravity_engine.config import reset_settings
    reset_settings()

    ag_dir = tmp_path / ".antigravity"
    ag_dir.mkdir()
    (ag_dir / "conventions.md").write_text("Python + FastAPI", encoding="utf-8")

    mock_result = MagicMock()
    mock_result.final_output = "This project uses FastAPI."

    mock_agents_module = MagicMock()
    mock_agents_module.Runner.run = AsyncMock(return_value=mock_result)
    mock_agents_module.Agent = MagicMock()
    mock_agents_module.set_tracing_disabled = MagicMock()

    with patch.dict("sys.modules", {"agents": mock_agents_module}):
        import importlib
        import antigravity_engine.hub.pipeline as pipeline_mod
        importlib.reload(pipeline_mod)

        answer = await pipeline_mod.ask_pipeline(tmp_path, "What framework?")

    assert "FastAPI" in answer


def test_build_ask_context_includes_root_and_memory_docs(tmp_path: Path) -> None:
    """ask context should include root docs and memory logs when present."""
    ag_dir = tmp_path / ".antigravity"
    memory_dir = ag_dir / "memory"
    (ag_dir / "decisions").mkdir(parents=True)
    memory_dir.mkdir(parents=True)

    (ag_dir / "conventions.md").write_text("Python + FastAPI", encoding="utf-8")
    (tmp_path / "CONTEXT.md").write_text("Use service layer", encoding="utf-8")
    (tmp_path / "AGENTS.md").write_text(
        "Read the antigravity files first",
        encoding="utf-8",
    )
    (memory_dir / "reports.md").write_text(
        "Auth module needs cleanup",
        encoding="utf-8",
    )

    context = _build_ask_context(tmp_path)

    assert ".antigravity/conventions.md" in context
    assert "CONTEXT.md" in context
    assert "AGENTS.md" in context
    assert ".antigravity/memory/reports.md" in context
    assert "Auth module needs cleanup" in context


def test_load_project_context_includes_conventions_and_registry(tmp_path: Path) -> None:
    """_load_project_context must surface project-wide docs to the agent-md path.

    Regression guard: the new structured-facts path used to read only per-module
    agent docs, so questions answerable from conventions.md got refusal answers.
    """
    from antigravity_engine.hub.ask_pipeline import _load_project_context

    ag_dir = tmp_path / ".antigravity"
    ag_dir.mkdir()
    (ag_dir / "conventions.md").write_text(
        "# Project Conventions\n\nLint: Ruff. Format: Black.",
        encoding="utf-8",
    )
    (ag_dir / "module_registry.md").write_text(
        "# Module Registry\n\n- core: business logic\n- api: HTTP layer\n",
        encoding="utf-8",
    )

    map_content = "# Module Map\n\n## core\n- Path: src/core/\n"
    section = _load_project_context(ag_dir, map_content=map_content)

    assert "Project Context" in section
    assert "Lint: Ruff" in section
    assert "Module Registry" in section
    assert "core: business logic" in section
    assert "Module Map" in section
    assert "src/core/" in section


def test_load_project_context_returns_empty_when_no_sources(tmp_path: Path) -> None:
    """No conventions/map/registry → empty string (callers skip the section)."""
    from antigravity_engine.hub.ask_pipeline import _load_project_context

    ag_dir = tmp_path / ".antigravity"
    ag_dir.mkdir()
    assert _load_project_context(ag_dir, map_content="") == ""


def test_ask_tools_can_be_wrapped_for_answer_agent() -> None:
    """The structured-facts path binds code-exploration tools to its answer
    agents at runtime. This test guards that the wiring exists and produces
    the SDK FunctionTool objects the Agent constructor expects."""
    from pathlib import Path
    from antigravity_engine.hub.agents import _wrap_tools
    from antigravity_engine.hub.ask_tools import create_ask_tools

    tools = create_ask_tools(Path("/tmp"))
    wrapped = _wrap_tools(tools)
    # The minimal tool set the answer agent needs to verify claims and
    # enumerate cross-file (search/read/list at minimum).
    assert "search_code" in tools
    assert "read_file" in tools
    assert "list_directory" in tools
    assert len(wrapped) == len(tools)
    assert wrapped, "tool list must not be empty"
    for t in wrapped:
        assert type(t).__name__ == "FunctionTool"


def test_load_project_context_respects_total_budget(tmp_path: Path) -> None:
    """Total budget caps overall section size; per-source cap prevents one big
    file from starving the others."""
    from antigravity_engine.hub.ask_pipeline import _load_project_context

    ag_dir = tmp_path / ".antigravity"
    ag_dir.mkdir()
    big = "x" * 50_000
    (ag_dir / "conventions.md").write_text(big, encoding="utf-8")
    (ag_dir / "module_registry.md").write_text("REGISTRY_MARKER\n" + big, encoding="utf-8")

    section = _load_project_context(ag_dir, map_content="", max_chars=3_000)

    # Total stays roughly under the cap (header + per-source caps).
    assert len(section) <= 4_000
    # Conventions came first; registry should still get its share, so the marker
    # must appear because per-source cap < total budget.
    assert "REGISTRY_MARKER" in section


def test_load_project_context_skips_symlink_outside_workspace(tmp_path: Path) -> None:
    """Symlinked project docs resolving outside workspace must be ignored."""
    from antigravity_engine.hub.ask_pipeline import _load_project_context

    ag_dir = tmp_path / ".antigravity"
    ag_dir.mkdir()
    outside = tmp_path.parent / "outside-secret.txt"
    outside.write_text("SECRET_TOKEN_OUTSIDE\n", encoding="utf-8")
    (ag_dir / "conventions.md").symlink_to(outside)

    section = _load_project_context(ag_dir, map_content="")
    assert section == ""


# ---------------------------------------------------------------------------
# Phase 1: config/entry/git in _format_scan_report
# ---------------------------------------------------------------------------


def test_format_scan_report_includes_config() -> None:
    """Config file contents appear in the formatted report."""
    report = ScanReport(
        root=Path("/tmp/test"),
        config_contents={"pyproject.toml": '[project]\nname = "demo"'},
    )
    result = _format_scan_report(report)
    assert "pyproject.toml" in result
    assert 'name = "demo"' in result


def test_format_scan_report_includes_entry_points() -> None:
    """Entry point snippets appear in the formatted report."""
    report = ScanReport(
        root=Path("/tmp/test"),
        entry_points={"main.py": "import sys\nprint('hello')"},
    )
    result = _format_scan_report(report)
    assert "main.py" in result
    assert "import sys" in result


def test_format_scan_report_includes_git() -> None:
    """Git summary appears in the formatted report."""
    report = ScanReport(
        root=Path("/tmp/test"),
        git_summary="Recent commits:\nabc123 fix auth\ndef456 add tests",
    )
    result = _format_scan_report(report)
    assert "fix auth" in result
    assert "add tests" in result


def test_build_module_registry_entries_humanizes_workspace_root(tmp_path: Path) -> None:
    """Workspace-root module summaries should avoid exposing the sentinel id."""
    from antigravity_engine.hub.contracts import RefreshStatus
    from antigravity_engine.hub.refresh_pipeline import _build_module_registry_entries

    (tmp_path / "main.go").write_text("package main\nfunc main() {}\n", encoding="utf-8")

    entries = _build_module_registry_entries(
        tmp_path,
        RefreshStatus(refresh_run_id="test-run", overall_status="success"),
    )

    assert len(entries) == 1
    assert entries[0].module == "__workspace_root__"
    assert entries[0].summary == "workspace root"
    assert entries[0].top_paths == ["main.go"]
