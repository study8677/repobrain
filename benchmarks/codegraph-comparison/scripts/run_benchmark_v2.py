#!/usr/bin/env python3
"""Run manifest-driven RepoBrain/CodeGraph native benchmark repetitions."""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path

from benchmark_v2_common import (
    BENCH_ROOT,
    RESULTS_ROOT,
    artifact_dir,
    atomic_write_json,
    load_manifest,
    load_questions,
    normalize_answer_payload,
    normalize_answer_text,
    question_files,
    repository_corpus_paths,
    resolve_path,
    safe_name,
    selected_repositories,
)


PRODUCTS = ("repobrain", "codegraph")
TRACKS = ("unrestricted_native", "source_free")
DEFAULT_MANIFEST = BENCH_ROOT / "config" / "manifest-latest-v2.json"


def unavailable(reason: str) -> dict:
    return {"status": "unavailable", "reason": reason}


def unavailable_metrics(reason: str) -> dict:
    return {
        "usage": unavailable(reason),
        "cost": {
            **unavailable(reason),
            "currency": "USD",
            "amount": None,
        },
    }


def parse_json_payload(text: str) -> dict:
    stripped = text.strip()
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        start, end = stripped.find("{"), stripped.rfind("}")
        if start < 0 or end <= start:
            raise
        return json.loads(stripped[start : end + 1])


def _source_mentions_expected_path(source: object, expected_path: str) -> bool:
    if not isinstance(source, str):
        return False
    value = source.strip().strip("`")
    suffix = rf"(?:$|:\d+(?::\d+)?(?:$|[\s(])|[\s(])"
    return re.match(rf"^(?:\./)?{re.escape(expected_path)}{suffix}", value) is not None


def _mentions_identifier(text: str, identifier: str) -> bool:
    boundary = r"[A-Za-z0-9_$]"
    return re.search(
        rf"(?<!{boundary}){re.escape(identifier)}(?!{boundary})", text
    ) is not None


def score(
    answer: str, sources: list[object], question: dict, workspace: Path
) -> dict:
    files = {}
    for item in question["expected_files"]:
        expected = Path(item)
        safe_relative_path = (
            not expected.is_absolute()
            and expected != Path(".")
            and ".." not in expected.parts
        )
        files[item] = (
            safe_relative_path
            and (workspace / expected).is_file()
            and any(_source_mentions_expected_path(source, item) for source in sources)
        )
    symbol_text = "\n".join([answer, *map(str, sources)])
    symbols = {
        item: _mentions_identifier(symbol_text, item)
        for item in question["expected_symbols"]
    }
    found = sum(files.values()) + sum(symbols.values())
    total = len(files) + len(symbols)
    return {
        "files": files,
        "symbols": symbols,
        "found": found,
        "total": total,
        "recall": found / total if total else 1.0,
        "metric": "evidence_mention_recall",
    }


def run_command(
    command: list[str], *, env: dict | None = None, timeout: float
) -> tuple[float, subprocess.CompletedProcess]:
    started = time.perf_counter()
    try:
        completed = subprocess.run(
            command,
            cwd=BENCH_ROOT,
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
            command, 124, stdout, f"{stderr}\nTimed out after {timeout:g}s."
        )
    return time.perf_counter() - started, completed


def result_payload(
    completed: subprocess.CompletedProcess,
    seconds: float,
    question: dict,
    payload: dict,
    *,
    source_access: bool,
    workspace: Path,
) -> dict:
    payload = normalize_answer_payload(payload)
    answer = payload["answer"]
    sources = payload["sources"]
    result = {
        "status": "success" if completed.returncode == 0 and answer else "failed",
        "returncode": completed.returncode,
        "seconds": seconds,
        "answer": answer,
        "sources": sources,
        "limitations": payload["limitations"],
        "score": score(answer, sources, question, workspace),
        "source_access": source_access,
    }
    result.update(
        unavailable_metrics(
            "The product runner did not expose Trae usage or monetary cost."
        )
    )
    return result


TOKEN_FIELDS = (
    "input_tokens",
    "cache_creation_input_tokens",
    "cached_input_tokens",
    "output_tokens",
    "reasoning_output_tokens",
)


def _numeric(value: object) -> int | float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return value


