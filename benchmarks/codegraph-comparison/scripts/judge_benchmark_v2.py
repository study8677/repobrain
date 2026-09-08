#!/usr/bin/env python3
"""Blindly judge unrestricted-native benchmark answers against pinned source."""

from __future__ import annotations

import argparse
import hashlib
import json
import random
import subprocess
import tempfile
import time
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

from benchmark_v2_common import BENCH_ROOT, WORK_ROOT, question_files, resolve_path
from run_benchmark_v2 import parse_trae_metrics


VERDICTS = {"correct", "partially_correct", "incorrect"}
FACTUALITY = {"accurate", "minor_errors", "major_errors"}
COMPLETENESS = {"complete", "partial", "incomplete"}
CITATIONS = {"valid", "partially_valid", "invalid", "no_citations"}
DEFAULT_MODEL = "Seed-2.1-Turbo"
DEFAULT_SEED = 20260908


def atomic_write(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def load_question_registry(results: dict) -> dict[str, dict]:
    manifest_path = Path(results["manifest"])
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    registry = {}
    for path in question_files(manifest, None):
        payload = json.loads(path.read_text(encoding="utf-8"))
        for question in payload["questions"]:
            registry[question["id"]] = question
    return registry


def select_groups(results: dict, repositories: list[str] | None, limit: int | None) -> list[tuple[tuple[str, str], list[dict]]]:
    if results.get("track") != "unrestricted_native":
        raise ValueError("semantic judge only accepts unrestricted_native results")
    requested = set(repositories or [])
    available = {record["repository"] for record in results.get("records", [])}
    unknown = requested - available
    if unknown:
        raise ValueError(f"unknown repositories: {', '.join(sorted(unknown))}")
    grouped: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for record in results.get("records", []):
        if requested and record["repository"] not in requested:
            continue
        if record.get("result", {}).get("status") != "success":
            continue
        grouped[(record["repository"], record["question_id"])].append(record)
    selected = []
    counts: Counter[str] = Counter()
    for key in sorted(grouped):
        repository = key[0]
        if limit is not None and counts[repository] >= limit:
            continue
        selected.append((key, grouped[key]))
        counts[repository] += 1
    return selected


def anonymize(records: list[dict], repository: str, question_id: str, seed: int) -> tuple[list[dict], list[dict]]:
    records = sorted(records, key=lambda item: (item["product"], item["repeat"], item.get("artifact", "")))
    rng = random.Random(f"{seed}:{repository}:{question_id}")
    rng.shuffle(records)
    candidates, mapping = [], []
    for index, record in enumerate(records, 1):
        candidate_id = f"candidate-{index:03d}"
        result = record["result"]
        candidates.append({
            "candidate_id": candidate_id,
            "answer": result.get("answer", ""),
            "sources": result.get("sources", []),
            "limitations": result.get("limitations", []),
        })
        mapping.append({
            "candidate_id": candidate_id,
            "product": record["product"],
            "repeat": record["repeat"],
            "artifact": record.get("artifact", ""),
        })
    return candidates, mapping


def validate_candidate_balance(records: list[dict]) -> None:
    repeats: dict[int, set[str]] = defaultdict(set)
    for record in records:
        repeats[record["repeat"]].add(record["product"])
    incomplete = sorted(repeat for repeat, products in repeats.items() if products != {"repobrain", "codegraph"})
    if incomplete:
        raise ValueError(f"missing paired successful candidates for repeats: {incomplete}")


def judge_schema(candidate_ids: list[str]) -> dict:
    return {
        "type": "object",
        "properties": {
            "verdicts": {
                "type": "array", "minItems": len(candidate_ids), "maxItems": len(candidate_ids),
                "items": {
                    "type": "object",
                    "properties": {
                        "candidate_id": {"type": "string", "enum": candidate_ids},
                        "verdict": {"type": "string", "enum": sorted(VERDICTS)},
                        "factuality": {"type": "string", "enum": sorted(FACTUALITY)},
                        "completeness": {"type": "string", "enum": sorted(COMPLETENESS)},
                        "citation_validity": {"type": "string", "enum": sorted(CITATIONS)},
                        "unsupported_claims": {"type": "array", "items": {"type": "string"}},
                        "reason": {"type": "string"},
                    },
                    "required": ["candidate_id", "verdict", "factuality", "completeness", "citation_validity", "unsupported_claims", "reason"],
                    "additionalProperties": False,
                },
            }
        },
        "required": ["verdicts"], "additionalProperties": False,
    }


def validate_verdicts(payload: dict, candidate_ids: list[str]) -> list[dict]:
    verdicts = payload.get("verdicts")
    if not isinstance(verdicts, list):
        raise ValueError("judge response has no verdicts array")
    seen = [item.get("candidate_id") for item in verdicts if isinstance(item, dict)]
    if sorted(seen) != sorted(candidate_ids) or len(seen) != len(set(seen)):
        raise ValueError("judge response must contain each candidate exactly once")
    for item in verdicts:
        if item.get("verdict") not in VERDICTS or item.get("factuality") not in FACTUALITY:
            raise ValueError(f"invalid judge verdict for {item.get('candidate_id')}")
        if item.get("completeness") not in COMPLETENESS or item.get("citation_validity") not in CITATIONS:
            raise ValueError(f"invalid judge dimensions for {item.get('candidate_id')}")
        if not isinstance(item.get("unsupported_claims"), list) or not isinstance(item.get("reason"), str) or not item["reason"].strip():
            raise ValueError(f"incomplete judge explanation for {item.get('candidate_id')}")
    return verdicts


def prompt_for(question: dict, candidates: list[dict]) -> str:
    return f"""You are an independent semantic judge for a repository benchmark.
Inspect the repository source in the current read-only workspace to establish ground truth.
Judge every anonymized candidate independently. Do not rank candidates, infer their producer,
or reward verbosity. Check factual correctness, whether the question is fully answered, whether
each cited file/line/symbol exists and supports the claim, and list concrete unsupported claims.
Use no benchmark product tools; source inspection is the ground truth.

Question:
{question['prompt']}

Candidates (order is deterministically randomized):
{json.dumps(candidates, ensure_ascii=False, indent=2)}
"""


def clean_workspace(repository: str, results: dict) -> Path:
    configured = results.get("tools", {}).get("artifacts", {}).get("work_root")
    root = resolve_path(configured) if configured else WORK_ROOT
    workspace = root / "repos" / repository
    if not (workspace / ".git").exists():
        raise FileNotFoundError(f"missing source repository: {workspace}")
    dirty = subprocess.run(
        ["git", "status", "--porcelain", "--untracked-files=no"], cwd=workspace,
        text=True, capture_output=True, check=True,
    ).stdout.strip()
    if dirty:
        raise ValueError(f"source repository has tracked changes: {workspace}")
    expected = results.get("repositories", {}).get(repository, {}).get("revision")
    actual = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=workspace, text=True, capture_output=True, check=True,
    ).stdout.strip()
    if expected and actual != expected:
        raise ValueError(f"source revision mismatch for {repository}: {actual} != {expected}")
    return workspace


