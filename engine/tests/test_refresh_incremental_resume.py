"""Tests for durable full-refresh stage and group resumption."""
from __future__ import annotations

import json
import types
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from repobrain_engine.hub.scanner import ScanReport


class _Source:
    def __init__(self, rel_path: str) -> None:
        self.rel_path = rel_path
        self.content = "value = 1\n"
        self.language = "Python"


class _Group:
    def __init__(self, name: str, files: list[str]) -> None:
        self.name = name
        self.files = [_Source(path) for path in files]


class _Agent:
    def __init__(self, name: str) -> None:
        self.name = name


def _mock_agents_module(runner: AsyncMock) -> MagicMock:
    mock_agents_module = MagicMock()
    mock_agents_module.Runner.run = runner
    mock_agents_module.Agent = MagicMock()
    mock_agents_module.set_tracing_disabled = MagicMock()
    return mock_agents_module


def _patch_common_refresh(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    *,
    report: ScanReport,
    module_entries: list,
) -> None:
    monkeypatch.setenv("WORKSPACE_PATH", str(tmp_path))
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("RB_REFRESH_RETRY_COUNT", "0")
    monkeypatch.setenv("RB_REFRESH_SCAN_ONLY", "0")

    from repobrain_engine.config import reset_settings
    from repobrain_engine.hub import agents as agents_mod
    from repobrain_engine.hub import scanner
    from repobrain_engine.hub import refresh_pipeline as refresh_mod

    reset_settings()
    monkeypatch.setattr(agents_mod, "create_model", lambda settings: "test-model")
    monkeypatch.setattr(agents_mod, "build_refresh_agent", lambda model: _Agent("Conventions"))
    monkeypatch.setattr(agents_mod, "build_refresh_git_agent", lambda model, workspace: _Agent("Git"))
    monkeypatch.setattr(
        agents_mod,
        "build_refresh_module_swarm_v2",
        lambda model, workspace, modules_filter=None: module_entries,
    )
    monkeypatch.setattr(scanner, "detect_modules", lambda workspace: ["src"])
    monkeypatch.setattr(scanner, "resolve_module_path", lambda workspace, module: workspace / module)
    monkeypatch.setattr(scanner, "full_scan", lambda workspace: report)
    monkeypatch.setattr(scanner, "extract_structure", lambda workspace: "# Structure\n")
    monkeypatch.setattr(scanner, "build_knowledge_graph", lambda workspace, scan_report: {})
    monkeypatch.setattr(scanner, "render_knowledge_graph_markdown", lambda graph: "# Graph\n")
    monkeypatch.setattr(scanner, "render_knowledge_graph_mermaid", lambda graph: "graph TD\n")
    monkeypatch.setattr(refresh_mod, "_get_head_sha", lambda workspace: "head-current")

    monkeypatch.setattr(refresh_mod, "_build_module_registry_entries", lambda *args: [])

    async def _fake_map(*args, **kwargs):
        return "# Module Map\n"

    monkeypatch.setattr(refresh_mod, "_generate_map_md", _fake_map)


