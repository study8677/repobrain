"""Incremental recovery reuses saved work only while artifacts remain valid."""
import hashlib
import json
from types import SimpleNamespace

import pytest

from repobrain_engine.hub.contracts import RefreshStatus
from repobrain_engine.hub.incremental_artifacts import execute_affected_groups, update_related_artifacts
from repobrain_engine.hub.scanner import ScanReport
from repobrain_engine.hub.storage import use_knowledge_root


@pytest.mark.asyncio
async def test_incremental_failure_waits_for_other_groups_and_reuses_only_valid_docs(tmp_path, monkeypatch):
    from agents import Runner
    from repobrain_engine.hub import incremental_artifacts as artifacts
    monkeypatch.setenv("RB_REFRESH_RETRY_COUNT", "0")
    snapshot = {"groups": {
        name: {"artifact_path": f"agents/{name}.md"} for name in ("a", "b")
    }}
    monkeypatch.setattr(artifacts, "_entry_lookup", lambda *args: {
        name: ("src", object(), name) for name in ("a", "b")
    })
    calls = []
    fail_b = True

    async def model(agent, prompt, **kwargs):
        calls.append(agent)
        if agent == "b" and fail_b:
            raise RuntimeError("injected failure")
        return SimpleNamespace(final_output=f"# Knowledge {agent}\n")

    monkeypatch.setattr(Runner, "run", model)
    status = RefreshStatus(refresh_run_id="run", overall_status="success")
    with use_knowledge_root(tmp_path):
        with pytest.raises(RuntimeError, match="injected failure"):
            await execute_affected_groups(tmp_path, snapshot, ["a", "b"], object(), status)
        assert (tmp_path / "agents/a.md").is_file()
        journal = json.loads((tmp_path / "execution.json").read_text())
        assert journal["group_states"]["a"]["state"] == "success"
        fail_b = False
        await execute_affected_groups(tmp_path, snapshot, ["a", "b"], object(), status)
        assert calls.count("a") == 1 and calls.count("b") == 2
        (tmp_path / "agents/a.md").unlink()
        await execute_affected_groups(tmp_path, snapshot, ["a", "b"], object(), status)
        assert calls.count("a") == 2 and calls.count("b") == 2


@pytest.mark.asyncio
@pytest.mark.parametrize("journal", ["broken", '{"group_states": []}'])
async def test_corrupt_incremental_journal_reruns_groups(tmp_path, monkeypatch, journal):
    from agents import Runner
    from repobrain_engine.hub import incremental_artifacts as artifacts
    snapshot = {"groups": {"a": {"artifact_path": "agents/a.md"}}}
    monkeypatch.setattr(artifacts, "_entry_lookup", lambda *args: {"a": ("src", object(), "a")})
    calls = []

    async def model(agent, *args, **kwargs):
        calls.append(agent)
        return SimpleNamespace(final_output="# Regenerated knowledge\n")

    monkeypatch.setattr(Runner, "run", model)
    (tmp_path / "execution.json").write_text(journal)
    with use_knowledge_root(tmp_path):
        await execute_affected_groups(tmp_path, snapshot, ["a"], object(),
                                      RefreshStatus(refresh_run_id="run", overall_status="success"))
    assert calls == ["a"]
    saved = (tmp_path / "agents/a.md").read_text()
    state = json.loads((tmp_path / "execution.json").read_text())["group_states"]["a"]
    assert state["digest"] == hashlib.sha256(saved.encode()).hexdigest()


def test_completed_incremental_stages_are_reused_until_artifact_is_missing(tmp_path, monkeypatch):
    from repobrain_engine.hub import scanner, refresh_pipeline
    calls = {"scan": 0, "structure": 0}

    def scan(workspace):
        calls["scan"] += 1
        return ScanReport(root=workspace)

    def structure(workspace):
        calls["structure"] += 1
        return "# Structure\n"

    monkeypatch.setattr(scanner, "full_scan", scan)
    monkeypatch.setattr(scanner, "extract_structure", structure)
    monkeypatch.setattr(refresh_pipeline, "_build_non_code_indexes", lambda report: ("docs", "data", "media"))
    with use_knowledge_root(tmp_path):
        update_related_artifacts(tmp_path, {}, [], ["structure", "indexes"])
        update_related_artifacts(tmp_path, {}, [], ["structure", "indexes"])
        assert calls == {"scan": 1, "structure": 1}
        (tmp_path / "data_overview.md").unlink()
        update_related_artifacts(tmp_path, {}, [], ["structure", "indexes"])
        assert calls == {"scan": 2, "structure": 1}
