"""Tests for auto-refresh and host LLM capability refresh."""
from __future__ import annotations

import json
from pathlib import Path

import pytest


def _clear_llm_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """Remove local LLM configuration from the test process."""
    for name in (
        "GOOGLE_API_KEY",
        "OPENAI_API_KEY",
        "OPENAI_BASE_URL",
        "OPENAI_API_BASE",
    ):
        monkeypatch.delenv(name, raising=False)


@pytest.fixture(autouse=True)
def _clear_host_capability():
    """Ensure host LLM capability registration does not leak between tests."""
    from antigravity_engine.hub.host_llm import set_host_llm_capability

    set_host_llm_capability(None)
    yield
    set_host_llm_capability(None)


def _fake_host_response(request):
    """Return source-grounded fake host LLM responses for refresh tests."""
    if request.task == "conventions":
        return {
            "content": "# Project Conventions\n\nPython source is organized by module and tested with pytest."
        }

    if request.task == "module_knowledge":
        module = request.module or "src"
        source_files = request.context.get("source_files") or ["src/main.py"]
        rel_file = source_files[0]
        return {
            "data": {
                "module": module,
                "path": request.context.get("module_path", module),
                "summary": f"{module} provides the tested runtime behavior described by {rel_file}.",
                "responsibilities": [
                    f"Owns the code path implemented in {rel_file}.",
                    "Exposes behavior for callers through its public functions.",
                ],
                "key_files": [
                    {
                        "path": rel_file,
                        "purpose": "Contains the module implementation used by the refresh test.",
                        "references": [
                            {"file": rel_file, "start_line": 1, "end_line": 2}
                        ],
                    }
                ],
                "public_apis": [
                    {
                        "name": "run",
                        "kind": "function",
                        "purpose": "Returns the module result used by callers.",
                        "signature": "run() -> str",
                        "references": [
                            {"file": rel_file, "start_line": 1, "end_line": 2}
                        ],
                    }
                ],
                "data_flow": [
                    f"Callers enter through run() in {rel_file}; it returns a string result directly."
                ],
                "dependencies": ["No non-stdlib dependencies are observed in this source group."],
                "configuration": ["No runtime environment variables are observed in this source group."],
                "risks": ["The test module is intentionally small and has limited integration surface."],
                "source_references": [
                    {"file": rel_file, "start_line": 1, "end_line": 2}
                ],
            }
        }

    raise AssertionError(f"unexpected host LLM task: {request.task}")


@pytest.mark.asyncio
async def test_refresh_pipeline_fails_with_plan_without_host_capability(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """No local LLM env should not be requested; missing host capability writes a plan."""
    _clear_llm_env(monkeypatch)
    monkeypatch.setenv("WORKSPACE_PATH", str(tmp_path))

    from antigravity_engine.config import reset_settings
    from antigravity_engine.hub.refresh_pipeline import refresh_pipeline

    reset_settings()
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "main.py").write_text("def run() -> str:\n    return 'ok'\n", encoding="utf-8")

    status = await refresh_pipeline(tmp_path)

    ag_dir = tmp_path / ".antigravity"
    assert status.overall_status == "failed"
    assert status.stages["module_docs"] == "failed"
    assert status.stages["module_registry"] == "failed"
    assert status.llm_provider == ""
    assert status.knowledge_status == "failed"
    assert status.validation_status == "failed"

    for rel in (
        "scan_report.json",
        "conventions.md",
        "structure.md",
        "knowledge_graph.json",
        "knowledge_graph.md",
        "knowledge_graph.mmd",
        "document_index.md",
        "data_overview.md",
        "media_manifest.md",
        "map.md",
        "status.json",
        "agent_refresh_plan.json",
        "knowledge_validation.json",
    ):
        path = ag_dir / rel
        assert path.is_file(), rel
        assert path.read_text(encoding="utf-8").strip(), rel

    assert not (ag_dir / "host_delegation.json").exists()
    payload = json.loads((ag_dir / "agent_refresh_plan.json").read_text(encoding="utf-8"))
    assert payload["schema"] == "antigravity-agent-refresh-plan-v1"
    assert payload["host_llm_capability"] == "unavailable"
    assert payload["workspace"] == str(tmp_path.resolve())
    assert payload["modules"][0]["module"] == "src"
    assert ".antigravity/agents/{module}.md" in payload["required_outputs"]


