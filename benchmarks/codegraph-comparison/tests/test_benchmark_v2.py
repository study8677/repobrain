"""Focused regression tests for the manifest-driven v2 benchmark."""

from __future__ import annotations

import json
import subprocess
import sys
from argparse import Namespace
from pathlib import Path


SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))

from benchmark_v2_common import (  # noqa: E402
    artifact_dir,
    load_manifest,
    normalize_answer_payload,
    normalize_answer_text,
)
from render_benchmark_v2_report import summarize  # noqa: E402
from run_benchmark_v2 import (  # noqa: E402
    audit_codegraph_events,
    build_plan,
    codegraph_prompt,
    enforce_codegraph_protocol,
    is_codegraph_command,
    missing_prerequisite_result,
    parse_trae_metrics,
    result_payload,
    run_codegraph,
    score,
    validate_product_prerequisite,
)
import run_benchmark_v2 as benchmark_runner  # noqa: E402


def _result() -> dict:
    return {"status": "success", "limitations": []}


def _audit(commands: int = 0, direct_reads: int = 0) -> dict:
    return {
        "commands": commands,
        "codegraph_commands": max(commands - direct_reads, 0),
        "non_codegraph_commands": direct_reads,
        "direct_source_read_commands": direct_reads,
        "model_reroutes": [],
    }


def test_unrestricted_track_has_no_command_budget() -> None:
    result = enforce_codegraph_protocol(
        _result(),
        _audit(commands=100, direct_reads=4),
        "unrestricted_native",
    )

    assert result["status"] == "success"
    assert result["limitations"] == []


def test_product_must_actually_invoke_codegraph() -> None:
    result = enforce_codegraph_protocol(
        _result(),
        _audit(commands=4, direct_reads=4),
        "unrestricted_native",
    )

    assert result["status"] == "protocol_violation"
    assert "No CodeGraph" in result["limitations"][-1]


def test_codegraph_detection_ignores_repository_directory_name() -> None:
    assert not is_codegraph_command("ls /tmp/flask-codegraph/src/flask")
    assert is_codegraph_command("/tmp/bin/codegraph explore -p /tmp/repo auth")


def test_source_free_direct_read_is_protocol_violation() -> None:
    result = enforce_codegraph_protocol(
        _result(),
        _audit(commands=20, direct_reads=1),
        "source_free",
    )

    assert result["status"] == "protocol_violation"
    assert "source-reading" in result["limitations"][-1]


def test_source_free_many_codegraph_commands_are_allowed() -> None:
    result = enforce_codegraph_protocol(
        _result(),
        _audit(commands=100),
        "source_free",
    )

    assert result["status"] == "success"


def test_event_audit_distinguishes_codegraph_filter_from_direct_read() -> None:
    events = "\n".join(
        [
            '{"type":"item.completed","item":{"type":"command_execution",'
            '"command":"codegraph explore -p . x | head -20"}}',
            '{"type":"item.completed","item":{"type":"command_execution",'
            '"command":"pwd"}}',
            '{"type":"item.completed","item":{"type":"command_execution",'
            '"command":"cat src/app.py"}}',
        ]
    )

    audit = audit_codegraph_events(events)

    assert audit["commands"] == 3
    assert audit["non_codegraph_commands"] == 2
    assert audit["direct_source_read_commands"] == 1


def test_trae_usage_and_model_route_are_parsed() -> None:
    events = "\n".join(
        [
            json.dumps({
                "type": "item.completed",
                "item": {
                    "type": "model_reroute",
                    "from_model": "requested",
                    "to_model": "served",
                },
            }),
            json.dumps({
                "type": "turn.completed",
                "usage": {
                    "input_tokens": 100,
                    "cached_input_tokens": 60,
                    "output_tokens": 10,
                    "reasoning_output_tokens": 2,
                },
            }),
            json.dumps({
                "type": "turn.completed",
                "usage": {
                    "input_tokens": 50,
                    "cached_input_tokens": 20,
                    "output_tokens": 5,
                },
                "total_cost_usd": 0.125,
            }),
        ]
    )

    metrics = parse_trae_metrics(events, "requested")

    assert metrics["usage"]["status"] == "available"
    assert metrics["usage"]["input_tokens"] == 150
    assert metrics["usage"]["total_tokens"] == 165
    assert metrics["cost"]["amount"] == 0.125
    assert metrics["model"]["observed"] == ["served"]


def test_missing_trae_metrics_are_explicitly_unavailable() -> None:
    metrics = parse_trae_metrics(
        "WARN server_model=served requested_model=requested", "requested"
    )

    assert metrics["usage"]["status"] == "unavailable"
    assert metrics["cost"]["status"] == "unavailable"
    assert metrics["cost"]["amount"] is None
    assert metrics["model"]["routes"] == ["requested -> served"]


