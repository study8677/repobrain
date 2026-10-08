#!/usr/bin/env python3
"""Exercise automatic refresh with real Trae CLI, retaining all run evidence.

Example:
    python scripts/validate_refresh_trae.py --python .venv/bin/python --output /tmp/rb-trae

This script never invokes another model runner. Faults are injected at the host
process boundary; successful model responses always come from Trae unchanged.
Fixtures and fault controls are separate, so injection cannot dirty Git state.
"""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
import time
import uuid


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def classify(prompt: str) -> tuple[str, str | None]:
    if "You are RepoBrain ImpactPlanner" in prompt:
        return "planner", None
    if "You are RepoBrain ImpactVerifier" in prompt:
        return "verifier", None
    group = re.search(r"RefreshModuleAgent analyzing the \*\*(.*?)\*\* module, group \*\*(.*?)\*\*", prompt)
    if group:
        return "module", f"{group[1]}/{group[2]}"
    if "You are a Map Agent" in prompt:
        return "map", None
    if "You are a code analyst and technical writer" in prompt:
        return "conventions", None
    raise ValueError("Unexpected host model prompt; validation will not use an unclassified runner")


def append_call(path: Path, record: dict) -> None:
    with path.open("a", encoding="utf-8") as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        handle.write(json.dumps(record, ensure_ascii=False) + "\n")
        handle.flush()
        fcntl.flock(handle, fcntl.LOCK_UN)


def wrapper_main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-file", type=Path, required=True)
    parser.add_argument("--evidence", type=Path, required=True)
    parser.add_argument("--control", type=Path, required=True)
    parser.add_argument("--trae", required=True)
    parser.add_argument("--timeout", type=int, required=True)
    args = parser.parse_args(argv)
    prompt = sys.stdin.read()
    stage, group = classify(prompt)
    call_id = uuid.uuid4().hex
    prefix = args.evidence / "calls" / call_id
    prefix.parent.mkdir(parents=True, exist_ok=True)
    prefix.with_suffix(".prompt.txt").write_text(prompt, encoding="utf-8")
    record = {
        "id": call_id, "phase": os.environ["RB_VALIDATION_PHASE"],
        "stage": stage, "group": group,
        "prompt_sha256": hashlib.sha256(prompt.encode()).hexdigest(),
        "started_at": datetime.now(timezone.utc).isoformat(),
        "injected": False, "trae_invoked": False,
        "prompt": str(prefix.with_suffix(".prompt.txt")),
    }
    # A locked control file also makes this safe if concurrency changes later.
    with args.control.open("r+", encoding="utf-8") as control_file:
        fcntl.flock(control_file, fcntl.LOCK_EX)
        control = json.load(control_file)
        if stage == "module" and group.split("/", 1)[0] == control.get("module") and control.get("remaining", 0):
            control["remaining"] -= 1
            control_file.seek(0)
            json.dump(control, control_file)
            control_file.truncate()
            record.update(injected=True, returncode=19, error="Injected nonretryable fixture failure")
        fcntl.flock(control_file, fcntl.LOCK_UN)
    if record["injected"]:
        append_call(args.evidence / "calls.jsonl", record)
        print(record["error"], file=sys.stderr)
        return 19

    instruction = (
        "按以下完整要求回答。所有输入已经预加载，不调用任何工具，不访问文件或网络。"
        "直接输出要求的 Markdown 或 JSON，不加解释，不包裹代码围栏。\n\n"
    )
    if stage in {"planner", "verifier"}:
        instruction += (
            "JSON 中 evidence 和 impact_path 都必须是字符串数组。按实际提交 diff 判断，"
            "对于改变返回值的函数，其所属组需要更新知识；使用给定 group_id，"
            "不要遗漏候选组。严格遵守下面提供的 JSON 字段。\n\n"
        )
    command = [args.trae, "exec", "--sandbox", "read-only", "--ephemeral",
               "--skip-git-repo-check", "-o", str(args.output_file)]
    record.update(trae_invoked=True, command=command)
    start = time.monotonic()
    try:
        completed = subprocess.run(command, input=instruction + prompt, text=True,
                                   capture_output=True, timeout=args.timeout)
        record["returncode"] = completed.returncode
        prefix.with_suffix(".stdout.txt").write_text(completed.stdout, encoding="utf-8")
        prefix.with_suffix(".stderr.txt").write_text(completed.stderr, encoding="utf-8")
        if args.output_file.exists():
            answer = args.output_file.read_text(encoding="utf-8")
            prefix.with_suffix(".answer.txt").write_text(answer, encoding="utf-8")
            record["answer_sha256"] = hashlib.sha256(answer.encode()).hexdigest()
        # Forward exact process diagnostics and exact Trae output, never repair it.
        sys.stdout.write(completed.stdout)
        sys.stderr.write(completed.stderr)
    except subprocess.TimeoutExpired as exc:
        record.update(returncode=124, error=f"Trae exceeded {args.timeout} seconds")
        prefix.with_suffix(".stderr.txt").write_text(str(exc), encoding="utf-8")
        print(record["error"], file=sys.stderr)
    except OSError as exc:
        record.update(returncode=126, error=str(exc))
        print(str(exc), file=sys.stderr)
    finally:
        record["elapsed_seconds"] = round(time.monotonic() - start, 3)
        append_call(args.evidence / "calls.jsonl", record)
    return record["returncode"]


