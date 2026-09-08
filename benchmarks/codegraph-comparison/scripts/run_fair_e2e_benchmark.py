#!/usr/bin/env python3
"""Run matched end-to-end RepoBrain and CodeGraph question benchmarks."""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import os
import shutil
import subprocess
import tempfile
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / ".work"
RESULTS = ROOT / "results"
RAW = RESULTS / "raw" / "fair-e2e-turbo"
RB_ASK = WORK / "repobrain-venv" / "bin" / "rb-ask"
RB_WORKSPACE = WORK / "corpora" / "verl-query-repobrain-knowledge-only"
CG_PROJECT = WORK / "corpora" / "verl-query-codegraph"
CG_BIN = WORK / "codegraph-runtime" / "node_modules" / ".bin" / "codegraph"
CONTROL_ROOT = WORK / "fair-e2e-codegraph-control"
MODEL = "Seed-2.1-Turbo"


def load_questions() -> list[dict]:
    original = json.loads((ROOT / "config" / "questions.json").read_text())
    expanded = json.loads((ROOT / "config" / "questions-expanded.json").read_text())
    return [
        *[item for item in original["questions"] if item["id"].startswith("verl-")],
        *expanded["questions"],
    ]


def score(answer: str, question: dict) -> dict:
    files = {
        item: item in answer or Path(item).name in answer
        for item in question["expected_files"]
    }
    symbols = {item: item in answer for item in question["expected_symbols"]}
    found = sum(files.values()) + sum(symbols.values())
    total = len(files) + len(symbols)
    return {
        "files": files,
        "symbols": symbols,
        "found": found,
        "total": total,
        "recall": found / total if total else 1.0,
    }


def parse_json_payload(text: str) -> dict:
    stripped = text.strip()
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        start = stripped.find("{")
        end = stripped.rfind("}")
        if start < 0 or end <= start:
            raise
        return json.loads(stripped[start : end + 1])