def parse_trae_metrics(text: str, requested_model: str) -> dict:
    """Extract additive turn usage and any explicitly reported USD cost."""
    usage_totals = {field: 0 for field in TOKEN_FIELDS}
    usage_events = 0
    costs = []
    routes = set()
    observed_models = set()
    for line in text.splitlines():
        try:
            event = json.loads(line)
        except (json.JSONDecodeError, TypeError):
            warning = re.search(r"server_model=([^\s]+)", line)
            if warning:
                served = warning.group(1)
                observed_models.add(served)
                requested = re.search(r"requested_model=([^\s]+)", line)
                if requested:
                    routes.add(f"{requested.group(1)} -> {served}")
            continue
        if not isinstance(event, dict):
            continue
        item = event.get("item")
        item = item if isinstance(item, dict) else {}
        if item.get("type") == "model_reroute":
            source = item.get("from_model")
            target = item.get("to_model")
            if source and target:
                routes.add(f"{source} -> {target}")
                observed_models.add(str(target))
        usage = event.get("usage")
        if event.get("type") == "turn.completed" and isinstance(usage, dict):
            usage_events += 1
            for field in TOKEN_FIELDS:
                value = _numeric(usage.get(field))
                if value is not None:
                    usage_totals[field] += value
        reported_cost = None
        for container in (event, usage if isinstance(usage, dict) else {}):
            for key in ("total_cost_usd", "cost_usd"):
                value = _numeric(container.get(key))
                if value is not None:
                    reported_cost = float(value)
                    break
            if reported_cost is not None:
                break
        if reported_cost is not None:
            costs.append(reported_cost)
        for key in ("server_model", "model"):
            value = event.get(key)
            if isinstance(value, str) and value:
                observed_models.add(value)

    if usage_events:
        usage_result = {
            "status": "available",
            "source": "trae_jsonl.turn.completed",
            "turns": usage_events,
            **usage_totals,
            "total_tokens": usage_totals["input_tokens"]
            + usage_totals["output_tokens"],
        }
    else:
        usage_result = unavailable(
            "Trae JSONL did not report turn.completed usage."
        )
    if costs:
        cost_result = {
            "status": "available",
            "source": "trae_jsonl",
            "currency": "USD",
            "amount": sum(costs),
        }
    else:
        cost_result = {
            **unavailable("Trae JSONL did not report monetary cost."),
            "currency": "USD",
            "amount": None,
        }
    return {
        "usage": usage_result,
        "cost": cost_result,
        "model": {
            "requested": requested_model,
            "observed": sorted(observed_models),
            "routes": sorted(routes),
            "observed_status": (
                "available" if observed_models else "unavailable"
            ),
        },
    }


SOURCE_READ_COMMAND = re.compile(
    r"(?:^|\s)(?:cat|bat|sed|awk|grep|rg|less|more|head|tail)\s+"
)
PYTHON_SOURCE_READ = re.compile(
    r"(?:python\d*|python)\s+.*(?:open\s*\(|read_text\s*\(|read_bytes\s*\()"
)


def is_direct_source_read(command: str) -> bool:
    """Detect direct source reads while allowing CodeGraph output filtering."""
    for segment in re.split(r"(?:&&|\|\||;|\n)", command):
        if "codegraph" in segment:
            continue
        if SOURCE_READ_COMMAND.search(segment) or PYTHON_SOURCE_READ.search(segment):
            return True
    return False


def audit_codegraph_events(text: str) -> dict:
    commands = []
    reroutes = set()
    for line in text.splitlines():
        if '"type":"model_reroute"' in line:
            source = re.search(r'"from_model":"([^"]+)"', line)
            target = re.search(r'"to_model":"([^"]+)"', line)
            if source and target:
                reroutes.add(f"{source.group(1)} -> {target.group(1)}")
        if '"type":"item.completed"' in line and '"type":"command_execution"' in line:
            try:
                event = json.loads(line)
                command = event.get("item", {}).get("command", "")
            except (json.JSONDecodeError, AttributeError):
                command = line.split('"aggregated_output"', 1)[0]
            commands.append(str(command))
    codegraph_commands = sum(is_codegraph_command(command) for command in commands)
    return {
        "commands": len(commands),
        "codegraph_commands": codegraph_commands,
        "non_codegraph_commands": len(commands) - codegraph_commands,
        "direct_source_read_commands": sum(
            is_direct_source_read(command) for command in commands
        ),
        "model_reroutes": sorted(reroutes),
    }


