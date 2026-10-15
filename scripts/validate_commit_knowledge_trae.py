#!/usr/bin/env python3
"""Accept local version selection and live edits through the real Trae CLI.

All fixtures/evidence live outside the checkout. The capture wrapper forwards
the original production prompts and Trae outputs unchanged; it supplies no
expected answers and never fabricates model responses or knowledge documents.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
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


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def read_json(path):
    return json.loads(path.read_text())


def source_hashes(workspace):
    return {str(path.relative_to(workspace)): hashlib.sha256(path.read_bytes()).hexdigest()
            for path in (workspace / "checkout").rglob("*.py")}


def wrapper(args):
    prompt = sys.stdin.read()
    call_id = uuid.uuid4().hex
    root = args.evidence / "calls" / call_id
    root.mkdir(parents=True)
    (root / "prompt.txt").write_text(prompt)
    is_ask = "You are RepoBrain's local host runner for read-only codebase Q&A." in prompt
    is_route = prompt.startswith("Select the repository knowledge documents needed")
    command = [args.trae, "exec", "--json", "--ephemeral", "--sandbox", "read-only",
               "--skip-git-repo-check", "--cd", str(args.workspace), "-o", str(args.output_file)]
    if args.model:
        command += ["--model", args.model]
    if args.reasoning_effort:
        command += ["-c", f'model_reasoning_effort="{args.reasoning_effort}"']
    if is_ask:
        command += ["--output-schema", str(args.schema_file)]
    record = {"id": call_id, "phase": os.environ["RB_TRAE_ACCEPTANCE_PHASE"],
              "kind": "ask" if is_ask else "route" if is_route else "refresh", "command": command,
              "prompt_sha256": hashlib.sha256(prompt.encode()).hexdigest(),
              "started_at": datetime.now(timezone.utc).isoformat()}
    if is_ask:
        record["source_hashes_before"] = source_hashes(args.workspace)
    write_json(root / "record.json", record)
    start = time.monotonic()
    try:
        with (root / "events.jsonl").open("w") as events, (root / "stderr.txt").open("w") as errors:
            result = subprocess.run(command, input=prompt, text=True, stdout=events, stderr=errors, timeout=240)
        if args.output_file.is_file():
            answer = args.output_file.read_bytes()
            (root / "answer.txt").write_bytes(answer)
            record["answer_sha256"] = hashlib.sha256(answer).hexdigest()
        record["returncode"] = result.returncode
        sys.stdout.write((root / "events.jsonl").read_text())
        sys.stderr.write((root / "stderr.txt").read_text())
    except subprocess.TimeoutExpired as exc:
        record.update(returncode=124, error="Trae exceeded 240 seconds")
        # The stream files already contain the partial Trae output.
    finally:
        record["elapsed_seconds"] = round(time.monotonic() - start, 3)
        if is_ask:
            record["source_hashes_after"] = source_hashes(args.workspace)
        write_json(root / "record.json", record)
    return record["returncode"]


class Acceptance:
    def __init__(self, output, model=None, reasoning_effort=None):
        self.root = Path(__file__).resolve().parents[1]
        self.evidence = output.resolve()
        self.evidence.mkdir(parents=True, exist_ok=False)
        self.workspace = self.evidence / "project"
        self.workspace.mkdir()
        self.python = str(self.root / ".venv/bin/python")
        trae = shutil.which("trae-cli")
        if not trae:
            raise RuntimeError("Local trae-cli is not available")
        self.env = dict(os.environ)
        self.env.update({
            "PYTHONPATH": str(self.root / "engine"), "WORKSPACE_PATH": str(self.workspace),
            "OPENAI_API_KEY": "", "OPENAI_BASE_URL": "", "OPENAI_MODEL": "",
            "GOOGLE_API_KEY": "", "ANTHROPIC_API_KEY": "", "RB_HOST_MODEL": "",
            "RB_HOST_RUNNER": "generic", "RB_HOST_OUTPUT_MODE": "file",
            "RB_HOST_TIMEOUT_SECONDS": "250", "RB_MODULE_AGENT_TIMEOUT_SECONDS": "260",
            "RB_REFRESH_AGENT_TIMEOUT_SECONDS": "260", "RB_REFRESH_SCAN_ONLY": "0",
            "RB_REFRESH_RETRY_COUNT": "0", "RB_API_CONCURRENCY": "1",
            "RB_REFRESH_CONCURRENCY": "1", "RB_SCAN_VERBOSE": "0",
            "RB_ASK_RETRIEVAL_FIRST": "0", "DEBUG_MODE": "1",
        })
        capture = [
            self.python, str(Path(__file__).resolve()), "--wrapper", "--trae", trae,
            "--evidence", str(self.evidence), "--workspace", "{workspace}",
            "--output-file", "{output_file}", "--schema-file", "{schema_file}",
        ]
        if model:
            capture += ["--model", model]
        if reasoning_effort:
            capture += ["--reasoning-effort", reasoning_effort]
        self.env["RB_HOST_COMMAND"] = shlex.join(capture)
        self.report = {"runner": "local trae-cli", "passed": False, "evidence": str(self.evidence),
                       "workspace": str(self.workspace), "steps": [], "checks": [],
                       "requested_model": model or "user configured default",
                       "requested_reasoning_effort": reasoning_effort or "user configured default",
                       "started_at": datetime.now(timezone.utc).isoformat()}
        self.save()

    def save(self):
        write_json(self.evidence / "report.json", self.report)

    def git(self, *args):
        return subprocess.check_output(["git", *args], cwd=self.workspace, text=True).strip()

    def commit(self, message):
        self.git("add", "checkout", ".gitignore")
        self.git("commit", "-qm", message)
        return self.git("rev-parse", "HEAD")

    def pricing(self, branch, fee, discounts=False):
        imports = "from .loyalty import loyalty_discount\nfrom .coupon import coupon_discount\n" if discounts else ""
        deduction = " - loyalty_discount() - coupon_discount()" if discounts else ""
        (self.workspace / "checkout/pricing.py").write_text(
            imports + f'BRANCH = "{branch}"\nSHIPPING_FEE = {fee}\n\n'
            f'def quote_total(subtotal):\n    return subtotal + SHIPPING_FEE{deduction}\n'
        )

    def pointer(self):
        return read_json(self.workspace / ".repobrain/current.json")

    def knowledge_hashes(self):
        # Publication receipts legitimately change on explicit refresh reuse;
        # generated knowledge, snapshots and statuses must remain unchanged.
        generations = self.workspace / ".repobrain/generations"
        return {str(path.relative_to(generations)): hashlib.sha256(path.read_bytes()).hexdigest()
                for path in generations.rglob("*")
                if path.is_file() and path.name != "published.json"}

    def calls(self, phase):
        return [read_json(path) for path in (self.evidence / "calls").glob("*/record.json")
                if read_json(path)["phase"] == phase]

    def run(self, phase, operation, question=None, expected_code=0):
        command = [self.python, "-m", "repobrain_engine", operation]
        if question is not None:
            command += [question, "--json"]
        command += ["--workspace", str(self.workspace)]
        started = time.monotonic()
        result = subprocess.run(command, cwd=self.workspace,
                                env=dict(self.env, RB_TRAE_ACCEPTANCE_PHASE=phase),
                                text=True, capture_output=True, timeout=900)
        (self.evidence / f"{phase}.stdout.txt").write_text(result.stdout)
        (self.evidence / f"{phase}.stderr.txt").write_text(result.stderr)
        calls = self.calls(phase)
        step = {"phase": phase, "operation": operation, "returncode": result.returncode,
                "elapsed_seconds": round(time.monotonic() - started, 3), "trae_calls": len(calls),
                "head": self.git("rev-parse", "HEAD"), "command": command}
        self.report["steps"].append(step)
        self.save()
        print(json.dumps(step, ensure_ascii=False), flush=True)
        assert result.returncode == expected_code, f"{phase}: exit {result.returncode}; inspect saved stderr"
        assert all(call.get("returncode") == 0 and call.get("answer_sha256") for call in calls), phase
        if question is not None and expected_code == 0:
            payload = json.loads(result.stdout)
            write_json(self.evidence / f"{phase}.answer.json", payload)
            return payload
        return result

    def check(self, name, condition, **details):
        self.report["checks"].append({"name": name, "passed": bool(condition), **details})
        self.save()
        assert condition, name

    def check_answer(self, phase, payload, expected, required_sources):
        answer = payload["answer"]
        parsed = {}
        for field, wanted in expected.items():
            match = re.search(rf"\b{field}\s*[:=：]\s*[`\"']?([A-Za-z0-9_-]+)", answer)
            parsed[field] = match.group(1) if match else None
        self.check(f"{phase}: actual answer values", parsed == {k: str(v) for k, v in expected.items()},
                   expected=expected, observed=parsed)
        citations = re.findall(r"(checkout/[A-Za-z0-9_./-]+\.py):(\d+)", "\n".join(payload["sources"]))
        valid = bool(citations)
        for name, line in citations:
            path = self.workspace / name
            valid = valid and path.is_file() and 1 <= int(line) <= len(path.read_text().splitlines())
        self.check(f"{phase}: current file citations", valid and set(required_sources) <= {p for p, _ in citations},
                   citations=citations)

    def execute(self):
        (self.workspace / "checkout").mkdir()
        (self.workspace / ".gitignore").write_text(".repobrain/\n")
        (self.workspace / "checkout/legacy.py").write_text("def loyalty_discount():\n    return 2\n")
        (self.workspace / "checkout/obsolete.py").write_text("def obsolete_fee():\n    return 13\n")
        self.pricing("ROOT", 3)
        self.git("init", "-qb", "main")
        self.git("config", "user.email", "repobrain-validation@example.invalid")
        self.git("config", "user.name", "RepoBrain 验收")
        self.git("config", "core.hooksPath", str(self.workspace / ".git/no-hooks"))
        base = self.commit("初始化真实 Trae 验收项目")
        self.git("checkout", "-qb", "codex/alpha")
        self.pricing("ALPHA", 11)
        alpha = self.commit("设置甲分支运费")
        self.run("01-build-alpha", "refresh")
        alpha_pointer = self.pointer()
        self.git("checkout", "-qb", "codex/beta", base)
        self.pricing("BETA", 23)
        beta = self.commit("设置乙分支运费")
        self.run("02-build-beta", "refresh")
        beta_pointer = self.pointer()
        stable = self.knowledge_hashes()
        self.check("two distinct published branch generations", alpha_pointer["generation"] != beta_pointer["generation"])
        question = (
            "请读取当前 checkout/pricing.py，说明当前分支标识、运费以及 subtotal=100 时 quote_total 的值。"
            "answer 中按 branch=<实际字符串>; fee=<数值>; total=<数值> 列出结论。"
            "sources 请使用实际文件的 checkout/pricing.py:行号 格式。只读，不要刷新知识库。"
        )
        for phase, branch, label, fee in (("03-ask-alpha", "codex/alpha", "ALPHA", 11),
                                         ("04-ask-beta", "codex/beta", "BETA", 23),
                                         ("05-ask-alpha-again", "codex/alpha", "ALPHA", 11)):
            self.git("checkout", "-q", branch)
            payload = self.run(phase, "ask", question)
            self.check_answer(phase, payload, {"branch": label, "fee": fee, "total": 100 + fee}, ["checkout/pricing.py"])
            self.check(f"{phase}: ask preserves last refresh pointer", self.pointer() == beta_pointer)
        self.run("06-reuse-alpha", "refresh")
        self.check("alpha refresh is zero-model reuse", not self.calls("06-reuse-alpha") and self.pointer()["generation"] == alpha_pointer["generation"])
        self.git("checkout", "-q", "codex/beta")
        self.run("07-reuse-beta", "refresh")
        self.check("beta refresh is zero-model reuse", not self.calls("07-reuse-beta") and self.pointer()["generation"] == beta_pointer["generation"])
        # Explicit refresh updates the promotion timestamp even when reusing a
        # generation. Ask invariants must compare with the state after refresh.
        beta_pointer = self.pointer()
        stable = self.knowledge_hashes()
        self.git("checkout", "-q", "codex/alpha")
        self.pricing("ALPHA-LOCAL", 37)
        self.git("add", "checkout/pricing.py")
        self.git("mv", "checkout/legacy.py", "checkout/loyalty.py")
        (self.workspace / "checkout/loyalty.py").write_text("def loyalty_discount():\n    return 7\n")
        (self.workspace / "checkout/obsolete.py").unlink()
        (self.workspace / "checkout/coupon.py").write_text("def coupon_discount():\n    return 9\n")
        self.pricing("ALPHA-LOCAL", 41, discounts=True)
        dirty_status = self.git("status", "--porcelain")
        write_json(self.evidence / "dirty-worktree.json", {"status": dirty_status, "head": alpha})
        write_json(self.evidence / "before-dirty-ask.json", {
            "pointer": beta_pointer, "knowledge_hashes": stable,
            "source_hashes": source_hashes(self.workspace), "status": dirty_status,
        })
        self.env["RB_ASK_RETRIEVAL_FIRST"] = "2"
        dirty_question = (
            "请核对当前 checkout 目录的真实文件：分支标识、运费、loyalty_discount 与 coupon_discount 各是多少，"
            "subtotal=100 的 quote_total 是多少，obsolete.py 现在是否存在？必须读取新文件以及相关源码后再回答。"
            "answer 按 branch=<字符串>; fee=<数值>; loyalty=<数值>; coupon=<数值>; total=<数值>; "
            "obsolete_exists=<true或false> 列出结果；sources 使用当前存在文件的 相对路径:行号。"
            "只读，不要提交、刷新或修改文件。"
        )
        payload = self.run("08-ask-dirty", "ask", dirty_question)
        expected = {"branch": "ALPHA-LOCAL", "fee": 41, "loyalty": 7, "coupon": 9, "total": 125, "obsolete_exists": "false"}
        sources = ["checkout/pricing.py", "checkout/loyalty.py", "checkout/coupon.py"]
        self.check_answer("08-ask-dirty", payload, expected, sources)
        self.check("dirty query warns without requiring commit", "工作区有未提交修改" in payload["answer"])
        self.check("dirty source bytes remain unchanged", source_hashes(self.workspace) == read_json(self.evidence / "before-dirty-ask.json")["source_hashes"])
        self.check("dirty source status remains unchanged", self.git("status", "--porcelain") == dirty_status)
        self.check("dirty ask preserves knowledge files", self.knowledge_hashes() == stable)
        self.check("dirty ask preserves last refresh pointer", self.pointer() == beta_pointer)
        self.run("09-dirty-refresh-refused", "refresh", expected_code=1)
        self.check("dirty refresh makes no model call", not self.calls("09-dirty-refresh-refused"))
        latest = self.commit("提交边改边问验收修改")
        payload = self.run("10-ask-ancestor", "ask", dirty_question)
        self.check_answer("10-ask-ancestor", payload, expected, sources)
        self.check("new commit uses ancestor without refreshing", "之后已有新提交" in payload["answer"] and self.pointer() == beta_pointer and self.knowledge_hashes() == stable)
        self.git("checkout", "-qb", "codex/no-knowledge", base)
        self.pricing("UNINDEXED", 59)
        self.commit("建立无知识的同级分支")
        self.run("11-reject-unrelated", "ask", question, expected_code=1)
        self.check("unrelated branch never reaches Trae", not self.calls("11-reject-unrelated"))
        self.report.update(passed=True, commits={"base": base, "alpha": alpha, "beta": beta, "latest": latest},
                           finished_at=datetime.now(timezone.utc).isoformat())
        self.save()
        return self.report


def audit_evidence(evidence):
    """Independently inspect captured knowledge prompts and real file-read events."""
    report = read_json(evidence / "report.json")
    assert report["passed"], "The main acceptance has not passed"
    workspace = Path(report["workspace"])
    generations = workspace / ".repobrain/generations"
    roots = {read_json(path / "snapshot.json")["head_sha"]: path
             for path in generations.iterdir() if (path / "published.json").exists()}
    records = [(p.parent, read_json(p)) for p in (evidence / "calls").glob("*/record.json")]
    checks, reroutes, usage, dirty_reads = [], [], [], []
    expected = {"03-ask-alpha": "alpha", "04-ask-beta": "beta", "05-ask-alpha-again": "alpha",
                "08-ask-dirty": "alpha", "10-ask-ancestor": "alpha"}
    required_phases = set(expected) | {"01-build-alpha", "02-build-beta"}
    checks.append({"name": "every generation and answer phase invoked real Trae",
                   "passed": required_phases <= {r["phase"] for _, r in records}})
    for folder, record in records:
        phase = record["phase"]
        if phase in expected and record["kind"] == "route":
            root = roots[report["commits"][expected[phase]]]
            prompt = (folder / "prompt.txt").read_text()
            checks.append({"name": f"{phase}: router inventory uses selected generation",
                           "passed": f"Knowledge directory: {root}\n" in prompt})
        if phase in expected and record["kind"] == "ask":
            root = roots[report["commits"][expected[phase]]]
            docs = [p.read_text()[:25000] for p in (root / "agents").rglob("*.md")]
            prompt = (folder / "prompt.txt").read_text()
            checks.append({"name": f"{phase}: selected generation appears in real model prompt",
                           "passed": any(doc and doc in prompt for doc in docs), "generation": root.name})
            sibling_docs = [p.read_text()[:25000] for other in roots.values() if other != root
                            for p in (other / "agents").rglob("*.md")]
            checks.append({"name": f"{phase}: sibling knowledge absent from real model prompt",
                           "passed": not any(doc and doc in prompt for doc in sibling_docs)})
            checks.append({"name": f"{phase}: source bytes unchanged",
                           "passed": bool(record.get("source_hashes_before")) and
                           record["source_hashes_before"] == record.get("source_hashes_after")})
            answer = read_json(evidence / f"{phase}.answer.json")
            code_commit = report["commits"]["latest"] if phase in {"08-ask-dirty", "10-ask-ancestor"} else report["commits"][expected[phase]]
            citations = re.findall(r"(checkout/[A-Za-z0-9_./-]+\.py):(\d+)(?:-(\d+))?",
                                   "\n".join(answer["sources"]))
            valid = bool(citations)
            for name, start, end in citations:
                source = subprocess.run(["git", "show", f"{code_commit}:{name}"], cwd=workspace,
                                        capture_output=True, text=True, check=False)
                valid = valid and source.returncode == 0 and 1 <= int(start) <= int(end or start) <= len(source.stdout.splitlines())
            checks.append({"name": f"{phase}: full citation ranges match tested source commit", "passed": valid})
            if phase == "08-ask-dirty":
                checks.append({"name": "untracked coupon body absent from prompt",
                               "passed": "def coupon_discount" not in prompt and "return 9" not in prompt})
                committed_hashes = {}
                for name in record.get("source_hashes_before", {}):
                    blob = subprocess.check_output(["git", "show", f"{code_commit}:{name}"], cwd=workspace)
                    committed_hashes[name] = hashlib.sha256(blob).hexdigest()
                checks.append({"name": "dirty bytes match the later recorded source commit",
                               "passed": committed_hashes == record.get("source_hashes_before")})
        for line in (folder / "events.jsonl").read_text().splitlines():
            try:
                event = json.loads(line)
            except ValueError:
                continue
            item = event.get("item", {})
            if item.get("type") == "model_reroute":
                reroutes.append({"from": item["from_model"], "to": item["to_model"]})
            if event.get("type") == "turn.completed":
                usage.append(event.get("usage", {}))
            if phase == "08-ask-dirty" and item.get("type") == "command_execution" and item.get("status") == "completed":
                dirty_reads.append(item)
    for filename, value in (("pricing.py", "41"), ("loyalty.py", "7"), ("coupon.py", "9")):
        matches = [item for item in dirty_reads
                   if filename in json.dumps(item.get("command_actions", [])) + item.get("command", "")
                   and re.search(rf"\b{value}\b", item.get("aggregated_output", ""))]
        checks.append({"name": f"dirty ask actually read {filename} with current value", "passed": bool(matches),
                       "event_ids": [item["id"] for item in matches]})
    result = {"passed": all(check["passed"] for check in checks), "checks": checks,
              "model_reroutes": reroutes, "trae_calls": len(records), "usage_events": usage}
    write_json(evidence / "audit.json", result)
    assert result["passed"], "Evidence audit failed; inspect audit.json"
    print(json.dumps({"audit_passed": True, "checks": len(checks), "trae_calls": len(records)}, ensure_ascii=False))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path)
    parser.add_argument("--wrapper", action="store_true")
    parser.add_argument("--trae")
    parser.add_argument("--evidence", type=Path)
    parser.add_argument("--workspace", type=Path)
    parser.add_argument("--output-file", type=Path)
    parser.add_argument("--schema-file", type=Path)
    parser.add_argument("--model")
    parser.add_argument("--reasoning-effort", choices=("low", "medium", "high", "xhigh"))
    parser.add_argument("--audit", type=Path)
    args = parser.parse_args()
    if args.wrapper:
        return wrapper(args)
    if args.audit:
        audit_evidence(args.audit)
        return 0
    output = args.output or Path(tempfile.gettempdir()) / ("repobrain-trae-versions-" + uuid.uuid4().hex[:10])
    run = Acceptance(output, args.model, args.reasoning_effort)
    print(f"Evidence: {run.evidence}", flush=True)
    try:
        run.execute()
        audit_evidence(run.evidence)
    except Exception as exc:
        run.report["error"] = f"{type(exc).__name__}: {exc}"
        run.save()
        raise
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
