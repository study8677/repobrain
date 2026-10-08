"""User-facing refresh selection and generation integrity contracts."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest

from repobrain_engine.config import reset_settings
from repobrain_engine.hub.contracts import RefreshStatus
from repobrain_engine.hub.incremental import build_workspace_snapshot, save_snapshot
from repobrain_engine.hub.refresh_lifecycle import generation_config, save_recovery
from repobrain_engine.hub.refresh_pipeline import refresh_pipeline
from repobrain_engine.hub.storage import (
    atomic_write_json, atomic_write_text, create_generation, knowledge_root,
    read_current_pointer,
)


@pytest.fixture
def project(tmp_path, monkeypatch, commit_workspace):
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "service.py").write_text("def price():\n    return 10\n")
    commit_workspace(tmp_path)
    monkeypatch.setenv("WORKSPACE_PATH", str(tmp_path))
    monkeypatch.setenv("OPENAI_API_KEY", "")
    monkeypatch.setenv("OPENAI_BASE_URL", "")
    monkeypatch.setenv("RB_HOST_RUNNER", "generic")
    monkeypatch.setenv("RB_HOST_COMMAND", "trae-cli exec -o {output_file}")
    monkeypatch.setenv("RB_REFRESH_SCAN_ONLY", "0")
    reset_settings()
    yield tmp_path
    reset_settings()


@pytest.fixture
def full_worker(monkeypatch):
    calls = []

    async def build(workspace, *, resume=False):
        calls.append((knowledge_root(workspace), resume))
        head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=workspace, text=True).strip()
        snapshot = build_workspace_snapshot(workspace, head)
        for group in snapshot["groups"].values():
            atomic_write_text(knowledge_root(workspace) / group["artifact_path"], "# Complete source knowledge\n")
        atomic_write_text(knowledge_root(workspace) / "map.md", "# Complete module map\n")
        return RefreshStatus(refresh_run_id="test", overall_status="success", head_sha=head,
                             stages={"module_docs": "success"})

    monkeypatch.setattr("repobrain_engine.hub.refresh_pipeline._refresh_pipeline_into_generation", build)
    return calls


@pytest.mark.asyncio
async def test_first_build_then_noop_without_model(project, full_worker, monkeypatch):
    first = await refresh_pipeline(project)
    pointer = read_current_pointer(project)
    monkeypatch.setattr("repobrain_engine.hub.agents.create_model", lambda _: pytest.fail("no-op called a model"))
    second = await refresh_pipeline(project)
    assert first.mode == "full"
    assert second.mode == "noop"
    assert len(full_worker) == 1
    assert read_current_pointer(project) == pointer


@pytest.mark.asyncio
async def test_full_always_starts_new_generation(project, full_worker):
    await refresh_pipeline(project)
    pointer = read_current_pointer(project)
    forced = await refresh_pipeline(project, full=True)
    assert forced.mode == "full" and not forced.resumed
    assert len(full_worker) == 2 and full_worker[0][0] != full_worker[1][0]
    assert read_current_pointer(project) != pointer


@pytest.mark.asyncio
async def test_changed_commit_selects_incremental(project, full_worker, monkeypatch):
    await refresh_pipeline(project)
    (project / "src" / "service.py").write_text("def price():\n    return 12\n")
    subprocess.run(["git", "add", "src/service.py"], cwd=project, check=True)
    subprocess.run(["git", "commit", "-qm", "修改价格"], cwd=project, check=True)
    calls = []

    async def incremental(workspace, *, config):
        calls.append(workspace)
        return RefreshStatus(refresh_run_id="incremental", overall_status="success", mode="incremental")

    monkeypatch.setattr("repobrain_engine.hub.incremental.incremental_refresh", incremental)
    result = await refresh_pipeline(project)
    assert result.mode == "incremental" and calls == [project]
    assert len(full_worker) == 1


@pytest.mark.asyncio
async def test_legacy_scan_only_is_not_complete_baseline(project, full_worker):
    root = project / ".repobrain"
    root.mkdir()
    atomic_write_json(root / "status.json", {"overall_status": "success", "stages": {"module_docs": "skipped"}})
    atomic_write_text(root / "structure.md", "# Old scan\n")
    result = await refresh_pipeline(project)
    assert result.mode == "full" and len(full_worker) == 1
    assert (root / "structure.md").read_text() == "# Old scan\n"


@pytest.mark.asyncio
@pytest.mark.parametrize("failure", ["partial", "exception", "cancel"])
async def test_first_build_failure_is_automatically_resumed(project, full_worker, monkeypatch, failure):
    import asyncio
    from repobrain_engine.hub import refresh_pipeline as pipeline

    build = pipeline._refresh_pipeline_into_generation
    calls = []

    async def interrupt(workspace, *, resume=False):
        calls.append((knowledge_root(workspace), resume))
        if len(calls) == 1:
            atomic_write_json(knowledge_root(workspace) / "status.json", {
                "refresh_run_id": "interrupted", "overall_status": "partial",
            })
            if failure == "exception":
                raise RuntimeError("injected provider failure")
            if failure == "cancel":
                raise asyncio.CancelledError()
            return RefreshStatus(refresh_run_id="interrupted", overall_status="partial")
        return await build(workspace, resume=resume)

    monkeypatch.setattr(pipeline, "_refresh_pipeline_into_generation", interrupt)
    if failure == "partial":
        assert (await refresh_pipeline(project)).overall_status == "partial"
    else:
        with pytest.raises(RuntimeError if failure == "exception" else asyncio.CancelledError):
            await refresh_pipeline(project)
    assert read_current_pointer(project) is None
    assert (calls[0][0] / "resume.json").is_file()
    result = await refresh_pipeline(project)
    assert result.overall_status == "success" and result.resumed
    assert calls[1] == (calls[0][0], True)


@pytest.mark.asyncio
async def test_forced_rebuild_failure_keeps_old_active_generation(project, full_worker, monkeypatch):
    await refresh_pipeline(project)
    pointer = read_current_pointer(project)

    async def fail(workspace, *, resume=False):
        return RefreshStatus(refresh_run_id="failure", overall_status="partial")

    monkeypatch.setattr("repobrain_engine.hub.refresh_pipeline._refresh_pipeline_into_generation", fail)
    assert (await refresh_pipeline(project, full=True)).overall_status == "partial"
    assert read_current_pointer(project) == pointer


@pytest.mark.asyncio
@pytest.mark.parametrize("corruption", ["pointer", "snapshot", "status", "document", "config"])
async def test_damaged_baseline_requires_explicit_rebuild(project, full_worker, corruption):
    await refresh_pipeline(project)
    if corruption == "pointer":
        atomic_write_text(project / ".repobrain" / "current.json", "broken")
    elif corruption in {"snapshot", "status"}:
        atomic_write_text(knowledge_root(project) / f"{corruption}.json", "broken")
    elif corruption == "config":
        atomic_write_json(knowledge_root(project) / "refresh_config.json", {})
    else:
        snapshot = json.loads((knowledge_root(project) / "snapshot.json").read_text())
        (knowledge_root(project) / next(iter(snapshot["groups"].values()))["artifact_path"]).unlink()
    with pytest.raises(RuntimeError, match="rb-refresh --full"):
        await refresh_pipeline(project)
    assert len(full_worker) == 1
    assert (await refresh_pipeline(project, full=True)).overall_status == "success"


@pytest.mark.asyncio
async def test_config_change_rebuilds_and_does_not_resume_old_task(project, full_worker, monkeypatch):
    await refresh_pipeline(project)
    pointer = read_current_pointer(project)
    stale = create_generation(project, "unfinished", clone_active=False)
    save_recovery(stale, mode="full", target_head=pointer["head_sha"],
                  baseline_generation=pointer["generation"], config=generation_config())
    monkeypatch.setenv("RB_HOST_COMMAND", "trae-cli exec --color never -o {output_file}")
    reset_settings()
    result = await refresh_pipeline(project)
    assert result.mode == "full" and not result.resumed
    assert full_worker[-1][0] != stale


@pytest.mark.asyncio
async def test_changed_head_and_corrupt_recovery_records_are_not_reused(project, full_worker):
    head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=project, text=True).strip()
    stale = create_generation(project, "stale", clone_active=False)
    save_recovery(stale, mode="full", target_head=head,
                  baseline_generation=None, config=generation_config())
    broken = create_generation(project, "z-broken", clone_active=False)
    atomic_write_text(broken / "resume.json", "broken")
    subprocess.run(["git", "commit", "--allow-empty", "-qm", "新版本"], cwd=project, check=True)
    result = await refresh_pipeline(project)
    assert not result.resumed and full_worker[-1][0] not in {stale, broken}


@pytest.mark.asyncio
async def test_source_changes_during_refresh_invalidate_candidate(project, full_worker, monkeypatch):
    await refresh_pipeline(project)
    pointer = read_current_pointer(project)
    from repobrain_engine.hub import refresh_pipeline as pipeline
    build = pipeline._refresh_pipeline_into_generation

    async def change_source(workspace, *, resume=False):
        status = await build(workspace, resume=resume)
        (workspace / "src" / "service.py").write_text("uncommitted edit\n")
        return status

    monkeypatch.setattr(pipeline, "_refresh_pipeline_into_generation", change_source)
    with pytest.raises(RuntimeError, match="clean worktree"):
        await refresh_pipeline(project, full=True)
    assert read_current_pointer(project) == pointer
    recovery = json.loads((full_worker[-1][0] / "resume.json").read_text())
    assert recovery["invalidated"] is True


@pytest.mark.asyncio
async def test_old_python_arguments_are_rejected(project):
    for kwargs in ({"quick": True}, {"failed_only": True}):
        with pytest.raises(TypeError):
            await refresh_pipeline(project, **kwargs)


def test_credentials_are_not_persisted_in_recovery_metadata(project, monkeypatch):
    monkeypatch.setenv("RB_HOST_COMMAND", "trae-cli exec --token private-test-token")
    reset_settings()
    assert "private-test-token" not in json.dumps(generation_config())


@pytest.mark.asyncio
async def test_root_level_code_full_build_has_valid_incremental_baseline(project, monkeypatch):
    from types import SimpleNamespace
    from agents import Runner
    from repobrain_engine.hub import agents, refresh_pipeline as pipeline

    (project / "entry.py").write_text("def main():\n    return 42\n")
    subprocess.run(["git", "add", "entry.py"], cwd=project, check=True)
    subprocess.run(["git", "commit", "-qm", "添加根目录入口"], cwd=project, check=True)
    monkeypatch.setattr(agents, "create_model", lambda _: "test-model")
    calls = []

    async def analyze(agent, *args, **kwargs):
        calls.append(agent.name)
        if agent.name == "RefreshGitAgent":
            atomic_write_text(knowledge_root(project) / "modules/_git_insights.md", "# Git history\n")
        return SimpleNamespace(final_output="# Source knowledge\n")

    monkeypatch.setattr(Runner, "run", analyze)

    async def generate_map(*args):
        return "# Module map\n"

    monkeypatch.setattr(pipeline, "_generate_map_md", generate_map)
    assert (await refresh_pipeline(project)).overall_status == "success"
    snapshot = json.loads((knowledge_root(project) / "snapshot.json").read_text())
    assert any(group["module"] == "__workspace_root__" for group in snapshot["groups"].values())
    for group in snapshot["groups"].values():
        assert (knowledge_root(project) / group["artifact_path"]).is_file()
    call_count = len(calls)
    assert (await refresh_pipeline(project)).mode == "noop"
    assert len(calls) == call_count
