#!/usr/bin/env python3
"""Score and tabulate the three answer sets.

The scoring rubric is documented in REPORT.md §4 (Methodology).
This script does NOT itself judge accuracy — it just composes the
human-graded scores into a markdown table. Grades come from
/tmp/ag-bench/answers/_meta/grades.json which is filled in by the
benchmark runner (Claude) reading source.
"""
from __future__ import annotations
import json, os, pathlib, sys

ROOT = pathlib.Path("/tmp/ag-bench")
QFILE = ROOT / "questions.json"
GFILE = ROOT / "answers" / "_meta" / "grades.json"
META = ROOT / "answers" / "_meta"
TOOLS = ["antigravity", "codex", "claude"]
AXES = ["accuracy", "citations", "depth", "verify"]


def load_grades():
    if not GFILE.exists():
        return {}
    return json.loads(GFILE.read_text())


def load_time(qid: str, tool: str) -> str:
    suffix = {"codex": "codex.time", "claude": "claude.time", "antigravity": "ag.time"}[tool]
    f = META / f"{qid}.{suffix}"
    if f.exists():
        try:
            return f"{int(f.read_text().strip())}s"
        except ValueError:
            return "?"
    return "—"


def main():
    questions = json.loads(QFILE.read_text())
    grades = load_grades()
    rows = []
    rows.append("| qid | type | tool | acc | cit | dep | ver | sum | latency |")
    rows.append("|-----|------|------|----:|----:|----:|----:|----:|--------:|")
    totals = {t: {a: 0 for a in AXES} | {"n": 0} for t in TOOLS}
    for repo, qs in questions.items():
        for q in qs:
            qid = q["id"]
            qtype = q["type"]
            for tool in TOOLS:
                g = grades.get(qid, {}).get(tool, {})
                a = g.get("accuracy", "—")
                c = g.get("citations", "—")
                d = g.get("depth", "—")
                v = g.get("verify", "—")
                summed = sum(x for x in [a, c, d, v] if isinstance(x, int))
                if all(isinstance(g.get(k), int) for k in AXES):
                    totals[tool]["n"] += 1
                    for k in AXES:
                        totals[tool][k] += g[k]
                rows.append(
                    f"| {qid} | {qtype} | {tool} | {a} | {c} | {d} | {v} | {summed} | {load_time(qid, tool)} |"
                )
    rows.append("")
    rows.append("### Aggregate (mean per tool, ungraded rows excluded)")
    rows.append("")
    rows.append("| tool | n | accuracy | citations | depth | verify | total |")
    rows.append("|------|--:|---------:|----------:|------:|-------:|------:|")
    for tool in TOOLS:
        t = totals[tool]
        n = t["n"]
        if n == 0:
            rows.append(f"| {tool} | 0 | — | — | — | — | — |")
            continue
        ac = t["accuracy"] / n
        ci = t["citations"] / n
        de = t["depth"] / n
        ve = t["verify"] / n
        rows.append(f"| {tool} | {n} | {ac:.2f} | {ci:.2f} | {de:.2f} | {ve:.2f} | {ac+ci+de+ve:.2f} |")
    print("\n".join(rows))


if __name__ == "__main__":
    main()