def is_codegraph_command(command: str) -> bool:
    """Recognize an actual CodeGraph CLI invocation, not a path containing its name."""
    return bool(
        re.search(
            r"(?:^|[;&|]\s*|\s)(?:[^\s;&|]*/)?codegraph"
            r"(?=\s+(?:query|explore|context|node|files|callers|callees|impact|"
            r"affected|status|init|index|sync|--help|-h|--version|-V)\b|\s*$)",
            command,
        )
    )


def enforce_codegraph_protocol(result: dict, audit: dict, track: str) -> dict:
    """Turn prompt-only retrieval rules into an explicit benchmark verdict."""
    violations = []
    if audit["codegraph_commands"] == 0:
        violations.append("No CodeGraph CLI command was observed.")
    if track == "source_free" and audit["direct_source_read_commands"]:
        violations.append(
            "Direct source-reading shell commands observed in source-free track: "
            f"{audit['direct_source_read_commands']}"
        )
    result["audit"] = audit
    if violations:
        result["status"] = "protocol_violation"
        result["limitations"] = [*result.get("limitations", []), *violations]
    return result


def run_repobrain(
    question: dict,
    workspace: Path,
    output_dir: Path,
    rb_ask: Path,
    model: str,
    timeout: float,
    source_access: bool,
    host_command: str | None = None,
) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    events_path = output_dir / f"{question['id']}.events.jsonl"
    base_command = host_command or (
        f"trae-cli exec -m {model} --cd {{workspace}} --sandbox read-only "
        "--skip-git-repo-check --ephemeral -o {output_file}"
    )
    command_tokens = shlex.split(base_command)
    if "--json" not in command_tokens:
        command_tokens.append("--json")
    if "--output-schema" not in command_tokens:
        command_tokens.extend(["--output-schema", "{schema_file}"])
    capture_wrapper = Path(__file__).with_name("capture_trae_jsonl.py")
    captured_command = shlex.join(
        [
            sys.executable,
            str(capture_wrapper),
            "--events",
            str(events_path),
            "--timeout",
            str(max(1.0, timeout - 5.0)),
            "--",
            *command_tokens,
        ]
    )
    env = os.environ.copy()
    env.update(
        {
            "RB_HOST_RUNNER": "generic",
            "RB_HOST_COMMAND": captured_command,
            "RB_HOST_OUTPUT_MODE": "file",
            "RB_HOST_TIMEOUT_SECONDS": str(int(timeout)),
        }
    )
    seconds, completed = run_command(
        [str(rb_ask), "--json", "--workspace", str(workspace), question["prompt"]],
        env=env,
        timeout=timeout,
    )
    (output_dir / f"{question['id']}.log").write_text(
        f"STDOUT\n{completed.stdout}\nSTDERR\n{completed.stderr}", encoding="utf-8"
    )
    payload = {}
    if completed.returncode == 0:
        try:
            payload = parse_json_payload(completed.stdout)
        except (json.JSONDecodeError, TypeError):
            payload = {"limitations": ["RepoBrain returned invalid JSON"]}
    result = result_payload(
        completed, seconds, question, payload,
        source_access=source_access, workspace=workspace,
    )
    if events_path.is_file():
        result.update(
            parse_trae_metrics(
                events_path.read_text(encoding="utf-8", errors="replace"),
                model,
            )
        )
    return result


def codegraph_prompt(
    question: dict,
    workspace: Path,
    codegraph_bin: Path,
    source_access: bool,
) -> str:
    access = (
        "Use CodeGraph as the primary discovery tool and invoke it at least once. "
        "You may directly inspect repository source files for verification as needed. "
        "Choose the best native workflow and do not modify source files."
        if source_access
        else (
            "Obtain repository evidence through CodeGraph only; do not directly "
            "read source files."
        )
    )
    return f"""You are answering one repository question for a controlled benchmark.

The CodeGraph CLI available to you is:
{codegraph_bin}

The indexed project is:
{workspace}

{access}

Use -p {workspace} after the subcommand. Set CODEGRAPH_TELEMETRY=0,
CODEGRAPH_NO_UPDATE_CHECK=1, CODEGRAPH_NO_DAEMON=1, and NO_COLOR=1 for every
CodeGraph command. There is no command-count limit. Continue until you have the
evidence needed for the most accurate final answer.

Question:
{question['prompt']}

Return JSON matching the supplied schema. Put the grounded explanation in
"answer", cited paths in "sources", and caveats in "limitations".
"""


