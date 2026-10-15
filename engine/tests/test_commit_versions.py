"""Real Git branch/rollback tests for local knowledge version selection."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest

from repobrain_engine.config import reset_settings
from repobrain_engine.hub import ask_pipeline as ask_mod
from repobrain_engine.hub import refresh_pipeline as refresh_mod
from repobrain_engine.hub.contracts import ImpactPlan, RefreshStatus
from repobrain_engine.hub.incremental import build_workspace_snapshot
from repobrain_engine.hub.refresh_lifecycle import generation_config, save_recovery
from repobrain_engine.hub.storage import (
    atomic_write_json, atomic_write_text, create_generation, knowledge_root,
    read_current_pointer,
)
from repobrain_engine.hub.versions import find_exact_generation, select_refresh_baseline


def git(workspace: Path, *args: str) -> str:
    return subprocess.check_output(["git", *args], cwd=workspace, text=True).strip()


def change(workspace: Path, value: int) -> str:
    (workspace / "src" / "app.py").write_text(f"def value():\n    return {value}\n")
    git(workspace, "add", "src")
    git(workspace, "commit", "-qm", f"修改数值为 {value}")
    return git(workspace, "rev-parse", "HEAD")


@pytest.fixture
def project(tmp_path, monkeypatch, commit_workspace):
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "app.py").write_text("def value():\n    return 0\n")
    commit_workspace(tmp_path)
    git(tmp_path, "config", "core.hooksPath", str(tmp_path / ".git" / "no-hooks"))
    monkeypatch.setenv("WORKSPACE_PATH", str(tmp_path))
    monkeypatch.setenv("OPENAI_API_KEY", "")
    monkeypatch.setenv("OPENAI_BASE_URL", "")
    monkeypatch.setenv("RB_HOST_RUNNER", "generic")
    monkeypatch.setenv("RB_HOST_COMMAND", "test-runner {output_file}")
    monkeypatch.setenv("RB_REFRESH_SCAN_ONLY", "0")
    reset_settings()
    yield tmp_path
    reset_settings()


@pytest.fixture
def full_worker(monkeypatch):
    calls = []

    async def build(workspace, *, resume=False):
        head = git(workspace, "rev-parse", "HEAD")
        root = knowledge_root(workspace)
        calls.append(root)
        snapshot = build_workspace_snapshot(workspace, head)
        for group in snapshot["groups"].values():
            atomic_write_text(root / group["artifact_path"], f"# Knowledge for {head}\n")
        atomic_write_text(root / "map.md", f"# Map for {head}\n")
        return RefreshStatus(refresh_run_id="fixture", overall_status="success",
                             head_sha=head, stages={"module_docs": "success"})

    monkeypatch.setattr(refresh_mod, "_refresh_pipeline_into_generation", build)
    return calls


@pytest.fixture
def answer_worker(monkeypatch):
    calls = []

    async def answer(workspace, question):
        calls.append(knowledge_root(workspace))
        return next((knowledge_root(workspace) / "agents").rglob("*.md")).read_text().strip()

    monkeypatch.setattr(ask_mod, "_ask_selected_generation", answer)
    return calls


@pytest.mark.asyncio
async def test_branch_round_trip_asks_reuse_exact_versions_without_writing_pointer(
    project, full_worker, answer_worker,
):
    git(project, "checkout", "-qb", "login")
    login = change(project, 1)
    await refresh_mod.refresh_pipeline(project, full=True)
    login_pointer = read_current_pointer(project)
    git(project, "checkout", "-qb", "payment", f"{login}~1")
    payment = change(project, 2)
    await refresh_mod.refresh_pipeline(project, full=True)
    payment_pointer = read_current_pointer(project)
    marker = (project / ".repobrain" / ".last_refresh_sha").read_text()

    for branch, head in (("login", login), ("payment", payment), ("login", login)):
        git(project, "checkout", "-q", branch)
        assert await ask_mod.ask_pipeline(project, "Which version?") == f"# Knowledge for {head}"
        assert read_current_pointer(project) == payment_pointer
        assert (project / ".repobrain" / ".last_refresh_sha").read_text() == marker
    assert answer_worker[0].name == login_pointer["generation"]
    assert answer_worker[1].name == payment_pointer["generation"]
    assert len(full_worker) == 2


@pytest.mark.asyncio
async def test_refresh_restores_historical_commit_without_generating(project, full_worker, monkeypatch):
    head = git(project, "rev-parse", "HEAD")
    await refresh_mod.refresh_pipeline(project)
    original = read_current_pointer(project)
    change(project, 1)
    await refresh_mod.refresh_pipeline(project, full=True)
    git(project, "checkout", "-q", "--detach", head)
    monkeypatch.setattr("repobrain_engine.hub.agents.create_model", lambda _: pytest.fail("reuse called a model"))

    status = await refresh_mod.refresh_pipeline(project)

    assert status.mode == "noop"
    assert read_current_pointer(project)["generation"] == original["generation"]
    assert len(full_worker) == 2


@pytest.mark.asyncio
@pytest.mark.parametrize("target", ["rollback", "sibling"])
async def test_missing_exact_knowledge_stops_before_model(
    project, full_worker, answer_worker, target,
):
    parent = git(project, "rev-parse", "HEAD")
    change(project, 1)
    await refresh_mod.refresh_pipeline(project)
    pointer = read_current_pointer(project)
    if target == "rollback":
        git(project, "checkout", "-q", "--detach", parent)
    elif target == "sibling":
        git(project, "checkout", "-qb", "other", parent)
        change(project, 2)

    with pytest.raises(ValueError, match="当前提交及祖先没有可用知识库"):
        await ask_mod.ask_pipeline(project, "Do not read the other version")
    assert not answer_worker
    assert read_current_pointer(project) == pointer


@pytest.mark.asyncio
async def test_incremental_clones_selected_ancestor_not_last_active_sibling(
    project, full_worker, monkeypatch,
):
    parent = git(project, "rev-parse", "HEAD")
    await refresh_mod.refresh_pipeline(project)
    base = read_current_pointer(project)
    git(project, "checkout", "-qb", "other")
    change(project, 1)
    await refresh_mod.refresh_pipeline(project, full=True)
    sibling = read_current_pointer(project)
    git(project, "checkout", "-qb", "feature", parent)
    target = change(project, 2)
    selected = select_refresh_baseline(project, target, generation_config())
    assert selected["generation"] == base["generation"]

    async def plan(**kwargs):
        assert kwargs["baseline_generation"] == base["generation"]
        return ImpactPlan(
            run_id=kwargs["run_id"], baseline_generation=base["generation"],
            baseline_head=parent, target_head=target, changes=kwargs["changes"],
        )

    async def execute(workspace, snapshot, affected, model, status):
        # Inspect the real cloned directory, not only the selected metadata.
        assert next((knowledge_root(workspace) / "agents").rglob("*.md")).read_text() == f"# Knowledge for {parent}\n"
        assert not (knowledge_root(workspace) / "published.json").exists()

    monkeypatch.setattr("repobrain_engine.hub.agents.create_model", lambda _: object())
    monkeypatch.setattr("repobrain_engine.hub.incremental.build_impact_plan", plan)
    monkeypatch.setattr("repobrain_engine.hub.incremental.execute_affected_groups", execute)
    monkeypatch.setattr("repobrain_engine.hub.incremental.update_related_artifacts", lambda *args: None)

    result = await refresh_mod.refresh_pipeline(project)

    assert result.mode == "incremental"
    assert result.baseline_generation == base["generation"]
    assert read_current_pointer(project)["head_sha"] == target
    assert (project / ".repobrain" / "generations" / sibling["generation"]).is_dir()


@pytest.mark.asyncio
async def test_sibling_without_indexed_ancestor_builds_full(project, full_worker):
    parent = git(project, "rev-parse", "HEAD")
    change(project, 1)
    await refresh_mod.refresh_pipeline(project)
    git(project, "checkout", "-qb", "other", parent)
    change(project, 2)
    result = await refresh_mod.refresh_pipeline(project)
    assert result.mode == "full" and len(full_worker) == 2


@pytest.mark.asyncio
async def test_failed_candidate_and_corrupt_historical_document_are_not_reused(
    project, full_worker, answer_worker,
):
    parent = git(project, "rev-parse", "HEAD")
    await refresh_mod.refresh_pipeline(project)
    original = read_current_pointer(project)
    change(project, 1)
    await refresh_mod.refresh_pipeline(project, full=True)
    git(project, "checkout", "-q", "--detach", parent)
    root = project / ".repobrain" / "generations" / original["generation"]
    # A copied success status does not make an interrupted candidate usable.
    candidate = create_generation(project, "unfinished-copy", clone_active=False,
                                  source_generation=original["generation"])
    save_recovery(candidate, mode="full", target_head=parent,
                  baseline_generation=None, config=generation_config())
    snapshot = json.loads((root / "snapshot.json").read_text())
    (root / next(iter(snapshot["groups"].values()))["artifact_path"]).unlink()

    assert find_exact_generation(project, parent, generation_config()) is None
    with pytest.raises(ValueError, match="rb-refresh"):
        await ask_mod.ask_pipeline(project, "No stale fallback")
    assert not answer_worker


@pytest.mark.asyncio
async def test_legacy_completed_generation_without_receipt_can_be_reused(
    project, full_worker, answer_worker,
):
    parent = git(project, "rev-parse", "HEAD")
    await refresh_mod.refresh_pipeline(project)
    root = knowledge_root(project)
    (root / "published.json").unlink()
    change(project, 1)
    await refresh_mod.refresh_pipeline(project, full=True)
    git(project, "checkout", "-q", "--detach", parent)
    assert await ask_mod.ask_pipeline(project, "Old format") == f"# Knowledge for {parent}"


@pytest.mark.asyncio
async def test_dirty_code_can_be_asked_but_checkout_during_answer_is_rejected(
    project, full_worker, answer_worker, monkeypatch,
):
    parent = git(project, "rev-parse", "HEAD")
    await refresh_mod.refresh_pipeline(project)
    change(project, 1)
    await refresh_mod.refresh_pipeline(project, full=True)
    (project / "src" / "app.py").write_text("uncommitted edit\n")
    answer = await ask_mod.ask_pipeline(project, "Dirty")
    assert "工作区有未提交修改" in answer
    assert len(answer_worker) == 1
    git(project, "restore", "src/app.py")

    async def switch_branch(workspace, question):
        before = knowledge_root(workspace)
        git(workspace, "checkout", "-q", "--detach", parent)
        assert knowledge_root(workspace) == before
        return "answer based on the previous commit"

    monkeypatch.setattr(ask_mod, "_ask_selected_generation", switch_branch)
    with pytest.raises(ValueError, match="HEAD changed"):
        await ask_mod.ask_pipeline(project, "Switch while answering")


@pytest.mark.asyncio
async def test_same_commit_on_renamed_branch_reuses_generation(project, full_worker):
    await refresh_mod.refresh_pipeline(project)
    original = read_current_pointer(project)
    git(project, "checkout", "-qb", "feature/renamed")
    result = await refresh_mod.refresh_pipeline(project)
    assert result.mode == "noop" and len(full_worker) == 1
    assert read_current_pointer(project) == original


@pytest.mark.asyncio
async def test_matching_configuration_version_is_reused(project, full_worker, monkeypatch):
    await refresh_mod.refresh_pipeline(project)
    original = read_current_pointer(project)
    monkeypatch.setenv("RB_HOST_COMMAND", "different-runner {output_file}")
    reset_settings()
    await refresh_mod.refresh_pipeline(project)
    assert len(full_worker) == 2
    monkeypatch.setenv("RB_HOST_COMMAND", "test-runner {output_file}")
    reset_settings()
    assert (await refresh_mod.refresh_pipeline(project)).mode == "noop"
    assert read_current_pointer(project)["generation"] == original["generation"]
    assert len(full_worker) == 2


@pytest.mark.asyncio
async def test_host_answer_health_uses_selected_commit(project, full_worker, monkeypatch):
    parent = git(project, "rev-parse", "HEAD")
    await refresh_mod.refresh_pipeline(project)
    change(project, 1)
    await refresh_mod.refresh_pipeline(project, full=True)
    git(project, "checkout", "-q", "--detach", parent)

    async def host_answer(workspace, question, settings):
        return next((knowledge_root(workspace) / "agents").rglob("*.md")).read_text().strip()

    monkeypatch.setattr(ask_mod, "_ask_with_host_runner", host_answer)
    assert await ask_mod.ask_pipeline(project, "Correct health") == f"# Knowledge for {parent}"


@pytest.mark.asyncio
async def test_force_full_can_resume_after_switching_from_sibling(
    project, full_worker, monkeypatch,
):
    parent = git(project, "rev-parse", "HEAD")
    await refresh_mod.refresh_pipeline(project)
    git(project, "checkout", "-qb", "other")
    change(project, 1)
    await refresh_mod.refresh_pipeline(project, full=True)
    pointer = read_current_pointer(project)
    git(project, "checkout", "-qb", "feature", parent)
    change(project, 2)
    build = refresh_mod._refresh_pipeline_into_generation

    async def interrupt_once(workspace, *, resume=False):
        status = await build(workspace, resume=resume)
        if not resume:
            status.overall_status = "partial"
        return status

    monkeypatch.setattr(refresh_mod, "_refresh_pipeline_into_generation", interrupt_once)
    first = await refresh_mod.refresh_pipeline(project, full=True)
    candidate = full_worker[-1]
    assert first.overall_status == "partial"
    assert read_current_pointer(project) == pointer
    second = await refresh_mod.refresh_pipeline(project)
    assert second.resumed and second.overall_status == "success"
    assert full_worker[-1] == candidate


@pytest.mark.asyncio
async def test_legacy_git_knowledge_can_use_ancestor_commit(project, monkeypatch):
    root = project / ".repobrain"
    atomic_write_text(root / "map.md", "# Old knowledge\n")
    atomic_write_text(root / ".last_refresh_sha", git(project, "rev-parse", "HEAD"))
    change(project, 1)

    async def answer(workspace, question):
        assert knowledge_root(workspace) == root
        return "legacy background"

    monkeypatch.setattr(ask_mod, "_ask_selected_generation", answer)
    result = await ask_mod.ask_pipeline(project, "Use ancestor background")
    assert "之后已有新提交" in result and result.endswith("legacy background")


@pytest.mark.asyncio
async def test_checkout_during_reuse_does_not_invalidate_saved_generation(
    project, full_worker, monkeypatch,
):
    parent = git(project, "rev-parse", "HEAD")
    await refresh_mod.refresh_pipeline(project)
    original = read_current_pointer(project)
    root = knowledge_root(project)
    child = change(project, 1)
    await refresh_mod.refresh_pipeline(project, full=True)
    git(project, "checkout", "-q", "--detach", parent)
    from repobrain_engine.hub import versions
    select = versions.select_refresh_baseline

    def switch_after_selection(workspace, head, config):
        chosen = select(workspace, head, config)
        git(workspace, "checkout", "-q", "--detach", child)
        return chosen

    monkeypatch.setattr(versions, "select_refresh_baseline", switch_after_selection)
    with pytest.raises(RuntimeError, match="HEAD changed"):
        await refresh_mod.refresh_pipeline(project)
    assert not (root / "resume.json").exists()
    assert (root / "published.json").is_file()
    assert read_current_pointer(project)["generation"] != original["generation"]


@pytest.mark.asyncio
async def test_dirty_host_ask_receives_current_patch_and_keeps_knowledge_unchanged(
    project, full_worker, monkeypatch,
):
    from repobrain_engine.hub.ask_tools import create_ask_tools
    from repobrain_engine.hub.working_context import current_working_context

    (project / "src" / "old.py").write_text("def old(): return 3\n")
    (project / "src" / "deleted.py").write_text("def deleted(): return 4\n")
    git(project, "add", "src")
    git(project, "commit", "-qm", "新增测试源码")
    await refresh_mod.refresh_pipeline(project)
    root = knowledge_root(project)
    before = {str(path.relative_to(root)): path.read_bytes() for path in root.rglob("*") if path.is_file()}
    pointer = read_current_pointer(project)
    marker = (project / ".repobrain" / ".last_refresh_sha").read_bytes()
    (project / "src" / "app.py").write_text("def value():\n    return 10\n")
    git(project, "add", "src/app.py")
    (project / "src" / "app.py").write_text("def value():\n    return 20\n")
    git(project, "mv", "src/old.py", "src/renamed.py")
    (project / "src" / "deleted.py").unlink()
    (project / "src" / "new.py").write_text("def new(): return 99\n")
    monkeypatch.setenv("RB_ASK_RETRIEVAL_FIRST", "2")
    calls = []

    async def host(**kwargs):
        calls.append(kwargs)
        context = kwargs["context"]
        assert "Current source state" in context
        assert "return 20" in context
        assert "src/new.py" in context
        assert "src/renamed.py" in context and "src/deleted.py" in context
        assert "take precedence" in context and "unverified" in context
        tools = create_ask_tools(project)
        assert "return 20" in tools["read_file"]("src/app.py")
        assert "return 99" in tools["read_file"]("src/new.py")
        assert "not a file" in tools["read_file"]("src/deleted.py")
        return "Based on the current source, value returns 20."

    monkeypatch.setattr("repobrain_engine.hub.host_runner.run_host_runner", host)
    result = await ask_mod.ask_pipeline(project, "Where is value defined and what changed?")
    assert "工作区有未提交修改" in result and "returns 20" in result
    assert len(calls) == 1  # Retrieval-only mode must still verify after edits.
    assert read_current_pointer(project) == pointer
    assert (project / ".repobrain" / ".last_refresh_sha").read_bytes() == marker
    for path, data in before.items():
        assert (root / path).read_bytes() == data
    assert not current_working_context().prompt
    with pytest.raises(RuntimeError, match="clean worktree"):
        await refresh_mod.refresh_pipeline(project)


@pytest.mark.asyncio
async def test_ancestor_ask_ignores_sibling_and_supplies_committed_diff(
    project, full_worker, monkeypatch,
):
    from repobrain_engine.hub.working_context import current_working_context

    parent = git(project, "rev-parse", "HEAD")
    await refresh_mod.refresh_pipeline(project)
    base = read_current_pointer(project)
    git(project, "checkout", "-qb", "other")
    change(project, 1)
    await refresh_mod.refresh_pipeline(project, full=True)
    sibling = read_current_pointer(project)
    git(project, "checkout", "-qb", "feature", parent)
    target = change(project, 2)

    async def answer(workspace, question):
        assert knowledge_root(workspace).name == base["generation"]
        context = current_working_context().prompt
        assert parent in context and target in context and "return 2" in context
        assert "return 1" not in context
        return "Current branch answer"

    monkeypatch.setattr(ask_mod, "_ask_selected_generation", answer)
    result = await ask_mod.ask_pipeline(project, "Use related history")
    assert "之后已有新提交" in result and result.endswith("Current branch answer")
    assert read_current_pointer(project) == sibling
    assert len(full_worker) == 2


@pytest.mark.asyncio
async def test_api_answer_agents_receive_live_context(project, full_worker, monkeypatch):
    from types import SimpleNamespace
    import agents

    await refresh_mod.refresh_pipeline(project)
    (project / "src" / "app.py").write_text("def value():\n    return 77\n")
    prompts = []

    async def run(*, agent, prompt, **kwargs):
        prompts.append(prompt)
        assert "return 77" in prompt and "Current source state" in prompt
        if agent.name == "QuickRouter":
            return "MODULES: src"
        assert "take precedence" in prompt
        return "value returns 77 in the current source"

    async def answer(workspace, question):
        return await ask_mod._ask_with_agent_md(workspace, question)

    monkeypatch.setattr(agents, "Agent", lambda **kwargs: SimpleNamespace(**kwargs))
    monkeypatch.setattr("repobrain_engine.hub.agents.create_model", lambda _: object())
    monkeypatch.setattr(ask_mod, "_run_with_optional_stream", run)
    monkeypatch.setattr(ask_mod, "_ask_selected_generation", answer)
    result = await ask_mod.ask_pipeline(project, "What does value return?")
    assert result.endswith("value returns 77 in the current source")
    assert len(prompts) == 2


@pytest.mark.asyncio
async def test_user_can_keep_editing_during_answer(project, full_worker, monkeypatch):
    await refresh_mod.refresh_pipeline(project)
    pointer = read_current_pointer(project)

    async def answer(workspace, question):
        (workspace / "src" / "app.py").write_text("def value(): return 88\n")
        return "Answer based on the source read earlier"

    monkeypatch.setattr(ask_mod, "_ask_selected_generation", answer)
    result = await ask_mod.ask_pipeline(project, "Keep editing")
    assert "Answer based on the source read earlier" in result
    assert "回答期间工作区又有修改" in result
    assert read_current_pointer(project) == pointer


def test_working_context_is_bounded_and_redacts_credentials(project):
    from repobrain_engine.hub.working_context import collect_working_context

    head = git(project, "rev-parse", "HEAD")
    (project / "src" / "app.py").write_text('API_KEY="private-test-secret"\n' + "# filler\n" * 3000)
    context = collect_working_context(project, head, head)
    assert "private-test-secret" not in context.prompt
    assert "<redacted>" in context.prompt
    assert "truncated" in context.prompt
    assert len(context.prompt) < 14000