def test_missing_product_corpus_is_an_auditable_unavailable_result(
    tmp_path: Path,
) -> None:
    workspace = tmp_path / "flask-repobrain"
    build_log = tmp_path / "build-logs" / "flask" / "repobrain.stderr"
    question = {
        "expected_files": ["src/flask/app.py"],
        "expected_symbols": ["Flask"],
    }

    result = missing_prerequisite_result(
        question, workspace, ".repobrain", build_log
    )

    assert result["status"] == "unavailable"
    assert result["score"]["found"] == 0
    assert result["score"]["total"] == 2
    assert result["usage"]["status"] == "unavailable"
    assert result["cost"]["status"] == "unavailable"
    assert ".repobrain" in result["limitations"][0]
    assert str(build_log) in result["limitations"][0]


def test_repobrain_aborted_staging_without_current_is_not_ready(
    tmp_path: Path,
) -> None:
    workspace = tmp_path / "workspace"
    (workspace / ".repobrain" / "generations" / "staging").mkdir(parents=True)

    ready, reason = validate_product_prerequisite(
        "repobrain", workspace, "expected-head"
    )

    assert ready is False
    assert "current.json" in reason


def test_repobrain_current_wrong_head_is_not_ready(tmp_path: Path) -> None:
    workspace = tmp_path / "workspace"
    root = workspace / ".repobrain"
    (root / "generations" / "generation-1").mkdir(parents=True)
    (root / "current.json").write_text(
        json.dumps({"generation": "generation-1", "head_sha": "wrong-head"}),
        encoding="utf-8",
    )

    ready, reason = validate_product_prerequisite(
        "repobrain", workspace, "expected-head"
    )

    assert ready is False
    assert "head mismatch" in reason


def test_repobrain_missing_current_generation_is_not_ready(tmp_path: Path) -> None:
    workspace = tmp_path / "workspace"
    root = workspace / ".repobrain"
    root.mkdir(parents=True)
    (root / "current.json").write_text(
        json.dumps({
            "generation": "missing-generation",
            "head_sha": "expected-head",
        }),
        encoding="utf-8",
    )

    ready, reason = validate_product_prerequisite(
        "repobrain", workspace, "expected-head"
    )

    assert ready is False
    assert "generation directory" in reason


def test_main_continues_other_product_when_one_corpus_is_missing(
    tmp_path: Path,
    monkeypatch,
) -> None:
    work_root = tmp_path / "work"
    results_root = tmp_path / "results"
    rb_workspace = work_root / "worktrees" / "demo-repobrain"
    rb_workspace.mkdir(parents=True)
    rb_root = rb_workspace / ".repobrain"
    (rb_root / "generations" / "generation-1").mkdir(parents=True)
    (rb_root / "current.json").write_text(
        json.dumps({"generation": "generation-1", "head_sha": "demo-head"}),
        encoding="utf-8",
    )
    (work_root / "worktrees" / "demo-codegraph").mkdir(parents=True)
    rb_ask = work_root / "tools" / "repobrain-venv" / "bin" / "rb-ask"
    rb_ask.parent.mkdir(parents=True)
    rb_ask.write_text("runner", encoding="utf-8")
    questions = tmp_path / "questions.json"
    questions.write_text(
        json.dumps({
            "questions": [{
                "id": "demo-question",
                "repository": "demo",
                "prompt": "Explain demo.",
                "expected_files": [],
                "expected_symbols": ["Demo"],
            }]
        }),
        encoding="utf-8",
    )
    manifest = tmp_path / "manifest.json"
    manifest.write_text(
        json.dumps({
            "schema_version": 2,
            "artifacts": {"work_root": str(work_root)},
            "question_files": [str(questions)],
            "tools": {"answer_model": {"requested_model": "test"}},
            "repositories": {
                "demo": {
                    "enabled": True,
                    "revision": "demo-head",
                    "tracks": ["unrestricted_native"],
                }
            },
        }),
        encoding="utf-8",
    )

    def fake_repobrain(question, workspace, *_args, **_kwargs):
        return {
            "status": "success",
            "returncode": 0,
            "seconds": 1.0,
            "answer": "Demo",
            "sources": [],
            "limitations": [],
            "score": benchmark_runner.score("Demo", [], question, workspace),
            "usage": {"status": "unavailable"},
            "cost": {"status": "unavailable", "amount": None},
        }

    monkeypatch.setattr(benchmark_runner, "RESULTS_ROOT", results_root)
    monkeypatch.setattr(
        benchmark_runner,
        "artifact_dir",
        lambda run_id, repository, repeat, product, track: (
            results_root / run_id / track / repository
            / f"repeat-{repeat:03d}" / product
        ),
    )
    monkeypatch.setattr(benchmark_runner, "run_repobrain", fake_repobrain)
    monkeypatch.setattr(
        sys,
        "argv",
        [
            "run_benchmark_v2.py",
            "--manifest", str(manifest),
            "--run-id", "missing-demo",
            "--track", "unrestricted_native",
        ],
    )

    assert benchmark_runner.main() == 0
    payload = json.loads(
        (results_root / "missing-demo" / "unrestricted_native" / "results.json")
        .read_text(encoding="utf-8")
    )
    statuses = {
        record["product"]: record["result"]["status"]
        for record in payload["records"]
    }
    assert statuses == {"repobrain": "success", "codegraph": "unavailable"}


