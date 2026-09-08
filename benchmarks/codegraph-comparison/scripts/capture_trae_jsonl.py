#!/usr/bin/env python3
"""Run Trae CLI, preserve its JSONL event stream, and pass output through."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


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
    sys.stdout.write(completed.stdout)
    sys.stderr.write(completed.stderr)
    return completed.returncode


if __name__ == "__main__":
    raise SystemExit(main())