def run_codegraph(
    question: dict,
    indexed_workspace: Path,
    control_workspace: Path,
    output_dir: Path,
    schema_path: Path,
    codegraph_bin: Path,
    model: str,
    timeout: float,
    track: str,
    source_access: bool,
) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    if source_access:
        control_workspace = indexed_workspace
    else:
        control_workspace.mkdir(parents=True, exist_ok=True)
        shutil.copytree(
            indexed_workspace / ".codegraph",
            control_workspace / ".codegraph",
            dirs_exist_ok=True,
        )
    answer_path = output_dir / f"{question['id']}.answer.json"
    answer_path.unlink(missing_ok=True)
    seconds, completed = run_command(
        [
            "trae-cli", "exec", "-m", model,
            "--cd", str(control_workspace),
            "--sandbox", "read-only",
            "--skip-git-repo-check", "--ephemeral", "--json",
            "--shell-tool-timeout", "120s",
            "--output-schema", str(schema_path),
            "-o", str(answer_path),
            codegraph_prompt(
                question, control_workspace, codegraph_bin, source_access
            ),
        ],
        timeout=timeout,
    )
    event_text = f"{completed.stdout}\n{completed.stderr}"
    (output_dir / f"{question['id']}.events.jsonl").write_text(
        event_text, encoding="utf-8"
    )
    payload = {}
    if completed.returncode == 0 and answer_path.is_file():
        payload, _ = normalize_answer_text(
            answer_path.read_text(encoding="utf-8", errors="replace")
        )
    result = result_payload(
        completed, seconds, question, payload,
        source_access=source_access, workspace=indexed_workspace,
    )
    result.update(parse_trae_metrics(event_text, model))
    return enforce_codegraph_protocol(
        result, audit_codegraph_events(event_text), track
    )


def failed_result(question: dict, workspace: Path, exc: Exception) -> dict:
    result = {
        "status": "failed",
        "returncode": 1,
        "seconds": None,
        "answer": "",
        "sources": [],
        "limitations": [f"{type(exc).__name__}: {exc}"],
        "score": score("", [], question, workspace),
    }
    result.update(
        unavailable_metrics(
            "The benchmark job failed before metrics were captured."
        )
    )
    return result


def missing_prerequisite_result(
    question: dict,
    workspace: Path,
    marker: str,
    build_log: Path,
) -> dict:
    """Return an auditable non-attempt when a product index is unavailable."""
    reason = (
        f"Missing prerequisite {marker} corpus in {workspace}. "
        f"Build log: {build_log}"
    )
    result = {
        "status": "unavailable",
        "returncode": None,
        "seconds": None,
        "answer": "",
        "sources": [],
        "limitations": [reason],
        "score": score("", [], question, workspace),
    }
    result.update(unavailable_metrics(reason))
    return result