def test_evidence_score_requires_existing_full_relative_source_path(
    tmp_path: Path,
) -> None:
    source = tmp_path / "src" / "flask" / "app.py"
    source.parent.mkdir(parents=True)
    source.write_text("def dispatch_request(): pass\n", encoding="utf-8")
    question = {
        "expected_files": ["src/flask/app.py"],
        "expected_symbols": ["dispatch_request"],
    }

    basename_only = score(
        "app.py dispatch_request", ["app.py"], question, tmp_path
    )
    full_path = score(
        "dispatch_request", ["src/flask/app.py:1"], question, tmp_path
    )
    missing = score(
        "dispatch_request", ["src/flask/missing.py"], question, tmp_path
    )

    assert basename_only["files"]["src/flask/app.py"] is False
    assert full_path["files"]["src/flask/app.py"] is True
    assert missing["files"]["src/flask/app.py"] is False
    assert full_path["metric"] == "evidence_mention_recall"


def test_evidence_score_uses_identifier_boundaries(tmp_path: Path) -> None:
    question = {"expected_files": [], "expected_symbols": ["run", "Exec"]}

    score_info = score(
        "runtime execute ExecQuery; `run()` is called", [], question, tmp_path
    )

    assert score_info["symbols"] == {"run": True, "Exec": False}


def test_evidence_score_handles_long_source_annotations(tmp_path: Path) -> None:
    source = tmp_path / "scrape" / "scrape.go"
    source.parent.mkdir(parents=True)
    source.write_text("package scrape\n", encoding="utf-8")
    question = {
        "expected_files": ["scrape/scrape.go"],
        "expected_symbols": [],
    }
    annotation = "scrape/scrape.go (newScrapePool:137, " + "detail " * 1000 + ")"

    score_info = score("", [annotation, "x" * 10_000], question, tmp_path)

    assert score_info["files"] == {"scrape/scrape.go": True}


def test_track_isolates_artifact_paths() -> None:
    unrestricted = artifact_dir(
        "run", "flask", 1, "repobrain", "unrestricted_native"
    )
    source_free = artifact_dir(
        "run", "flask", 1, "repobrain", "source_free"
    )

    assert unrestricted != source_free
    assert "unrestricted_native" in unrestricted.parts
    assert "source_free" in source_free.parts


def test_unrestricted_plan_uses_source_worktrees() -> None:
    manifest_path = SCRIPTS.parent / "config" / "manifest-latest-v2.json"
    manifest = load_manifest(manifest_path)
    args = Namespace(
        manifest=manifest_path,
        questions=None,
        repository=["flask"],
        limit=1,
        repeat=1,
        product="all",
        run_id="test-run",
        track="unrestricted_native",
    )

    plan = build_plan(args, manifest)

    assert len(plan) == 2
    assert plan[0]["workspace"].name == "flask-repobrain"
    assert plan[1]["workspace"].name == "flask-codegraph"


def test_codegraph_prompt_changes_source_access_without_command_cap() -> None:
    question = {"prompt": "How does it work?"}
    native = codegraph_prompt(
        question, Path("/repo"), Path("/bin/codegraph"), True
    )
    source_free = codegraph_prompt(
        question, Path("/index"), Path("/bin/codegraph"), False
    )

    assert "directly inspect repository source files" in native
    assert "through CodeGraph only" not in native
    assert "through CodeGraph only" in source_free
    assert "no command-count limit" in native
    assert "at most eight" not in native + source_free


def test_capture_wrapper_preserves_jsonl(tmp_path: Path) -> None:
    events = tmp_path / "events.jsonl"
    wrapper = SCRIPTS / "capture_trae_jsonl.py"
    line = json.dumps({
        "type": "turn.completed",
        "usage": {"input_tokens": 3, "output_tokens": 2},
    })

    completed = subprocess.run(
        [
            sys.executable,
            str(wrapper),
            "--events",
            str(events),
            "--",
            sys.executable,
            "-c",
            f"print({line!r})",
        ],
        text=True,
        capture_output=True,
        check=False,
    )

    assert completed.returncode == 0
    assert line in completed.stdout
    assert line in events.read_text(encoding="utf-8")