@pytest.mark.asyncio
async def test_refresh_pipeline_uses_host_llm_capability_for_semantic_artifacts(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Refresh should build reliable artifacts from host LLM structured output."""
    _clear_llm_env(monkeypatch)
    monkeypatch.setenv("WORKSPACE_PATH", str(tmp_path))

    from antigravity_engine.config import reset_settings
    from antigravity_engine.hub.host_llm import set_host_llm_capability
    from antigravity_engine.hub.refresh_pipeline import refresh_pipeline

    reset_settings()
    set_host_llm_capability(_fake_host_response)
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "main.py").write_text("def run() -> str:\n    return 'ok'\n", encoding="utf-8")

    status = await refresh_pipeline(tmp_path)

    ag_dir = tmp_path / ".antigravity"
    assert status.overall_status == "success"
    assert status.llm_provider == "host_agent_capability"
    assert status.knowledge_status == "success"
    assert status.validation_status == "success"

    agent_doc = (ag_dir / "agents" / "src.md").read_text(encoding="utf-8")
    assert "src provides the tested runtime behavior" in agent_doc
    assert "`src/main.py:1-2`" in agent_doc
    assert "run() -> str" in agent_doc

    knowledge = json.loads((ag_dir / "knowledge" / "src.json").read_text(encoding="utf-8"))
    assert knowledge["summary"].startswith("src provides")
    assert knowledge["source_references"][0]["file"] == "src/main.py"

    module_map = (ag_dir / "map.md").read_text(encoding="utf-8")
    assert "**Description:** src provides the tested runtime behavior" in module_map
    assert "**Key topics:**" in module_map

    validation = json.loads((ag_dir / "knowledge_validation.json").read_text(encoding="utf-8"))
    assert validation["status"] == "success"
    assert validation["modules"]["src"]["status"] == "success"


@pytest.mark.asyncio
async def test_prepare_submit_finalize_refresh_flow(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """MCP-style host task bundles should finalize without local LLM config."""
    _clear_llm_env(monkeypatch)
    monkeypatch.setenv("WORKSPACE_PATH", str(tmp_path))

    from antigravity_engine.config import reset_settings
    from antigravity_engine.hub.refresh_pipeline import (
        finalize_refresh_project,
        prepare_refresh_project,
        submit_refresh_result,
    )

    reset_settings()
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "main.py").write_text("def run() -> str:\n    return 'ok'\n", encoding="utf-8")

    plan = await prepare_refresh_project(tmp_path)

    assert plan["schema"] == "antigravity-agent-refresh-plan-v1"
    assert plan["plan_id"]
    assert plan["execution"]["preference"] == "subagent_first"
    assert plan["execution"]["fallback"] == "main_agent_llm"
    assert plan["main_agent_workflow"]
    assert plan["tasks"]
    assert plan["tasks"][0]["task"] == "conventions"
    assert "agent_instructions" in plan["tasks"][0]
    assert "result_contract" in plan["tasks"][0]
    assert plan["pending_tasks"]
    assert plan["next_action"] == "run_pending_tasks_and_submit_results"

    conventions_submit = submit_refresh_result(
        tmp_path,
        "conventions",
        {"content": "# Project Conventions\n\nHost-agent supplied conventions."},
    )
    assert conventions_submit["status"] == "accepted"
    assert conventions_submit["plan_id"] == plan["plan_id"]

    module_tasks = [task for task in plan["tasks"] if task["task"] == "module_knowledge"]
    assert module_tasks
    for task in module_tasks:
        rel_file = task["source_files"][0]
        assert task["result_contract"]["source_reference_rule"]
        assert "file/start_line/end_line" in " ".join(task["acceptance_criteria"])
        module_submit = submit_refresh_result(
            tmp_path,
            task["task_id"],
            {
                "data": {
                    "module": task["module"],
                    "path": task["context"]["module_path"],
                    "summary": f"{task['module']} provides host-agent analyzed behavior.",
                    "responsibilities": [f"Owns behavior implemented in {rel_file}."],
                    "key_files": [
                        {
                            "path": rel_file,
                            "purpose": "Contains the runtime function.",
                            "references": [{"file": rel_file, "start_line": 1, "end_line": 2}],
                        }
                    ],
                    "public_apis": [
                        {
                            "name": "run",
                            "kind": "function",
                            "purpose": "Returns the runtime value.",
                            "signature": "run() -> str",
                            "references": [{"file": rel_file, "start_line": 1, "end_line": 2}],
                        }
                    ],
                    "data_flow": [f"run() in {rel_file} returns a string directly."],
                    "dependencies": ["No non-stdlib dependencies observed."],
                    "configuration": ["No runtime configuration observed."],
                    "risks": ["Small test module."],
                    "source_references": [{"file": rel_file, "start_line": 1, "end_line": 2}],
                }
            },
        )
        assert module_submit["status"] == "accepted"

    status = finalize_refresh_project(tmp_path)

    assert status.overall_status == "success"
    assert status.llm_provider == "host_agent_capability"
    assert (tmp_path / ".antigravity" / "agents" / "src.md").is_file()
    assert (tmp_path / ".antigravity" / "knowledge" / "src.json").is_file()


def test_module_knowledge_schema_requires_file_source_references() -> None:
    """Task schema should make SourceReference objects unambiguous for sub-agents."""
    from antigravity_engine.hub.refresh_pipeline import _module_knowledge_schema

    schema = _module_knowledge_schema()
    refs = schema["properties"]["source_references"]["items"]
    assert refs["required"] == ["file", "start_line", "end_line"]
    assert refs["additionalProperties"] is False
    assert "file" in refs["properties"]
    assert "path" not in refs["properties"]

    key_file_refs = schema["properties"]["key_files"]["items"]["properties"]["references"]["items"]
    public_api_refs = schema["properties"]["public_apis"]["items"]["properties"]["references"]["items"]
    assert key_file_refs["required"] == ["file", "start_line", "end_line"]
    assert public_api_refs["required"] == ["file", "start_line", "end_line"]


@pytest.mark.asyncio
async def test_submit_refresh_result_rejects_path_based_source_references(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Middleware should reject the path/start_line/end_line mistake seen in real sub-agent output."""
    _clear_llm_env(monkeypatch)
    monkeypatch.setenv("WORKSPACE_PATH", str(tmp_path))

    from antigravity_engine.config import reset_settings
    from antigravity_engine.hub.refresh_pipeline import prepare_refresh_project, submit_refresh_result

    reset_settings()
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "main.py").write_text("def run() -> str:\n    return 'ok'\n", encoding="utf-8")

    plan = await prepare_refresh_project(tmp_path)
    task = next(task for task in plan["tasks"] if task["task"] == "module_knowledge")
    rel_file = task["source_files"][0]

    with pytest.raises(Exception) as exc_info:
        submit_refresh_result(
            tmp_path,
            task["task_id"],
            {
                "data": {
                    "module": task["module"],
                    "path": task["context"]["module_path"],
                    "summary": "src provides host-agent analyzed behavior.",
                    "responsibilities": ["Owns behavior."],
                    "key_files": [
                        {
                            "path": rel_file,
                            "purpose": "Contains the runtime function.",
                            "references": [{"path": rel_file, "start_line": 1, "end_line": 2}],
                        }
                    ],
                    "public_apis": [
                        {
                            "name": "run",
                            "kind": "function",
                            "purpose": "Returns the runtime value.",
                            "signature": "run() -> str",
                            "references": [{"path": rel_file, "start_line": 1, "end_line": 2}],
                        }
                    ],
                    "data_flow": ["run() returns a string directly."],
                    "dependencies": ["No non-stdlib dependencies observed."],
                    "configuration": ["No runtime configuration observed."],
                    "risks": ["Small test module."],
                    "source_references": [{"path": rel_file, "start_line": 1, "end_line": 2}],
                }
            },
        )

    message = str(exc_info.value)
    assert "file" in message
    assert "path" in message