def validate_product_prerequisite(
    product: str,
    workspace: Path,
    expected_revision: str,
) -> tuple[bool, str]:
    """Validate that a product has a complete, queryable pinned index."""
    if product == "codegraph":
        index = workspace / ".codegraph"
        if not index.is_dir():
            return False, f"missing .codegraph directory in {workspace}"
        if not any(index.iterdir()):
            return False, f"empty .codegraph corpus in {workspace}"
        return True, ""

    root = workspace / ".repobrain"
    current_path = root / "current.json"
    if not current_path.is_file():
        return False, f"missing .repobrain/current.json in {workspace}"
    try:
        current = json.loads(current_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        return False, f"invalid .repobrain/current.json in {workspace}: {exc}"
    if not isinstance(current, dict):
        return False, f"invalid .repobrain/current.json object in {workspace}"
    observed_head = current.get("head_sha")
    if observed_head != expected_revision:
        return False, (
            "RepoBrain current head mismatch in "
            f"{workspace}: expected {expected_revision}, observed {observed_head}"
        )
    generation = current.get("generation")
    if (
        not isinstance(generation, str)
        or not generation
        or Path(generation).name != generation
    ):
        return False, f"invalid RepoBrain generation pointer in {current_path}"
    generation_root = root / "generations" / generation
    if not generation_root.is_dir():
        return False, f"missing RepoBrain generation directory: {generation_root}"
    return True, ""


def add_run_metadata(result: dict, item: dict, args: argparse.Namespace) -> dict:
    result.update(
        {
            "schema_version": 2,
            "run_id": args.run_id,
            "track": args.track,
            "source_access": args.track == "unrestricted_native",
            "repository": item["repository"],
            "repeat": item["repeat"],
            "product": item["product"],
            "question_id": item["question"]["id"],
        }
    )
    return result


def build_plan(args: argparse.Namespace, manifest: dict) -> list[dict]:
    manifest_track = "fair_e2e" if args.track == "source_free" else args.track
    repositories = selected_repositories(
        manifest, args.repository, manifest_track
    )
    questions = load_questions(question_files(manifest, args.questions))
    if args.limit is not None:
        per_repo_seen: dict[str, int] = {}
        limited = []
        for question in questions:
            seen = per_repo_seen.get(question["repository"], 0)
            if question["repository"] in repositories and seen < args.limit:
                limited.append(question)
                per_repo_seen[question["repository"]] = seen + 1
        questions = limited
    products = PRODUCTS if args.product == "all" else (args.product,)
    plan = []
    for repository in repositories:
        config = manifest["repositories"][repository]
        if args.track == "unrestricted_native":
            work_root = resolve_path(manifest["artifacts"]["work_root"])
            rb_workspace = work_root / "worktrees" / f"{repository}-repobrain"
            cg_workspace = work_root / "worktrees" / f"{repository}-codegraph"
        else:
            rb_workspace, cg_workspace = repository_corpus_paths(
                args.manifest, repository, config
            )
        repository_questions = [
            question for question in questions if question["repository"] == repository
        ]
        if not repository_questions:
            raise ValueError(f"no questions found for repository {repository!r}")
        for repeat in range(1, args.repeat + 1):
            for question in repository_questions:
                for product in products:
                    output_dir = artifact_dir(
                        args.run_id, repository, repeat, product, args.track
                    )
                    plan.append(
                        {
                            "repository": repository,
                            "repeat": repeat,
                            "question": question,
                            "product": product,
                            "track": args.track,
                            "source_access": args.track == "unrestricted_native",
                            "workspace": rb_workspace if product == "repobrain" else cg_workspace,
                            "output_dir": output_dir,
                            "result_path": output_dir / f"{question['id']}.json",
                        }
                    )
    return plan


def write_summary(args: argparse.Namespace, manifest: dict, plan: list[dict]) -> Path:
    records = []
    for item in plan:
        result = None
        if item["result_path"].is_file():
            result = json.loads(item["result_path"].read_text(encoding="utf-8"))
        records.append(
            {
                "repository": item["repository"],
                "repeat": item["repeat"],
                "question_id": item["question"]["id"],
                "product": item["product"],
                "track": item["track"],
                "source_access": item["source_access"],
                "artifact": str(
                    item["result_path"].relative_to(
                        RESULTS_ROOT / args.run_id / args.track
                    )
                ),
                "result": result,
            }
        )
    output = RESULTS_ROOT / args.run_id / args.track / "results.json"
    answer_model = manifest.get("tools", {}).get("answer_model", {})
    selected = sorted({item["repository"] for item in plan})
    atomic_write_json(
        output,
        {
            "schema_version": 2,
            "run_id": args.run_id,
            "track": args.track,
            "source_access": args.track == "unrestricted_native",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "manifest": str(args.manifest.resolve()),
            "model": answer_model.get("requested_model") or args.model,
            "tools": manifest.get("tools", {}),
            "repositories": {
                name: manifest["repositories"][name] for name in selected
            },
            "repeat_count": args.repeat,
            "concurrency": args.workers,
            "records": records,
        },
    )
    return output


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--questions", type=Path, action="append")
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--repository", action="append")
    parser.add_argument("--repeat", type=int, default=1)
    parser.add_argument("--product", choices=("all", *PRODUCTS), default="all")
    parser.add_argument("--track", choices=TRACKS, default="unrestricted_native")
    parser.add_argument("--model", default="Seed-2.1-Turbo")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--timeout", type=float, default=600)
    parser.add_argument("--workers", type=int, default=1)
    parser.add_argument("--restart", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    try:
        safe_name(args.run_id, "run id")
    except ValueError as exc:
        parser.error(str(exc))
    if args.repeat < 1 or args.workers < 1:
        parser.error("--repeat and --workers must be at least 1")
    if args.limit is not None and args.limit < 1:
        parser.error("--limit must be at least 1")
    manifest = load_manifest(args.manifest)
    answer_model = manifest.get("tools", {}).get("answer_model", {})
    model = str(answer_model.get("requested_model") or args.model)
    host_command = answer_model.get("repobrain_host_command")
    work_root = resolve_path(
        manifest.get("artifacts", {}).get("work_root") or ".work/v2"
    )
    rb_ask = work_root / "tools" / "repobrain-venv" / "bin" / "rb-ask"
    codegraph_bin = (
        work_root / "tools" / "codegraph-runtime" / "node_modules" / ".bin"
        / "codegraph"
    )
    if args.timeout == parser.get_default("timeout"):
        args.timeout = float(answer_model.get("timeout_seconds") or args.timeout)
    plan = build_plan(args, manifest)
    if args.dry_run:
        printable_plan = []
        for item in plan:
            printable = {
                key: str(value) if isinstance(value, Path) else value
                for key, value in item.items()
                if key != "question"
            }
            printable["question_id"] = item["question"]["id"]
            printable_plan.append(printable)
        print(json.dumps(printable_plan, ensure_ascii=False, indent=2))
        return 0

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
    runnable = []
    for item in plan:
        if args.restart or not item["result_path"].is_file():
            runnable.append(item)
            continue
        previous = json.loads(item["result_path"].read_text(encoding="utf-8"))
        if previous.get("status") != "success":
            runnable.append(item)
    available_runnable = []
    for item in runnable:
        workspace = item["workspace"]
        marker = ".repobrain" if item["product"] == "repobrain" else ".codegraph"
        repository_config = manifest["repositories"][item["repository"]]
        prerequisite_ok, prerequisite_reason = validate_product_prerequisite(
            item["product"], workspace, repository_config["revision"]
        )
        if not prerequisite_ok:
            build_log = (
                work_root / "build-logs" / item["repository"]
                / f"{item['product']}.stderr"
            )
            result = missing_prerequisite_result(
                item["question"], workspace,
                f"{marker} ({prerequisite_reason})", build_log,
            )
            add_run_metadata(result, item, args)
            atomic_write_json(item["result_path"], result)
            continue
        available_runnable.append(item)
    runnable = available_runnable
    if any(item["product"] == "repobrain" for item in runnable) and not rb_ask.is_file():
        raise FileNotFoundError(f"missing RepoBrain runner: {rb_ask}")
    if any(item["product"] == "codegraph" for item in runnable) and not codegraph_bin.is_file():
        raise FileNotFoundError(f"missing CodeGraph runner: {codegraph_bin}")

    with tempfile.TemporaryDirectory(prefix="repobrain-benchmark-v2-") as temporary:
        schema_path = Path(temporary) / "answer.schema.json"
        schema_path.write_text(json.dumps(schema), encoding="utf-8")
        jobs = {}
        with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
            for item in runnable:
                question = item["question"]
                if item["product"] == "repobrain":
                    future = executor.submit(
                        run_repobrain, question, item["workspace"], item["output_dir"],
                        rb_ask, model, args.timeout,
                        args.track == "unrestricted_native", host_command
                    )
                else:
                    if args.track == "unrestricted_native":
                        control = item["workspace"]
                    else:
                        control = (
                            work_root / "runs" / args.run_id / args.track
                            / item["repository"] / f"repeat-{item['repeat']:03d}"
                            / "codegraph-control" / question["id"]
                        )
                    future = executor.submit(
                        run_codegraph, question, item["workspace"], control,
                        item["output_dir"], schema_path, codegraph_bin, model,
                        args.timeout, args.track,
                        args.track == "unrestricted_native"
                    )
                jobs[future] = item
            for completed_count, future in enumerate(concurrent.futures.as_completed(jobs), 1):
                item = jobs[future]
                try:
                    result = future.result()
                except Exception as exc:
                    result = failed_result(item["question"], item["workspace"], exc)
                add_run_metadata(result, item, args)
                atomic_write_json(item["result_path"], result)
                score_info = result["score"]
                print(
                    f"[{completed_count}/{len(jobs)}] {item['repository']} "
                    f"repeat-{item['repeat']:03d} {item['question']['id']} "
                    f"{item['product']} {result['status']} "
                    f"{score_info['found']}/{score_info['total']}",
                    flush=True,
                )
                write_summary(args, manifest, plan)
    output = write_summary(args, manifest, plan)
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