def test_plain_text_answer_normalization_does_not_infer_sources() -> None:
    payload, normalized = normalize_answer_text("# Markdown answer\n\nsrc/app.py")

    assert normalized is True
    assert payload["answer"] == "# Markdown answer\n\nsrc/app.py"
    assert payload["sources"] == []
    assert payload["limitations"] == [
        "Normalized plain-text Trae output; no sources were inferred."
    ]


def test_json_answer_payload_normalizes_scalar_and_list_fields() -> None:
    payload = normalize_answer_payload({
        "answer": 42,
        "sources": "src/app.py",
        "limitations": ["first", None, 7],
    })

    assert payload["answer"] == "42"
    assert payload["sources"] == ["src/app.py"]
    assert payload["limitations"] == ["first", "7"]


def test_result_payload_does_not_expand_string_fields(tmp_path: Path) -> None:
    source = tmp_path / "src" / "app.py"
    source.parent.mkdir(parents=True)
    source.write_text("Demo = 1\n", encoding="utf-8")
    completed = subprocess.CompletedProcess([], 0, "", "")

    result = result_payload(
        completed,
        1.0,
        {
            "expected_files": ["src/app.py"],
            "expected_symbols": ["42"],
        },
        {
            "answer": 42,
            "sources": "src/app.py",
            "limitations": "single limitation",
        },
        source_access=True,
        workspace=tmp_path,
    )

    assert result["answer"] == "42"
    assert result["sources"] == ["src/app.py"]
    assert result["limitations"] == ["single limitation"]
    assert result["score"]["found"] == 2


def test_capture_wrapper_normalizes_plain_text_output_file(tmp_path: Path) -> None:
    events = tmp_path / "events.jsonl"
    answer = tmp_path / "answer.json"
    wrapper = SCRIPTS / "capture_trae_jsonl.py"
    script = (
        "from pathlib import Path; import sys; "
        "Path(sys.argv[1]).write_text('# Markdown answer')"
    )

    completed = subprocess.run(
        [
            sys.executable,
            str(wrapper),
            "--events", str(events),
            "--",
            sys.executable, "-c", script, str(answer),
            "--output-last-message", str(answer),
        ],
        text=True,
        capture_output=True,
        check=False,
    )

    assert completed.returncode == 0
    payload = json.loads(answer.read_text(encoding="utf-8"))
    assert payload["answer"] == "# Markdown answer"
    assert payload["sources"] == []
    assert "no sources were inferred" in payload["limitations"][0]


def test_codegraph_runner_normalizes_plain_text_answer(
    tmp_path: Path,
    monkeypatch,
) -> None:
    workspace = tmp_path / "workspace"
    output_dir = tmp_path / "output"
    workspace.mkdir()
    (workspace / ".codegraph").mkdir()
    schema = tmp_path / "schema.json"
    schema.write_text("{}", encoding="utf-8")
    codegraph = tmp_path / "codegraph"
    codegraph.write_text("runner", encoding="utf-8")

    def fake_run(command, **_kwargs):
        answer_path = Path(command[command.index("-o") + 1])
        answer_path.write_text("# Markdown answer", encoding="utf-8")
        event = json.dumps({
            "type": "item.completed",
            "item": {
                "type": "command_execution",
                "command": f"{codegraph} query -p {workspace} demo",
            },
        }, separators=(",", ":"))
        return 1.0, subprocess.CompletedProcess(command, 0, event, "")

    monkeypatch.setattr(benchmark_runner, "run_command", fake_run)
    result = run_codegraph(
        {
            "id": "demo",
            "prompt": "Explain demo.",
            "expected_files": [],
            "expected_symbols": [],
        },
        workspace,
        workspace,
        output_dir,
        schema,
        codegraph,
        "test-model",
        10,
        "unrestricted_native",
        True,
    )

    assert result["status"] == "success"
    assert result["answer"] == "# Markdown answer"
    assert result["sources"] == []
    assert "no sources were inferred" in result["limitations"][0]


def test_report_summary_tracks_total_time_usage_and_cost_coverage() -> None:
    results = [
        {
            "status": "success",
            "seconds": 2.5,
            "score": {"found": 2, "total": 3},
            "usage": {"status": "available", "total_tokens": 120},
            "cost": {"status": "available", "amount": 0.25},
        },
        {
            "status": "failed",
            "seconds": 1.5,
            "score": {"found": 0, "total": 2},
            "usage": {"status": "unavailable"},
            "cost": {"status": "unavailable", "amount": None},
        },
    ]

    summary = summarize(results)

    assert summary["total_seconds"] == 4.0
    assert summary["found"] == 2 and summary["total"] == 5
    assert summary["total_tokens"] == 120
    assert summary["usage_available"] == 1
    assert summary["cost_usd"] == 0.25
    assert summary["cost_available"] == 1