@pytest.mark.asyncio
async def test_refresh_resume_skips_groups_completed_at_same_head(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    rb_dir = tmp_path / ".repobrain"
    rb_dir.mkdir()
    (rb_dir / "status.json").write_text(
        json.dumps(
            {
                "refresh_run_id": "previous",
                "overall_status": "partial",
                "head_sha": "head-current",
                "modules": {"src": "partial"},
                "groups": {"src/group_a": "success", "src/group_b": "failed"},
                "group_head_shas": {
                    "src/group_a": "head-current",
                    "src/group_b": "head-current",
                },
            }
        ),
        encoding="utf-8",
    )
    (rb_dir / "agents/src").mkdir(parents=True)
    (rb_dir / "agents/src/group_a.md").write_text("# Saved group A\n", encoding="utf-8")
    report = ScanReport(root=tmp_path)
    module_entries = [
        (
            "src",
            [
                ("group_a", _Group("group_a", ["src/a.py"]), _Agent("RefreshModule_src_group_a")),
                ("group_b", _Group("group_b", ["src/b.py"]), _Agent("RefreshModule_src_group_b")),
            ],
        )
    ]
    runner = AsyncMock(return_value=types.SimpleNamespace(final_output="# Agent doc\n"))

    _patch_common_refresh(
        tmp_path,
        monkeypatch,
        report=report,
        module_entries=module_entries,
    )

    with patch.dict("sys.modules", {"agents": _mock_agents_module(runner)}):
        from repobrain_engine.hub.refresh_pipeline import _refresh_pipeline_into_generation

        status = await _refresh_pipeline_into_generation(tmp_path, resume=True)

    module_agent_names = [
        call.args[0].name
        for call in runner.await_args_list
        if call.args and call.args[0].name.startswith("RefreshModule_")
    ]
    assert module_agent_names == ["RefreshModule_src_group_b"]
    assert status.groups["src/group_a"] == "success"
    assert status.groups["src/group_b"] == "success"


@pytest.mark.asyncio
async def test_full_refresh_resume_reuses_durable_group_after_partial_failure(tmp_path, monkeypatch):
    from repobrain_engine.hub import refresh_pipeline as refresh_mod
    entries = [("src", [
        ("group_a", _Group("group_a", ["src/a.py"]), _Agent("RefreshModule_src_group_a")),
        ("group_b", _Group("group_b", ["src/b.py"]), _Agent("RefreshModule_src_group_b")),
    ])]
    _patch_common_refresh(tmp_path, monkeypatch, report=ScanReport(root=tmp_path), module_entries=entries)
    fail_b = True

    async def run(agent, *args, **kwargs):
        if agent.name == "RefreshModule_src_group_b" and fail_b:
            raise RuntimeError("model unavailable")
        if agent.name == "Git":
            target = tmp_path / ".repobrain/modules/_git_insights.md"
            target.write_text("# Git insights\n", encoding="utf-8")
        return types.SimpleNamespace(final_output=f"# {agent.name}\n")

    runner = AsyncMock(side_effect=run)
    with patch.dict("sys.modules", {"agents": _mock_agents_module(runner)}):
        first = await refresh_mod._refresh_pipeline_into_generation(tmp_path)
        assert first.overall_status == "partial"
        saved = tmp_path / ".repobrain/agents/src/group_a.md"
        assert saved.read_text() == "# RefreshModule_src_group_a"
        fail_b = False
        runner.reset_mock()
        second = await refresh_mod._refresh_pipeline_into_generation(tmp_path, resume=True)

    assert [call.args[0].name for call in runner.await_args_list] == ["RefreshModule_src_group_b"]
    assert second.overall_status == "success"
    assert second.failures == []
    assert saved.read_text() == "# RefreshModule_src_group_a"
    assert (tmp_path / ".repobrain/agents/src/group_b.md").exists()
    assert not (tmp_path / ".repobrain/agents/src.md").exists()


@pytest.mark.asyncio
async def test_resume_missing_document_reruns_successful_group(tmp_path, monkeypatch):
    from repobrain_engine.hub import refresh_pipeline as refresh_mod
    entries = [("src", [("group_a", _Group("group_a", ["src/a.py"]), _Agent("RefreshModule_src_group_a"))])]
    _patch_common_refresh(tmp_path, monkeypatch, report=ScanReport(root=tmp_path), module_entries=entries)
    rb_dir = tmp_path / ".repobrain"
    rb_dir.mkdir()
    (rb_dir / "status.json").write_text(json.dumps({
        "refresh_run_id": "interrupted", "overall_status": "partial", "head_sha": "head-current",
        "groups": {"src/group_a": "success"}, "group_head_shas": {"src/group_a": "head-current"},
    }))
    runner = AsyncMock(return_value=types.SimpleNamespace(final_output="# Fresh doc\n"))
    with patch.dict("sys.modules", {"agents": _mock_agents_module(runner)}):
        status = await refresh_mod._refresh_pipeline_into_generation(tmp_path, resume=True)
    assert "RefreshModule_src_group_a" in [call.args[0].name for call in runner.await_args_list]
    assert status.groups["src/group_a"] == "success"
    assert (rb_dir / "agents/src.md").read_text() == "# Fresh doc"


@pytest.mark.asyncio
@pytest.mark.parametrize("payload", ["{invalid", '{"stages": []}', '{"refresh_run_id":"old","overall_status":"partial","stages":[]}'])
async def test_corrupt_resume_status_rebuilds_safely(tmp_path, monkeypatch, payload):
    from repobrain_engine.hub import refresh_pipeline as refresh_mod
    _patch_common_refresh(tmp_path, monkeypatch, report=ScanReport(root=tmp_path), module_entries=[])
    rb_dir = tmp_path / ".repobrain"
    rb_dir.mkdir()
    (rb_dir / "status.json").write_text(payload)
    runner = AsyncMock(return_value=types.SimpleNamespace(final_output="# Fresh doc\n"))
    with patch.dict("sys.modules", {"agents": _mock_agents_module(runner)}):
        await refresh_mod._refresh_pipeline_into_generation(tmp_path, resume=True)
    assert "Conventions" in [call.args[0].name for call in runner.await_args_list]


@pytest.mark.asyncio
async def test_group_document_is_durable_before_success_checkpoint(tmp_path, monkeypatch):
    from repobrain_engine.hub import refresh_pipeline as refresh_mod
    entries = [("src", [("group_a", _Group("group_a", ["src/a.py"]), _Agent("RefreshModule_src_group_a"))])]
    _patch_common_refresh(tmp_path, monkeypatch, report=ScanReport(root=tmp_path), module_entries=entries)
    original_write = refresh_mod._write_refresh_status
    def inspect_checkpoint(rb_dir, status):
        if status.groups.get("src/group_a") == "success":
            assert (rb_dir / "agents/src.md").read_text().strip() == "# Fresh doc"
        original_write(rb_dir, status)
    monkeypatch.setattr(refresh_mod, "_write_refresh_status", inspect_checkpoint)
    runner = AsyncMock(return_value=types.SimpleNamespace(final_output="# Fresh doc\n"))
    with patch.dict("sys.modules", {"agents": _mock_agents_module(runner)}):
        await refresh_mod._refresh_pipeline_into_generation(tmp_path)


@pytest.mark.asyncio
async def test_resume_stage_with_missing_artifact_is_rebuilt(tmp_path, monkeypatch):
    from repobrain_engine.hub import refresh_pipeline as refresh_mod
    _patch_common_refresh(tmp_path, monkeypatch, report=ScanReport(root=tmp_path), module_entries=[])
    runner = AsyncMock(return_value=types.SimpleNamespace(final_output="# Fresh doc\n"))
    with patch.dict("sys.modules", {"agents": _mock_agents_module(runner)}):
        await refresh_mod._refresh_pipeline_into_generation(tmp_path)
        (tmp_path / ".repobrain/conventions.md").unlink()
        runner.reset_mock()
        await refresh_mod._refresh_pipeline_into_generation(tmp_path, resume=True)
    assert "Conventions" in [call.args[0].name for call in runner.await_args_list]


@pytest.mark.asyncio
async def test_cancelled_full_run_can_resume_without_repeating_scan(tmp_path, monkeypatch):
    import asyncio
    from repobrain_engine.hub import refresh_pipeline as refresh_mod, scanner
    entries = [("src", [
        ("group_a", _Group("group_a", ["src/a.py"]), _Agent("RefreshModule_src_group_a")),
        ("group_b", _Group("group_b", ["src/b.py"]), _Agent("RefreshModule_src_group_b")),
    ])]
    _patch_common_refresh(tmp_path, monkeypatch, report=ScanReport(root=tmp_path), module_entries=entries)
    interrupt = True
    async def run(agent, *args, **kwargs):
        if agent.name == "RefreshModule_src_group_b" and interrupt:
            raise asyncio.CancelledError()
        if agent.name == "Git":
            (tmp_path / ".repobrain/modules/_git_insights.md").write_text("# Git\n")
        return types.SimpleNamespace(final_output="# Saved document\n")
    runner = AsyncMock(side_effect=run)
    with patch.dict("sys.modules", {"agents": _mock_agents_module(runner)}):
        with pytest.raises(asyncio.CancelledError):
            await refresh_mod._refresh_pipeline_into_generation(tmp_path)
        progress = json.loads((tmp_path / ".repobrain/status.json").read_text())
        assert progress["groups"]["src/group_a"] == "success"
        interrupt = False
        def scan_must_not_repeat(workspace):
            raise AssertionError("completed scan was rerun")
        monkeypatch.setattr(scanner, "full_scan", scan_must_not_repeat)
        runner.reset_mock()
        status = await refresh_mod._refresh_pipeline_into_generation(tmp_path, resume=True)
    assert status.overall_status == "success"
    assert "RefreshModule_src_group_a" not in [call.args[0].name for call in runner.await_args_list]


@pytest.mark.asyncio
async def test_failed_document_write_is_not_checkpointed_as_success(tmp_path, monkeypatch):
    from repobrain_engine.hub import refresh_pipeline as refresh_mod
    entries = [("src", [("group_a", _Group("group_a", ["src/a.py"]), _Agent("RefreshModule_src_group_a"))])]
    _patch_common_refresh(tmp_path, monkeypatch, report=ScanReport(root=tmp_path), module_entries=entries)
    original_write = refresh_mod.atomic_write_text
    def fail_document(path, content):
        if path.name == "src.md":
            raise OSError("disk unavailable")
        return original_write(path, content)
    monkeypatch.setattr(refresh_mod, "atomic_write_text", fail_document)
    runner = AsyncMock(return_value=types.SimpleNamespace(final_output="# Fresh doc\n"))
    with patch.dict("sys.modules", {"agents": _mock_agents_module(runner)}):
        status = await refresh_mod._refresh_pipeline_into_generation(tmp_path)
    assert status.groups["src/group_a"] == "failed"
    checkpoint = json.loads((tmp_path / ".repobrain/status.json").read_text())
    assert checkpoint["groups"]["src/group_a"] == "failed"
    assert status.overall_status == "failed"