def run_judge(workspace: Path, question: dict, candidates: list[dict], model: str, timeout: float, artifact_dir: Path) -> tuple[list[dict], dict]:
    artifact_dir.mkdir(parents=True, exist_ok=True)
    answer_path = artifact_dir / "answer.json"
    events_path = artifact_dir / "events.jsonl"
    with tempfile.TemporaryDirectory(prefix="semantic-judge-schema-") as directory:
        schema_path = Path(directory) / "schema.json"
        schema_path.write_text(json.dumps(judge_schema([item["candidate_id"] for item in candidates])), encoding="utf-8")
        started = time.monotonic()
        completed = subprocess.run([
            "trae-cli", "exec", "-m", model, "--cd", str(workspace),
            "--sandbox", "read-only", "--skip-git-repo-check", "--ephemeral", "--json",
            "--shell-tool-timeout", "120s", "--output-schema", str(schema_path),
            "-o", str(answer_path), prompt_for(question, candidates),
        ], text=True, capture_output=True, timeout=timeout, check=False)
        seconds = time.monotonic() - started
    event_text = f"{completed.stdout}\n{completed.stderr}"
    events_path.write_text(event_text, encoding="utf-8")
    if completed.returncode != 0 or not answer_path.is_file():
        raise RuntimeError(f"judge failed with return code {completed.returncode}")
    payload = json.loads(answer_path.read_text(encoding="utf-8"))
    verdicts = validate_verdicts(payload, [item["candidate_id"] for item in candidates])
    metrics = {"seconds": seconds, **parse_trae_metrics(event_text, model)}
    return verdicts, metrics


def product_summary(groups: list[dict]) -> dict:
    summary: dict[str, dict] = {}
    for group in groups:
        if group.get("status") != "success":
            continue
        mappings = {item["candidate_id"]: item for item in group["mapping"]}
        for verdict in group["verdicts"]:
            product = mappings[verdict["candidate_id"]]["product"]
            bucket = summary.setdefault(product, {"answers": 0, "verdicts": Counter(), "factuality": Counter(), "completeness": Counter(), "citation_validity": Counter(), "weighted_accuracy": 0.0})
            bucket["answers"] += 1
            for dimension in ("verdicts", "factuality", "completeness", "citation_validity"):
                field = "verdict" if dimension == "verdicts" else dimension
                bucket[dimension][verdict[field]] += 1
            bucket["weighted_accuracy"] += {"correct": 1.0, "partially_correct": 0.5, "incorrect": 0.0}[verdict["verdict"]]
    for bucket in summary.values():
        bucket["weighted_accuracy"] = bucket["weighted_accuracy"] / bucket["answers"] if bucket["answers"] else 0.0
        for key in ("verdicts", "factuality", "completeness", "citation_validity"):
            bucket[key] = dict(sorted(bucket[key].items()))
    return summary


