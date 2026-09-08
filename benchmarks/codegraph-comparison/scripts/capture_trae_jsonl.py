#!/usr/bin/env python3
"""Run Trae CLI, preserve its JSONL event stream, and pass output through."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

from benchmark_v2_common import normalize_answer_text


def output_path(command: list[str]) -> Path | None:
    """Locate Trae's final-message path without interpreting other arguments."""
    for index, token in enumerate(command):
        if token in {"-o", "--output-last-message"} and index + 1 < len(command):
            return Path(command[index + 1])
        for prefix in ("--output-last-message=", "-o="):
            if token.startswith(prefix):
                return Path(token[len(prefix):])
    return None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--events", type=Path, required=True)
    parser.add_argument("--timeout", type=float)
    parser.add_argument("command", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    command = args.command
    if command and command[0] == "--":
        command = command[1:]
    if not command:
        parser.error("a Trae command is required after --")

    try:
        completed = subprocess.run(
            command,
            input=sys.stdin.read(),
            text=True,
            capture_output=True,
            timeout=args.timeout,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        stdout = (
            exc.stdout.decode()
            if isinstance(exc.stdout, bytes)
            else (exc.stdout or "")
        )
        stderr = (
            exc.stderr.decode()
            if isinstance(exc.stderr, bytes)
            else (exc.stderr or "")
        )
        completed = subprocess.CompletedProcess(
            command,
            124,
            stdout,
            f"{stderr}\nTrae timed out after {args.timeout:g}s.",
        )
    args.events.parent.mkdir(parents=True, exist_ok=True)
    args.events.write_text(
        f"{completed.stdout}\n{completed.stderr}", encoding="utf-8"
    )
    answer_path = output_path(command)
    if completed.returncode == 0 and answer_path is not None and answer_path.is_file():
        original = answer_path.read_text(encoding="utf-8", errors="replace")
        payload, normalized = normalize_answer_text(original)
        if normalized:
            answer_path.write_text(
                json.dumps(payload, ensure_ascii=False), encoding="utf-8"
            )
    sys.stdout.write(completed.stdout)
    sys.stderr.write(completed.stderr)
    return completed.returncode


if __name__ == "__main__":
    raise SystemExit(main())
