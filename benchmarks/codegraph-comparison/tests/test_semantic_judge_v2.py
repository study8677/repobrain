from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest


SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))
SPEC = importlib.util.spec_from_file_location("judge_benchmark_v2", SCRIPTS / "judge_benchmark_v2.py")
judge = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(judge)


def record(product: str, repeat: int, answer: str = "answer") -> dict:
    return {
        "repository": "flask", "question_id": "q1", "product": product,
        "repeat": repeat, "artifact": f"{product}-{repeat}.json",
        "result": {"status": "success", "answer": answer, "sources": [], "limitations": [], "seconds": 2,
                   "usage": {"status": "available", "total_tokens": 10},
                   "cost": {"status": "unavailable", "amount": None}},
    }


def verdict(candidate_id: str, value: str = "correct") -> dict:
    return {"candidate_id": candidate_id, "verdict": value, "factuality": "accurate", "completeness": "complete", "citation_validity": "valid", "unsupported_claims": [], "reason": "Supported by source."}


def test_anonymization_is_deterministic_and_hides_product() -> None:
    records = [record("repobrain", 1, "r1"), record("codegraph", 1, "c1"), record("repobrain", 2, "r2"), record("codegraph", 2, "c2")]
    first, mapping = judge.anonymize(records, "flask", "q1", 42)
    second, _ = judge.anonymize(list(reversed(records)), "flask", "q1", 42)
    assert first == second
    assert all("product" not in candidate and "repeat" not in candidate for candidate in first)
    assert {item["product"] for item in mapping} == {"repobrain", "codegraph"}


def test_select_groups_filters_repository_limit_and_failures() -> None:
    records = [record("repobrain", 1), record("codegraph", 1)]
    failed = record("repobrain", 2)
    failed["result"]["status"] = "failed"
    results = {"track": "unrestricted_native", "records": records + [failed]}
    groups = judge.select_groups(results, ["flask"], 1)
    assert len(groups) == 1
    assert len(groups[0][1]) == 3
    with pytest.raises(ValueError, match="unknown repositories"):
        judge.select_groups(results, ["vite"], None)


def test_validate_verdicts_rejects_missing_or_duplicate_candidates() -> None:
    assert judge.validate_verdicts({"verdicts": [verdict("candidate-001")]}, ["candidate-001"])
    with pytest.raises(ValueError, match="exactly once"):
        judge.validate_verdicts({"verdicts": [verdict("candidate-001"), verdict("candidate-001")]}, ["candidate-001", "candidate-002"])


def test_plan_slots_require_both_products_but_not_success() -> None:
    records = [record("repobrain", 1), record("codegraph", 1)]
    records[1]["result"]["status"] = "failed"
    judge.validate_plan_slots(records, 1)
    with pytest.raises(ValueError, match="planned product slots"):
        judge.validate_plan_slots([record("repobrain", 1)], 1)


def test_runtime_failures_are_partitioned_with_automatic_penalty() -> None:
    records = [record("repobrain", 1), record("codegraph", 1)]
    records[1]["result"].update({"status": "protocol_violation", "returncode": 124, "limitations": ["No tool call."]})
    successful, failures = judge.partition_records(records)
    assert len(successful) == 1
    assert failures[0]["runtime_status"] == "protocol_violation"
    assert failures[0]["automatic_penalty"]["verdict"] == "incorrect"
    assert "returncode=124" in failures[0]["reason"]


def test_product_and_cost_aggregation_remain_separate() -> None:
    mapping = [{"candidate_id": "candidate-001", "product": "repobrain", "repeat": 1}, {"candidate_id": "candidate-002", "product": "codegraph", "repeat": 1}]
    groups = [{"status": "success", "mapping": mapping, "verdicts": [verdict("candidate-001"), verdict("candidate-002", "partially_correct")], "grading_metrics": {"seconds": 3, "usage": {"status": "available", "total_tokens": 7}, "cost": {"status": "available", "amount": 0.1}}}]
    summary = judge.product_summary(groups)
    assert summary["repobrain"]["weighted_accuracy"] == 1.0
    assert summary["codegraph"]["weighted_accuracy"] == 0.5
    runtime = judge.runtime_metrics([record("repobrain", 1), record("codegraph", 1)])
    assert runtime["repobrain"]["usage"]["total_tokens"] == 10
    metrics = judge.aggregate_stage_metrics(groups, "grading_metrics")
    assert metrics["usage"]["total_tokens"] == 7
    assert metrics["cost"]["amount"] == 0.1