@pytest.mark.asyncio
async def test_prepare_submit_finalize_ignores_stale_results_from_old_plan(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A new refresh plan must not finalize with host results from an older plan id."""
    _clear_llm_env(monkeypatch)
    monkeypatch.setenv("WORKSPACE_PATH", str(tmp_path))

    from antigravity_engine.config import reset_settings
    from antigravity_engine.hub.refresh_pipeline import (
        finalize_refresh_project,
        prepare_refresh_project,
        submit_refresh_result,
    )

    reset_settings()
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "main.py").write_text("def run() -> str:\n    return 'ok'\n", encoding="utf-8")

    first_plan = await prepare_refresh_project(tmp_path)
    first_task = next(task for task in first_plan["tasks"] if task["task"] == "module_knowledge")
    rel_file = first_task["source_files"][0]
    submit_refresh_result(tmp_path, "conventions", {"content": "# Old\n\nOld conventions."})
    submit_refresh_result(
        tmp_path,
        first_task["task_id"],
        {
            "data": {
                "module": first_task["module"],
                "path": first_task["context"]["module_path"],
                "summary": "Old plan knowledge.",
                "responsibilities": ["Old responsibility."],
                "key_files": [
                    {
                        "path": rel_file,
                        "purpose": "Old file knowledge.",
                        "references": [{"file": rel_file, "start_line": 1, "end_line": 2}],
                    }
                ],
                "public_apis": [
                    {
                        "name": "run",
                        "kind": "function",
                        "purpose": "Old API knowledge.",
                        "signature": "run() -> str",
                        "references": [{"file": rel_file, "start_line": 1, "end_line": 2}],
                    }
                ],
                "data_flow": ["Old flow."],
                "dependencies": ["No non-stdlib dependencies observed."],
                "configuration": ["No runtime configuration observed."],
                "risks": ["Small test module."],
                "source_references": [{"file": rel_file, "start_line": 1, "end_line": 2}],
            }
        },
    )
    first_status = finalize_refresh_project(tmp_path)
    assert first_status.overall_status == "success"
    assert (tmp_path / ".antigravity" / "knowledge" / "src.json").is_file()

    second_plan = await prepare_refresh_project(tmp_path)
    assert second_plan["plan_id"] != first_plan["plan_id"]
    assert second_plan["accepted_tasks"] == []

    status = finalize_refresh_project(tmp_path)

    assert status.overall_status == "failed"
    assert any("missing submitted" in failure.reason for failure in status.failures)
    stale_path = tmp_path / ".antigravity" / "knowledge" / "src.json"
    if stale_path.exists():
        stale_text = stale_path.read_text(encoding="utf-8")
        assert "Old plan knowledge" not in stale_text
        assert "stale_removed" in stale_text


@pytest.mark.asyncio
async def test_refresh_pipeline_rejects_host_llm_output_with_invalid_references(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A host LLM result is not accepted unless its source references validate."""
    _clear_llm_env(monkeypatch)
    monkeypatch.setenv("WORKSPACE_PATH", str(tmp_path))

    from antigravity_engine.config import reset_settings
    from antigravity_engine.hub.host_llm import set_host_llm_capability
    from antigravity_engine.hub.refresh_pipeline import refresh_pipeline

    reset_settings()

    def bad_host_response(request):
        payload = _fake_host_response(request)
        if request.task == "module_knowledge":
            payload["data"]["source_references"] = [
                {"file": request.context["source_files"][0], "start_line": 99, "end_line": 99}
            ]
        return payload

    set_host_llm_capability(bad_host_response)
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "main.py").write_text("def run() -> str:\n    return 'ok'\n", encoding="utf-8")

    status = await refresh_pipeline(tmp_path)

    assert status.overall_status == "failed"
    assert status.modules["src"] == "failed"
    assert any("out of bounds" in failure.reason for failure in status.failures)
    assert not (tmp_path / ".antigravity" / "agents" / "src.md").exists()


