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
    assert len(groups[0][1]) == 2
    with pytest.raises(ValueError, match="unknown repositories"):
        judge.select_groups(results, ["vite"], None)


def test_validate_verdicts_rejects_missing_or_duplicate_candidates() -> None:
    assert judge.validate_verdicts({"verdicts": [verdict("candidate-001")]}, ["candidate-001"])
    with pytest.raises(ValueError, match="exactly once"):
        judge.validate_verdicts({"verdicts": [verdict("candidate-001"), verdict("candidate-001")]}, ["candidate-001", "candidate-002"])


def test_candidate_balance_requires_both_products_per_repeat() -> None:
    judge.validate_candidate_balance([record("repobrain", 1), record("codegraph", 1)])
    with pytest.raises(ValueError, match="paired successful"):
        judge.validate_candidate_balance([record("repobrain", 1)])


def test_product_and_cost_aggregation_remain_separate() -> None:
    mapping = [{"candidate_id": "candidate-001", "product": "repobrain", "repeat": 1}, {"candidate_id": "candidate-002", "product": "codegraph", "repeat": 1}]
    groups = [{"status": "success", "mapping": mapping, "verdicts": [verdict("candidate-001"), verdict("candidate-002", "partially_correct")], "judge_metrics": {"seconds": 3, "usage": {"status": "available", "total_tokens": 7}, "cost": {"status": "available", "amount": 0.1}}}]
    summary = judge.product_summary(groups)
    assert summary["repobrain"]["weighted_accuracy"] == 1.0
    assert summary["codegraph"]["weighted_accuracy"] == 0.5
    runtime = judge.runtime_metrics([record("repobrain", 1), record("codegraph", 1)])
    assert runtime["repobrain"]["usage"]["total_tokens"] == 10
    metrics = judge.aggregate_judge_metrics(groups)
    assert metrics["usage"]["total_tokens"] == 7
    assert metrics["cost"]["amount"] == 0.1


def test_prompt_contains_no_product_identity() -> None:
    candidates, _ = judge.anonymize([record("repobrain", 1, "alpha")], "flask", "q1", 1)
    prompt = judge.prompt_for({"prompt": "What happens?"}, candidates)
    assert "repobrain" not in prompt.lower()
    assert "codegraph" not in prompt.lower()
    assert "candidate-001" in prompt
