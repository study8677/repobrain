"""Focused regression tests for the manifest-driven v2 benchmark."""

from __future__ import annotations

import json
import subprocess
import sys
from argparse import Namespace
from pathlib import Path


SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))

from benchmark_v2_common import artifact_dir, load_manifest  # noqa: E402
from render_benchmark_v2_report import summarize  # noqa: E402
from run_benchmark_v2 import (  # noqa: E402
    audit_codegraph_events,
    build_plan,
    codegraph_prompt,
    enforce_codegraph_protocol,
    is_codegraph_command,
    parse_trae_metrics,
)


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