def runtime_metrics(records: list[dict]) -> dict:
    output = {}
    for product in sorted({item["product"] for item in records}):
        successful = [item["result"] for item in records if item["product"] == product and item.get("result", {}).get("status") == "success"]
        amounts = [item.get("cost", {}).get("amount") for item in successful if item.get("cost", {}).get("status") == "available"]
        tokens = [item.get("usage", {}).get("total_tokens") for item in successful if item.get("usage", {}).get("status") == "available"]
        output[product] = {
            "successful_runs": len(successful), "seconds": sum(item.get("seconds", 0) for item in successful),
            "usage": {"available_runs": len(tokens), "total_tokens": sum(tokens)},
            "cost": {"available_runs": len(amounts), "currency": "USD", "amount": sum(amounts) if amounts else None},
        }
    return output


def aggregate_judge_metrics(groups: list[dict]) -> dict:
    successful = [item["judge_metrics"] for item in groups if item.get("status") == "success"]
    amounts = [item.get("cost", {}).get("amount") for item in successful if item.get("cost", {}).get("status") == "available"]
    tokens = [item.get("usage", {}).get("total_tokens") for item in successful if item.get("usage", {}).get("status") == "available"]
    return {"calls": len(successful), "seconds": sum(item.get("seconds", 0) for item in successful), "usage": {"available_calls": len(tokens), "total_tokens": sum(tokens)}, "cost": {"available_calls": len(amounts), "currency": "USD", "amount": sum(amounts) if amounts else None}}


def report_payload(args: argparse.Namespace, results: dict, groups: list[dict]) -> dict:
    selected_keys = {(item["repository"], item["question_id"]) for item in groups}
    selected_records = [item for item in results.get("records", []) if (item["repository"], item["question_id"]) in selected_keys]
    return {
        "schema_version": 2, "created_at": datetime.now(timezone.utc).isoformat(),
        "input": str(args.input.resolve()),
        "input_sha256": hashlib.sha256(args.input.read_bytes()).hexdigest(),
        "track": results["track"], "seed": args.seed,
        "judge_model": args.model, "groups": groups,
        "product_summary": product_summary(groups),
        "product_runtime_metrics": runtime_metrics(selected_records),
        "judge_metrics": aggregate_judge_metrics(groups),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path, help="unrestricted_native results.json")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--repository", action="append")
    parser.add_argument("--limit", type=int, help="maximum questions per repository")
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--timeout", type=float, default=600)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    args = parser.parse_args()
    if args.limit is not None and args.limit < 1:
        parser.error("--limit must be at least 1")
    results = json.loads(args.input.read_text(encoding="utf-8"))
    selected = select_groups(results, args.repository, args.limit)
    questions = load_question_registry(results)
    output = args.output or args.input.with_name("semantic-judge.json")
    prior = {}
    if args.resume and output.is_file():
        previous = json.loads(output.read_text(encoding="utf-8"))
        expected_digest = hashlib.sha256(args.input.read_bytes()).hexdigest()
        if previous.get("input_sha256") != expected_digest or previous.get("seed") != args.seed or previous.get("judge_model") != args.model:
            parser.error("--resume output does not match input, seed, or judge model")
        prior = {(item["repository"], item["question_id"]): item for item in previous.get("groups", []) if item.get("status") == "success"}
    groups = []
    for (repository, question_id), records in selected:
        if (repository, question_id) in prior:
            groups.append(prior[(repository, question_id)])
            continue
        candidates, mapping = anonymize(records, repository, question_id, args.seed)
        group = {"repository": repository, "question_id": question_id, "status": "failed", "mapping": mapping, "verdicts": []}
        try:
            validate_candidate_balance(records)
            workspace = clean_workspace(repository, results)
            verdicts, metrics = run_judge(workspace, questions[question_id], candidates, args.model, args.timeout, output.parent / "semantic-judge-artifacts" / repository / question_id)
            group.update({"status": "success", "verdicts": verdicts, "judge_metrics": metrics})
        except Exception as exc:
            group["error"] = f"{type(exc).__name__}: {exc}"
        groups.append(group)
        atomic_write(output, report_payload(args, results, groups))
    atomic_write(output, report_payload(args, results, groups))
    print(output)
    return 0 if all(item["status"] == "success" for item in groups) else 1


if __name__ == "__main__":
    raise SystemExit(main())
