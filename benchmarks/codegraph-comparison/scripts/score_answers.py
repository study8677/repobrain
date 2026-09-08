#!/usr/bin/env python3
"""Score benchmark outputs against deterministic file and symbol atoms."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def load_text(path: Path) -> str:
    if path.suffix == ".json":
        payload = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(payload, dict) and isinstance(payload.get("answer"), str):
            return payload["answer"]
    return path.read_text(encoding="utf-8")


def recall(expected: list[str], text: str) -> tuple[int, int, float]:
    found = sum(1 for item in expected if item.casefold() in text.casefold())
    total = len(expected)
    return found, total, found / total if total else 1.0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--questions", type=Path, required=True)
    parser.add_argument("--results", type=Path, required=True)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    questions = json.loads(args.questions.read_text(encoding="utf-8"))["questions"]
    scores: list[dict[str, object]] = []

    for question in questions:
        question_id = question["id"]
        for tool, suffix in (("repobrain", ".json"), ("codegraph", ".md")):
            result_path = args.results / f"{question_id}-{tool}{suffix}"
            exit_code_path = args.results / f"{question_id}-{tool}.exit-code"
            if exit_code_path.exists():
                exit_code = int(exit_code_path.read_text(encoding="utf-8").strip())
                if exit_code != 0:
                    scores.append(
                        {
                            "question_id": question_id,
                            "tool": tool,
                            "status": "unavailable",
                            "reason": f"command exited with code {exit_code}",
                        }
                    )
                    continue
            if not result_path.exists():
                scores.append(
                    {
                        "question_id": question_id,
                        "tool": tool,
                        "status": "missing",
                    }
                )
                continue

            try:
                text = load_text(result_path)
            except (OSError, json.JSONDecodeError) as exc:
                scores.append(
                    {
                        "question_id": question_id,
                        "tool": tool,
                        "status": "invalid",
                        "reason": str(exc),
                    }
                )
                continue
            file_found, file_total, file_recall = recall(
                question["expected_files"], text
            )
            symbol_found, symbol_total, symbol_recall = recall(
                question["expected_symbols"], text
            )
            scores.append(
                {
                    "question_id": question_id,
                    "tool": tool,
                    "status": "scored",
                    "expected_files_found": file_found,
                    "expected_files_total": file_total,
                    "expected_file_recall": file_recall,
                    "expected_symbols_found": symbol_found,
                    "expected_symbols_total": symbol_total,
                    "expected_symbol_recall": symbol_recall,
                    "output_bytes": len(text.encode("utf-8")),
                }
            )

    output = json.dumps({"schema_version": 1, "scores": scores}, indent=2)
    if args.output:
        args.output.write_text(output + "\n", encoding="utf-8")
    else:
        print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