def test_runtime_failure_counts_in_accuracy_denominator() -> None:
    mapping = [{"candidate_id": "candidate-001", "product": "repobrain", "repeat": 1}]
    _, failures = judge.partition_records([{**record("codegraph", 1), "result": {"status": "failed", "returncode": 124}}])
    groups = [{"status": "success", "mapping": mapping, "verdicts": [verdict("candidate-001")], "runtime_failures": failures}]
    summary = judge.product_summary(groups)
    assert summary["repobrain"]["answers"] == 1
    assert summary["codegraph"]["answers"] == 1
    assert summary["codegraph"]["runtime_failures"] == 1
    assert summary["codegraph"]["weighted_accuracy"] == 0.0
    assert summary["codegraph"]["verdicts"] == {"incorrect": 1}
    runtime = judge.runtime_metrics([record("repobrain", 1), {**record("codegraph", 1), "result": {"status": "failed", "seconds": 600}}])
    assert runtime["codegraph"]["runtime_failures"] == 1
    assert runtime["codegraph"]["seconds"] == 600


def test_runtime_metrics_treat_unavailable_seconds_as_zero() -> None:
    unavailable = {
        **record("repobrain", 1),
        "result": {"status": "unavailable", "seconds": None},
    }
    runtime = judge.runtime_metrics([unavailable])
    assert runtime["repobrain"]["seconds"] == 0
    assert runtime["repobrain"]["runtime_failures"] == 1


def test_grading_prompt_contains_no_product_identity_and_forbids_tools() -> None:
    candidates, _ = judge.anonymize([record("repobrain", 1, "alpha")], "flask", "q1", 1)
    truth = {"facts": [{"relationship": "A calls B", "citations": ["x.py:A"]}], "common_errors": []}
    prompt = judge.grading_prompt({"prompt": "What happens?"}, truth, candidates)
    assert "repobrain" not in prompt.lower()
    assert "codegraph" not in prompt.lower()
    assert "candidate-001" in prompt
    assert "must not call tools" in prompt.lower()


def test_ground_truth_fixture_and_schema_contract() -> None:
    fixture = Path(__file__).parent / "fixtures" / "ground-truth.json"
    payload = judge.validate_ground_truth(__import__("json").loads(fixture.read_text()))
    assert len(payload["facts"]) == 5
    assert judge.ground_truth_schema()["properties"]["facts"]["maxItems"] == 12


def test_ground_truth_cache_avoids_model_call(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    fixture = Path(__file__).parent / "fixtures" / "ground-truth.json"
    truth = __import__("json").loads(fixture.read_text())
    metrics = {"seconds": 1, "usage": {"status": "available", "total_tokens": 2}, "cost": {"status": "unavailable"}}
    monkeypatch.setattr(judge, "ground_truth_fingerprint", lambda *_: "fingerprint")
    judge.atomic_write(tmp_path / "cache.json", {"fingerprint": "fingerprint", "ground_truth": truth, "metrics": metrics})
    monkeypatch.setattr(judge, "run_trae_stage", lambda *_args, **_kwargs: pytest.fail("cache should avoid model call"))
    actual, actual_metrics, cache_hit = judge.extract_ground_truth(tmp_path, {"prompt": "q"}, "model", 1, tmp_path)
    assert actual == truth
    assert actual_metrics == metrics
    assert cache_hit is True


def test_failed_resume_group_is_not_reusable() -> None:
    groups = [
        {"repository": "flask", "question_id": "failed", "status": "failed"},
        {"repository": "flask", "question_id": "old", "status": "success", "evaluation_mode": "blind_judge_with_automatic_failures"},
        {"repository": "flask", "question_id": "new", "status": "success", "ground_truth_metrics": {}, "grading_metrics": {}},
    ]
    reusable = {(item["repository"], item["question_id"]) for item in groups if judge.reusable_group(item)}
    assert reusable == {("flask", "new")}