def run_command(
    command: list[str],
    *,
    env: dict | None = None,
    timeout: float = 600,
) -> tuple[float, subprocess.CompletedProcess]:
    started = time.perf_counter()
    try:
        completed = subprocess.run(
            command,
            cwd=ROOT,
            env=env,
            text=True,
            capture_output=True,
            timeout=timeout,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        stdout = exc.stdout.decode() if isinstance(exc.stdout, bytes) else (exc.stdout or "")
        stderr = exc.stderr.decode() if isinstance(exc.stderr, bytes) else (exc.stderr or "")
        completed = subprocess.CompletedProcess(
            command,
            124,
            stdout,
            f"{stderr}\nTimed out after {timeout:g}s.",
        )
    return time.perf_counter() - started, completed


def run_repobrain(question: dict, timeout: float) -> dict:
    env = os.environ.copy()
    env.update(
        {
            "RB_HOST_RUNNER": "generic",
            "RB_HOST_COMMAND": (
                "trae-cli exec -m Seed-2.1-Turbo "
                "--cd {workspace} --sandbox read-only --skip-git-repo-check "
                "--ephemeral -o {output_file}"
            ),
            "RB_HOST_OUTPUT_MODE": "file",
            "RB_HOST_TIMEOUT_SECONDS": "600",
        }
    )
    elapsed, completed = run_command(
        [
            str(RB_ASK),
            "--json",
            "--workspace",
            str(RB_WORKSPACE),
            question["prompt"],
        ],
        env=env,
        timeout=timeout,
    )
    raw_path = RAW / f"{question['id']}.repobrain.log"
    raw_path.write_text(
        f"STDOUT\n{completed.stdout}\nSTDERR\n{completed.stderr}",
        encoding="utf-8",
    )
    payload = parse_json_payload(completed.stdout) if completed.returncode == 0 else {}
    answer = str(payload.get("answer") or "")
    sources = payload.get("sources") or []
    combined = "\n".join([answer, *map(str, sources)])
    return {
        "status": "success" if completed.returncode == 0 and answer else "failed",
        "returncode": completed.returncode,
        "seconds": elapsed,
        "answer": answer,
        "sources": sources,
        "limitations": payload.get("limitations") or [],
        "score": score(combined, question),
    }


def codegraph_prompt(question: dict, control_workspace: Path) -> str:
    return f"""\
You are answering one repository question for a controlled benchmark.

You MUST obtain all repository evidence only by running this CodeGraph CLI:
{CG_BIN}

The source-free indexed project is:
{control_workspace}

Use the project option after the subcommand, for example:
codegraph query -p "{control_workspace}" "search terms"
codegraph node -p "{control_workspace}" "SymbolName"

Set CODEGRAPH_TELEMETRY=0, CODEGRAPH_NO_UPDATE_CHECK=1,
CODEGRAPH_NO_DAEMON=1, and NO_COLOR=1 for every CodeGraph command.
Do not use cat, rg, grep, sed, awk, Python file reads, or any direct filesystem
source-reading tool. You may use multiple CodeGraph query, node, explore,
callers, callees, path, or context commands, with a maximum of eight CodeGraph
commands. Do not answer from prior knowledge.

Question:
{question["prompt"]}

Return the final response as JSON matching the supplied schema. Put the grounded
explanation in "answer", cited file paths in "sources", and retrieval caveats in
"limitations".
"""


def run_codegraph(question: dict, schema_path: Path, timeout: float) -> dict:
    control_workspace = CONTROL_ROOT / question["id"]
    control_workspace.mkdir(parents=True, exist_ok=True)
    shutil.copytree(
        CG_PROJECT / ".codegraph",
        control_workspace / ".codegraph",
        dirs_exist_ok=True,
    )
    output_path = RAW / f"{question['id']}.codegraph-answer.json"
    output_path.unlink(missing_ok=True)
    elapsed, completed = run_command(
        [
            "trae-cli",
            "exec",
            "-m",
            MODEL,
            "--cd",
            str(control_workspace),
            "--sandbox",
            "workspace-write",
            "--skip-git-repo-check",
            "--ephemeral",
            "--json",
            "--shell-tool-timeout",
            "120s",
            "--output-schema",
            str(schema_path),
            "-o",
            str(output_path),
            codegraph_prompt(question, control_workspace),
        ],
        timeout=timeout,
    )
    event_path = RAW / f"{question['id']}.codegraph-events.jsonl"
    event_path.write_text(
        f"{completed.stdout}\n{completed.stderr}",
        encoding="utf-8",
    )
    payload = {}
    if completed.returncode == 0 and output_path.is_file():
        payload = parse_json_payload(output_path.read_text(encoding="utf-8"))
    answer = str(payload.get("answer") or "")
    sources = payload.get("sources") or []
    combined = "\n".join([answer, *map(str, sources)])
    return {
        "status": "success" if completed.returncode == 0 and answer else "failed",
        "returncode": completed.returncode,
        "seconds": elapsed,
        "answer": answer,
        "sources": sources,
        "limitations": payload.get("limitations") or [],
        "score": score(combined, question),
    }


def write_results(records: list[dict], output: Path, workers: int) -> None:
    payload = {
        "schema_version": 1,
        "model": MODEL,
        "timing_scope": "end-to-end answer generation",
        "concurrency": workers,
        "records": records,
    }
    output.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output",
        type=Path,
        default=RESULTS / "fair-e2e-turbo.json",
    )
    parser.add_argument("--limit", type=int)
    parser.add_argument("--restart", action="store_true")
    parser.add_argument("--timeout", type=float, default=600)
    parser.add_argument("--workers", type=int, default=1)
    parser.add_argument(
        "--product",
        choices=("all", "repobrain", "codegraph"),
        default="all",
    )
    args = parser.parse_args()

    RAW.mkdir(parents=True, exist_ok=True)
    CONTROL_ROOT.mkdir(parents=True, exist_ok=True)
    questions = load_questions()
    if args.limit:
        questions = questions[: args.limit]

    schema = {
        "type": "object",
        "properties": {
            "answer": {"type": "string"},
            "sources": {"type": "array", "items": {"type": "string"}},
            "limitations": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["answer", "sources", "limitations"],
        "additionalProperties": False,
    }
    existing_records: list[dict] = []
    if args.output.is_file() and not args.restart:
        existing = json.loads(args.output.read_text(encoding="utf-8"))
        existing_records = list(existing.get("records") or [])
    existing_by_id = {record["id"]: record for record in existing_records}
    records_by_id = {}
    for question in questions:
        records_by_id[question["id"]] = {
            "id": question["id"],
            "prompt": question["prompt"],
            "expected_files": question["expected_files"],
            "expected_symbols": question["expected_symbols"],
            "repobrain": existing_by_id.get(question["id"], {}).get("repobrain"),
            "codegraph": existing_by_id.get(question["id"], {}).get("codegraph"),
        }

    with tempfile.TemporaryDirectory(prefix="repobrain-fair-e2e-") as tmp:
        schema_path = Path(tmp) / "answer.schema.json"
        schema_path.write_text(json.dumps(schema), encoding="utf-8")
        jobs = {}
        with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
            for question in questions:
                record = records_by_id[question["id"]]
                if args.product in {"all", "repobrain"} and (
                    not record["repobrain"] or record["repobrain"]["status"] != "success"
                ):
                    future = executor.submit(run_repobrain, question, args.timeout)
                    jobs[future] = (question, "repobrain")
                if args.product in {"all", "codegraph"} and (
                    not record["codegraph"] or record["codegraph"]["status"] != "success"
                ):
                    future = executor.submit(run_codegraph, question, schema_path, args.timeout)
                    jobs[future] = (question, "codegraph")

            for completed, future in enumerate(
                concurrent.futures.as_completed(jobs),
                start=1,
            ):
                question, product = jobs[future]
                try:
                    result = future.result()
                except Exception as exc:
                    result = {
                        "status": "failed",
                        "returncode": 1,
                        "seconds": None,
                        "answer": "",
                        "sources": [],
                        "limitations": [f"{type(exc).__name__}: {exc}"],
                        "score": score("", question),
                    }
                records_by_id[question["id"]][product] = result
                print(
                    f"[{completed}/{len(jobs)}] {question['id']} {product} "
                    f"{result['status']} {result['seconds']}s "
                    f"{result['score']['found']}/{result['score']['total']}",
                    flush=True,
                )
                ordered = [records_by_id[item["id"]] for item in questions]
                write_results(ordered, args.output, args.workers)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
