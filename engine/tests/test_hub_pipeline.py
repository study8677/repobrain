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


@pytest.mark.asyncio
async def test_refresh_pipeline_creates_conventions(tmp_path: Path, monkeypatch) -> None:
    """refresh_pipeline writes conventions.md."""
    monkeypatch.setenv("WORKSPACE_PATH", str(tmp_path))
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)

    from antigravity_engine.config import reset_settings
    from antigravity_engine.hub.host_llm import set_host_llm_capability
    reset_settings()
    set_host_llm_capability(None)

    ag_dir = tmp_path / ".antigravity"
    ag_dir.mkdir()

    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "app.py").write_text("def run() -> str:\n    return 'ok'\n", encoding="utf-8")

    def fake_host_llm(request):
        if request.task == "conventions":
            return {"content": "# Conventions\n\nThis is a Python project."}
        if request.task == "module_knowledge":
            rel_file = request.context["source_files"][0]
            return {
                "data": {
                    "module": request.module,
                    "path": request.context["module_path"],
                    "summary": f"{request.module} contains Python runtime code.",
                    "responsibilities": ["Owns runtime code for the test project."],
                    "key_files": [
                        {
                            "path": rel_file,
                            "purpose": "Implements the test runtime function.",
                            "references": [{"file": rel_file, "start_line": 1, "end_line": 2}],
                        }
                    ],
                    "public_apis": [
                        {
                            "name": "run",
                            "kind": "function",
                            "purpose": "Returns the test runtime value.",
                            "signature": "run() -> str",
                            "references": [{"file": rel_file, "start_line": 1, "end_line": 2}],
                        }
                    ],
                    "data_flow": ["run() returns a string directly to its caller."],
                    "dependencies": ["No non-stdlib dependency is used."],
                    "configuration": ["No runtime configuration is used."],
                    "risks": ["Small test module."],
                    "source_references": [{"file": rel_file, "start_line": 1, "end_line": 2}],
                }
            }
        raise AssertionError(request.task)

    set_host_llm_capability(fake_host_llm)
    try:
        import importlib
        import antigravity_engine.hub.pipeline as pipeline_mod
        importlib.reload(pipeline_mod)

        await pipeline_mod.refresh_pipeline(tmp_path, quick=False)
    finally:
        set_host_llm_capability(None)

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

    from antigravity_engine.config import reset_settings
    from antigravity_engine.hub.host_llm import set_host_llm_capability
    reset_settings()

    ag_dir = tmp_path / ".antigravity"
    ag_dir.mkdir()
    (ag_dir / "conventions.md").write_text("Python + FastAPI", encoding="utf-8")
    (ag_dir / "status.json").write_text("{}", encoding="utf-8")
    (ag_dir / "map.md").write_text("# Module Map\n", encoding="utf-8")
    (ag_dir / "agents").mkdir()
    (ag_dir / "agents" / "src.md").write_text("Uses FastAPI.", encoding="utf-8")

    def fake_host_llm(request):
        assert request.task == "answer_question"
        return {"content": "This project uses FastAPI."}

    set_host_llm_capability(fake_host_llm)
    try:
        import antigravity_engine.hub.pipeline as pipeline_mod

        answer = await pipeline_mod.ask_pipeline(tmp_path, "What framework?")
    finally:
        set_host_llm_capability(None)

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