class AcceptanceRun:
    def __init__(self, args):
        self.args = args
        self.repo = Path(__file__).resolve().parents[1]
        self.output = args.output.expanduser().resolve()
        self.output.mkdir(parents=True, exist_ok=True)
        self.evidence = self.output / (datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex[:8])
        self.evidence.mkdir()
        self.control = self.evidence / "fault.json"
        write_json(self.control, {})
        self.report = {"runner": "trae-cli", "repository": str(self.repo), "evidence": str(self.evidence),
                       "passed": False, "steps": [], "started_at": datetime.now(timezone.utc).isoformat()}
        # Preserve a virtualenv interpreter's symlink path: resolving it to the
        # system binary would silently lose the selected environment's packages.
        python = str(Path(args.python).expanduser().absolute()) if "/" in args.python else shutil.which(args.python)
        if not python:
            raise ValueError("The selected Python executable does not exist")
        self.python = python
        trae = shutil.which(args.trae)
        if not trae:
            raise ValueError("Trae CLI is not installed or is not on PATH")
        self.env = os.environ.copy()
        self.env.update({
            "PYTHONPATH": str(self.repo / "engine") + os.pathsep + str(self.repo / "cli/src"),
            "OPENAI_API_KEY": "", "OPENAI_BASE_URL": "", "GOOGLE_API_KEY": "", "ANTHROPIC_API_KEY": "",
            "OPENAI_MODEL": "", "RB_HOST_MODEL": "", "RB_REFRESH_SCAN_ONLY": "0",
            "RB_HOST_RUNNER": "generic", "RB_HOST_OUTPUT_MODE": "file",
            "RB_HOST_TIMEOUT_SECONDS": str(args.trae_timeout + 10),
            "RB_MODULE_AGENT_TIMEOUT_SECONDS": str(args.trae_timeout + 15),
            "RB_REFRESH_AGENT_TIMEOUT_SECONDS": str(args.trae_timeout + 15),
            "RB_API_CONCURRENCY": "1", "RB_REFRESH_CONCURRENCY": "1",
            "RB_REFRESH_RETRY_COUNT": "0", "RB_SCAN_VERBOSE": "0", "DEBUG_MODE": "1",
        })
        wrapper = [self.python, str(Path(__file__).resolve()), "--trae-wrapper", "--output-file", "{output_file}",
                   "--evidence", str(self.evidence), "--control", str(self.control), "--trae", trae,
                   "--timeout", str(args.trae_timeout)]
        self.env["RB_HOST_COMMAND"] = shlex.join(wrapper)

    def git(self, workspace: Path, *argv: str) -> str:
        result = subprocess.run(["git", "-C", str(workspace), *argv], text=True, capture_output=True, check=True)
        return result.stdout.strip()

    def commit(self, workspace: Path, message: str) -> str:
        self.git(workspace, "add", ".")
        self.git(workspace, "-c", "user.name=刷新验收", "-c", "user.email=refresh-validation@example.invalid",
                 "commit", "--quiet", "-m", message)
        return self.git(workspace, "rev-parse", "HEAD")

    def fixture(self, name: str) -> Path:
        workspace = Path(tempfile.mkdtemp(prefix=name + "-", dir=self.evidence))
        for module in ("alpha", "beta"):
            (workspace / module).mkdir()
            (workspace / module / "service.py").write_text(
                f'def {module}_value() -> str:\n    """Return the {module} public value."""\n    return "{module}-v1"\n', encoding="utf-8")
        (workspace / ".gitignore").write_text(".repobrain/\n", encoding="utf-8")
        self.git(workspace, "init", "--quiet")
        self.commit(workspace, "初始化自动刷新验收项目")
        return workspace

    def edit(self, workspace: Path, modules: tuple[str, ...], revision: str) -> None:
        for module in modules:
            source = workspace / module / "service.py"
            source.write_text(re.sub(rf'{module}-v\d+', f"{module}-{revision}", source.read_text()), encoding="utf-8")
        self.commit(workspace, "更新公开函数返回值")

    def calls(self, phase: str) -> list[dict]:
        path = self.evidence / "calls.jsonl"
        records = [json.loads(line) for line in path.read_text().splitlines()] if path.exists() else []
        return [record for record in records if record["phase"] == phase]

    def refresh(self, phase: str, workspace: Path, *, full=False, success=True) -> list[dict]:
        command = [self.python, "-m", "repobrain_engine", "refresh"]
        if full:
            command.append("--full")
        started = time.monotonic()
        environment = dict(self.env, WORKSPACE_PATH=str(workspace), RB_VALIDATION_PHASE=phase)
        completed = subprocess.run(command, cwd=workspace, env=environment, text=True,
                                   capture_output=True, timeout=self.args.timeout)
        stdout, stderr = self.evidence / f"{phase}.stdout.txt", self.evidence / f"{phase}.stderr.txt"
        stdout.write_text(completed.stdout, encoding="utf-8")
        stderr.write_text(completed.stderr, encoding="utf-8")
        calls = self.calls(phase)
        self.report["steps"].append({"phase": phase, "workspace": str(workspace), "command": command,
                                     "returncode": completed.returncode,
                                     "elapsed_seconds": round(time.monotonic() - started, 3),
                                     "stdout": str(stdout), "stderr": str(stderr),
                                     "trae_calls": sum(call["trae_invoked"] for call in calls),
                                     "stages": dict(Counter(call["stage"] for call in calls))})
        self.save()
        assert (completed.returncode == 0) == success, f"{phase}: unexpected exit {completed.returncode}; see {stderr}"
        assert self.git(workspace, "status", "--porcelain") == "", f"{phase}: fixture became dirty"
        return calls

    def active(self, workspace: Path) -> tuple[dict, Path, dict]:
        pointer = read_json(workspace / ".repobrain/current.json")
        assert pointer["head_sha"] == self.git(workspace, "rev-parse", "HEAD")
        root = workspace / ".repobrain/generations" / pointer["generation"]
        snapshot = read_json(root / "snapshot.json")
        assert snapshot["head_sha"] == pointer["head_sha"]
        status = read_json(root / "status.json")
        assert status["overall_status"] == "success"
        assert status["target_head"] == pointer["head_sha"]
        for name in ("conventions.md", "structure.md", "knowledge_graph.json", "map.md", "modules/_git_insights.md"):
            assert (root / name).read_text().strip(), f"Missing artifact: {name}"
        for group in snapshot["groups"].values():
            document = (root / group["artifact_path"]).read_text()
            assert document.strip()
            assert "<!-- rb:status=fallback -->" not in document
            assert "(Auto-generated fallback — LLM analysis was unavailable)" not in document
        if (root / "execution.json").exists():
            journal = read_json(root / "execution.json")["group_states"]
            for group_id, item in journal.items():
                assert item["state"] == "success", f"Unfinished journal group: {group_id}"
                group = snapshot["groups"].get(group_id)
                if group is not None:
                    digest = hashlib.sha256((root / group["artifact_path"]).read_bytes()).hexdigest()
                    assert item["digest"] == digest, f"Journal digest mismatch: {group_id}"
        assert not (root / "resume.json").exists()
        return pointer, root, snapshot

    def candidate(self, workspace: Path) -> Path:
        candidates = list((workspace / ".repobrain/generations").glob("*/resume.json"))
        assert len(candidates) == 1, "Expected one interrupted generation"
        return candidates[0].parent

    def save(self):
        write_json(self.evidence / "report.json", self.report)
        write_json(self.output / "report.json", self.report)

    def execute(self):
        workspace = self.fixture("ordinary")
        calls = self.refresh("01-initial", workspace)
        assert {call["group"].split("/", 1)[0] for call in calls if call["stage"] == "module"} == {"alpha", "beta"}
        assert all(call["trae_invoked"] and call.get("answer_sha256") for call in calls)
        pointer, root, snapshot = self.active(workspace)
        assert read_json(root / "status.json")["mode"] == "full"
        beta = next(entry for entry in snapshot["groups"].values() if entry["module"] == "beta")
        beta_content = (root / beta["artifact_path"]).read_bytes()
        assert not self.refresh("02-noop", workspace), "No-op invoked a host model"
        assert read_json(workspace / ".repobrain/current.json") == pointer
        self.edit(workspace, ("alpha",), "v2")
        calls = self.refresh("03-incremental", workspace)
        new_pointer, root, _ = self.active(workspace)
        assert new_pointer["generation"] != pointer["generation"]
        assert read_json(root / "status.json")["mode"] == "incremental"
        assert (root / beta["artifact_path"]).read_bytes() == beta_content
        assert {call["stage"] for call in calls} >= {"planner", "verifier", "module"}
        assert all(call["group"].startswith("alpha/") for call in calls if call["stage"] == "module")
        journal = read_json(root / "execution.json")["group_states"]
        assert journal and all(item["state"] == "success" and item["digest"] for item in journal.values())
        calls = self.refresh("04-force-full", workspace, full=True)
        assert {call["group"].split("/", 1)[0] for call in calls if call["stage"] == "module"} == {"alpha", "beta"}
        assert {call["stage"] for call in calls} >= {"conventions", "map", "module"}
        forced_pointer, root, _ = self.active(workspace)
        assert forced_pointer["generation"] != new_pointer["generation"]
        assert read_json(root / "status.json")["mode"] == "full"

        workspace = self.fixture("recovery")
        write_json(self.control, {"module": "beta", "remaining": 1})
        calls = self.refresh("05-full-failure", workspace, success=False)
        assert any(call["injected"] for call in calls)
        assert not (workspace / ".repobrain/current.json").exists()
        candidate = self.candidate(workspace)
        progress = read_json(candidate / "status.json")
        assert any(key.startswith("alpha/") and value == "success" for key, value in progress["groups"].items())
        calls = self.refresh("06-full-resume", workspace)
        pointer, root, _ = self.active(workspace)
        assert root == candidate and read_json(root / "status.json")["resumed"]
        assert [call["stage"] for call in calls] == ["module"]
        assert all(call["group"].startswith("beta/") for call in calls)

        self.edit(workspace, ("alpha", "beta"), "v2")
        write_json(self.control, {"module": "beta", "remaining": 1})
        calls = self.refresh("07-incremental-failure", workspace, success=False)
        assert any(call["injected"] for call in calls)
        assert read_json(workspace / ".repobrain/current.json") == pointer
        candidate = self.candidate(workspace)
        journal = read_json(candidate / "execution.json")["group_states"]
        assert any(item["state"] == "success" and item["digest"] for item in journal.values())
        assert any(item["state"] == "failed" for item in journal.values())
        calls = self.refresh("08-incremental-resume", workspace)
        _, root, _ = self.active(workspace)
        assert root == candidate and read_json(root / "status.json")["resumed"]
        assert [call["stage"] for call in calls] == ["module"]
        assert all(call["group"].startswith("beta/") for call in calls)
        journal = read_json(root / "execution.json")["group_states"]
        assert all(item["state"] == "success" and item["digest"] for item in journal.values())
        self.report.update(passed=True, finished_at=datetime.now(timezone.utc).isoformat())
        self.save()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--python", default=sys.executable)
    parser.add_argument("--trae", default="trae-cli")
    parser.add_argument("--timeout", type=int, default=1800, help="Seconds allowed per engine command")
    parser.add_argument("--trae-timeout", type=int, default=300, help="Seconds allowed per Trae call")
    args = parser.parse_args()
    run = AcceptanceRun(args)
    try:
        run.execute()
    except Exception as exc:
        run.report.update(error=f"{type(exc).__name__}: {exc}", finished_at=datetime.now(timezone.utc).isoformat())
        run.save()
        print(json.dumps(run.report, ensure_ascii=False, indent=2))
        return 1
    print(json.dumps(run.report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    if sys.argv[1:2] == ["--trae-wrapper"]:
        raise SystemExit(wrapper_main(sys.argv[2:]))
    raise SystemExit(main())
