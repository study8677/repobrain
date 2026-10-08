"""Tests for graph-retrieval and knowledge-layer skills."""

from importlib.util import module_from_spec, spec_from_file_location
import json
from pathlib import Path
from types import ModuleType


def _load_skill_tools_module(skill_name: str) -> ModuleType:
    """Load a skill tools module directly from its filesystem path."""
    tools_path = (
        Path(__file__).resolve().parents[1]
        / "repobrain_engine"
        / "skills"
        / skill_name
        / "tools.py"
    )
    spec = spec_from_file_location(
        f"repobrain_engine.skills.{skill_name}.tools",
        tools_path,
    )
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Failed to load tools module for {skill_name}.")

    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_query_graph_returns_relevant_subgraph(
    tmp_path: Path,
    monkeypatch,
) -> None:
    """query_graph should return matching triples and replayable evidence."""
    graph_dir = tmp_path / ".repobrain" / "graph"
    graph_dir.mkdir(parents=True)

    (graph_dir / "nodes.jsonl").write_text(
        "\n".join(
            [
                '{"schema":"repobrain-graph-node-v1","retrieval_id":"r1","tool_name":"search_code","node":{"id":"function:login","type":"function","label":"login"}}',
                '{"schema":"repobrain-graph-node-v1","retrieval_id":"r1","tool_name":"search_code","node":{"id":"module:auth","type":"module","label":"auth module"}}',
                '{"schema":"repobrain-graph-node-v1","retrieval_id":"r1","tool_name":"search_code","node":{"id":"service:session","type":"service","label":"session manager"}}',
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    (graph_dir / "edges.jsonl").write_text(
        "\n".join(
            [
                '{"schema":"repobrain-graph-edge-v1","retrieval_id":"r1","tool_name":"search_code","edge":{"from":"function:login","to":"module:auth","type":"defined_in"}}',
                '{"schema":"repobrain-graph-edge-v1","retrieval_id":"r1","tool_name":"search_code","edge":{"from":"function:login","to":"service:session","type":"calls"}}',
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    monkeypatch.setenv("WORKSPACE_PATH", str(tmp_path))

    module = _load_skill_tools_module("graph-retrieval")
    result = module.query_graph("login auth", workspace=str(tmp_path))

    assert "summary" in result
    assert result["triples"]
    assert ["login", "defined_in", "auth module"] in result["triples"]
    assert {"retrieval_id": "r1", "tool_name": "search_code"} in result["evidence"]


def test_query_graph_after_refresh_without_retrieval_graph_jsonl(tmp_path: Path, monkeypatch) -> None:
    """query_graph should fallback to knowledge_graph.json when JSONL files are missing."""
    rb_dir = tmp_path / ".repobrain"
    rb_dir.mkdir(parents=True)
    (rb_dir / "knowledge_graph.json").write_text(
        json.dumps(
            {
                "schema": "repobrain-knowledge-graph-v2",
                "created_at_utc": "2026-04-09T00:00:00+00:00",
                "workspace": str(tmp_path.resolve()),
                "summary": {
                    "semantic_files": 2,
                    "semantic_files_by_language": {"Python": 2},
                    "semantic_edges_by_type": {"defines": 1, "imports": 1},
                    "semantic_adapters": {"python": 2},
                    "generic_fallback_file_count": 0,
                    "parse_error_file_count": 0,
                },
                "diagnostics": {
                    "generic_fallback_files": [],
                    "parse_error_files": [],
                },
                "nodes": [
                    {
                        "id": "file:graph_retrieval.py",
                        "type": "code",
                        "label": "graph_retrieval.py",
                        "language": "Python",
                        "semantic_adapter": "python",
                        "semantic_package_identity": "graph_retrieval",
                    },
                    {"id": "function:query_graph", "type": "function", "label": "query_graph"},
                    {"id": "module:graph_retrieval", "type": "module", "label": "graph retrieval"},
                ],
                "edges": [
                    {"from": "file:graph_retrieval.py", "to": "module:graph_retrieval", "type": "declares_package"},
                    {"from": "function:query_graph", "to": "module:graph_retrieval", "type": "defined_in"},
                ],
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    monkeypatch.setenv("WORKSPACE_PATH", str(tmp_path))

    module = _load_skill_tools_module("graph-retrieval")
    result = module.query_graph("query_graph module", workspace=str(tmp_path))

    assert result["triples"]
    assert result["evidence"]
    assert any(t[1] == "defined_in" for t in result["triples"])


def test_refresh_filesystem_reports_generated_artifacts(
    tmp_path: Path,
    monkeypatch,
) -> None:
    """refresh_filesystem should delegate to refresh_pipeline and report outputs."""
    module = _load_skill_tools_module("knowledge-layer")

    async def fake_refresh_pipeline(workspace: Path, *, full: bool = False):
        from types import SimpleNamespace

        assert full is True
        rb_dir = workspace / ".repobrain"
        rb_dir.mkdir(parents=True, exist_ok=True)
        for name in (
            "knowledge_graph.json",
            "knowledge_graph.md",
            "document_index.md",
            "data_overview.md",
            "media_manifest.md",
        ):
            (rb_dir / name).write_text(name, encoding="utf-8")
        return SimpleNamespace(overall_status="success", mode="full", resumed=False)

    import repobrain_engine.hub.pipeline as pipeline_mod

    monkeypatch.setattr(pipeline_mod, "refresh_pipeline", fake_refresh_pipeline)
    monkeypatch.setenv("WORKSPACE_PATH", str(tmp_path))

    result = module.refresh_filesystem(workspace=str(tmp_path), full=True)

    assert "Full build completed" in result
    assert "knowledge_graph.json" in result
    assert (tmp_path / ".repobrain" / "knowledge_graph.json").exists()


def test_ask_filesystem_delegates_to_pipeline(tmp_path: Path, monkeypatch) -> None:
    """ask_filesystem should return the ask_pipeline result verbatim."""
    module = _load_skill_tools_module("knowledge-layer")

    async def fake_ask_pipeline(workspace: Path, question: str) -> str:
        assert workspace == tmp_path.resolve()
        assert question == "What changed?"
        return "graph-aware answer"

    import repobrain_engine.hub.pipeline as pipeline_mod

    monkeypatch.setattr(pipeline_mod, "ask_pipeline", fake_ask_pipeline)
    monkeypatch.setenv("WORKSPACE_PATH", str(tmp_path))

    result = module.ask_filesystem("What changed?", workspace=str(tmp_path))

    assert result == "graph-aware answer"




def test_graph_retrieval_rejects_workspace_outside_root(
    tmp_path: Path,
    monkeypatch,
) -> None:
    """graph-retrieval tools should reject workspace paths outside root."""
    module = _load_skill_tools_module("graph-retrieval")
    outside = tmp_path.parent / "outside"
    outside.mkdir(parents=True, exist_ok=True)

    monkeypatch.setenv("WORKSPACE_PATH", str(tmp_path))

    try:
        module.query_graph("login", workspace=str(outside))
    except ValueError as exc:
        assert "workspace must be inside" in str(exc)
    else:
        raise AssertionError("Expected ValueError for out-of-workspace path.")

def test_knowledge_layer_rejects_workspace_outside_root(
    tmp_path: Path,
    monkeypatch,
) -> None:
    """knowledge-layer tools should reject workspace paths outside root."""
    module = _load_skill_tools_module("knowledge-layer")
    outside = tmp_path.parent / "outside"
    outside.mkdir(parents=True, exist_ok=True)

    monkeypatch.setenv("WORKSPACE_PATH", str(tmp_path))

    try:
        module.refresh_filesystem(workspace=str(outside))
    except ValueError as exc:
        assert "workspace must be inside" in str(exc)
    else:
        raise AssertionError("Expected ValueError for out-of-workspace path.")


def test_refresh_filesystem_rejects_removed_arguments():
    import pytest
    module = _load_skill_tools_module('knowledge-layer')
    for old_argument in ('quick', 'failed_only'):
        with pytest.raises(TypeError, match='unexpected keyword argument'):
            module.refresh_filesystem(**{old_argument: True})


def test_refresh_filesystem_does_not_claim_failed_work_completed(tmp_path, monkeypatch):
    from types import SimpleNamespace
    from repobrain_engine.hub import pipeline
    module = _load_skill_tools_module('knowledge-layer')
    monkeypatch.setenv('WORKSPACE_PATH', str(tmp_path))
    for state in ('partial', 'unresolved', 'failed'):
        async def fake_refresh(workspace, *, full=False):
            return SimpleNamespace(overall_status=state, mode='incremental', resumed=False,
                                   failures=[], impact_plan_path=None)
        monkeypatch.setattr(pipeline, 'refresh_pipeline', fake_refresh)
        result = module.refresh_filesystem(workspace=str(tmp_path))
        assert 'Knowledge base updated' not in result
        assert 'knowledge_graph.json' not in result
        assert 'rb-refresh' in result