@pytest.mark.asyncio
async def test_ask_pipeline_returns_host_main_agent_request_without_llm(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """ask_pipeline should report missing host capability when local answer LLM is absent."""
    _clear_llm_env(monkeypatch)
    monkeypatch.setenv("WORKSPACE_PATH", str(tmp_path))

    from antigravity_engine.config import reset_settings
    from antigravity_engine.hub.ask_pipeline import ask_pipeline

    reset_settings()
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "main.py").write_text("def answer() -> int:\n    return 42\n", encoding="utf-8")

    answer = await ask_pipeline(tmp_path, "src 模块做什么？")

    assert "No answer-synthesis LLM is available" in answer
    assert "Host LLM capability is required" in answer
    assert "agent_refresh_plan.json" in answer
    assert (tmp_path / ".antigravity" / "agent_refresh_plan.json").is_file()


@pytest.mark.asyncio
async def test_ensure_fresh_project_knowledge_refreshes_missing_artifacts(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Missing knowledge artifacts should trigger a full automatic refresh."""
    import antigravity_engine.hub.ask_pipeline as ask_mod
    from antigravity_engine.hub.contracts import RefreshStatus

    calls: list[bool] = []

    async def fake_refresh_pipeline(workspace: Path, quick: bool = False, failed_only: bool = False) -> RefreshStatus:
        calls.append(quick)
        ag_dir = workspace / ".antigravity"
        agents_dir = ag_dir / "agents"
        agents_dir.mkdir(parents=True, exist_ok=True)
        (ag_dir / "status.json").write_text("{}", encoding="utf-8")
        (ag_dir / "map.md").write_text("# Module Map\n", encoding="utf-8")
        (agents_dir / "src.md").write_text("# src\n", encoding="utf-8")
        return RefreshStatus(refresh_run_id="test", overall_status="success")

    monkeypatch.setattr(
        "antigravity_engine.hub.refresh_pipeline.refresh_pipeline",
        fake_refresh_pipeline,
    )

    notice = await ask_mod.ensure_fresh_project_knowledge(tmp_path)

    assert notice is None
    assert calls == [False]


@pytest.mark.asyncio
async def test_ensure_fresh_project_knowledge_quick_refreshes_on_head_change(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A changed git HEAD with a previous SHA should trigger quick refresh."""
    import antigravity_engine.hub.ask_pipeline as ask_mod
    from antigravity_engine.hub.contracts import RefreshStatus

    ag_dir = tmp_path / ".antigravity"
    agents_dir = ag_dir / "agents"
    agents_dir.mkdir(parents=True)
    (ag_dir / "status.json").write_text("{}", encoding="utf-8")
    (ag_dir / "map.md").write_text("# Module Map\n", encoding="utf-8")
    (ag_dir / ".last_refresh_sha").write_text("old", encoding="utf-8")
    (agents_dir / "src.md").write_text("# src\n", encoding="utf-8")

    calls: list[bool] = []

    async def fake_refresh_pipeline(workspace: Path, quick: bool = False, failed_only: bool = False) -> RefreshStatus:
        calls.append(quick)
        return RefreshStatus(refresh_run_id="test", overall_status="success")

    monkeypatch.setattr(ask_mod, "_get_head_sha", lambda _workspace: "new")
    monkeypatch.setattr(
        "antigravity_engine.hub.refresh_pipeline.refresh_pipeline",
        fake_refresh_pipeline,
    )

    notice = await ask_mod.ensure_fresh_project_knowledge(tmp_path)

    assert notice is None
    assert calls == [True]


@pytest.mark.asyncio
async def test_auto_refresh_can_be_disabled(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """AG_AUTO_REFRESH_BEFORE_ASK=0 should skip automatic refresh."""
    import antigravity_engine.hub.ask_pipeline as ask_mod

    monkeypatch.setenv("AG_AUTO_REFRESH_BEFORE_ASK", "0")

    async def fail_refresh(*_args, **_kwargs):
        raise AssertionError("refresh should not be called")

    monkeypatch.setattr(
        "antigravity_engine.hub.refresh_pipeline.refresh_pipeline",
        fail_refresh,
    )

    notice = await ask_mod.ensure_fresh_project_knowledge(tmp_path)

    assert notice is None


@pytest.mark.asyncio
async def test_pending_agent_refresh_plan_does_not_loop_without_host_capability(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A pending refresh plan should prevent repeated no-capability refreshes."""
    import antigravity_engine.hub.ask_pipeline as ask_mod

    _clear_llm_env(monkeypatch)
    monkeypatch.setenv("WORKSPACE_PATH", str(tmp_path))

    from antigravity_engine.config import reset_settings

    reset_settings()
    ag_dir = tmp_path / ".antigravity"
    ag_dir.mkdir()
    (ag_dir / "status.json").write_text("{}", encoding="utf-8")
    (ag_dir / "map.md").write_text("# Module Map\n", encoding="utf-8")
    (ag_dir / "agent_refresh_plan.json").write_text("{}", encoding="utf-8")

    async def fail_refresh(*_args, **_kwargs):
        raise AssertionError("refresh should not be called while host LLM capability is unavailable")

    monkeypatch.setattr(
        "antigravity_engine.hub.refresh_pipeline.refresh_pipeline",
        fail_refresh,
    )

    notice = await ask_mod.ensure_fresh_project_knowledge(tmp_path)

    assert notice is None
