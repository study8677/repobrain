"""CLI entry points for Antigravity Engine.

Provides:
- ag-ask "question"   → ask the multi-agent cluster
- ag-refresh          → refresh the knowledge base (module agents self-learn)
- ag-mcp              → MCP server (see hub/mcp_server.py)
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from typing import Sequence


def _parse_args(
    parser: argparse.ArgumentParser,
    argv: Sequence[str] | None,
) -> argparse.Namespace:
    """Parse CLI arguments from an explicit argv list or sys.argv.

    Args:
        parser: Configured argument parser.
        argv: Optional explicit argv list without the executable name.

    Returns:
        Parsed argument namespace.
    """
    if argv is None:
        return parser.parse_args()
    return parser.parse_args(list(argv))


def ask_main(argv: Sequence[str] | None = None) -> None:
    """Entry point for ``ag-ask``.

    Args:
        argv: Optional explicit argv list without the executable name.
    """

    parser = argparse.ArgumentParser(
        prog="ag-ask",
        description="Ask the Antigravity multi-agent cluster a question",
    )
    parser.add_argument("question", help="Natural language question about the project")
    parser.add_argument("--workspace", default=".", help="Project root (default: cwd)")
    args = _parse_args(parser, argv)

    workspace = Path(args.workspace).resolve()
    os.environ["WORKSPACE_PATH"] = str(workspace)

    try:
        import asyncio
        from antigravity_engine.hub.pipeline import ask_pipeline

        print(asyncio.run(ask_pipeline(workspace, args.question)))
    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)


def refresh_main(argv: Sequence[str] | None = None) -> None:
    """Entry point for ``ag-refresh``.

    Args:
        argv: Optional explicit argv list without the executable name.
    """

    parser = argparse.ArgumentParser(
        prog="ag-refresh",
        description="Refresh the Antigravity knowledge base",
    )
    parser.add_argument("--workspace", default=".", help="Project root (default: cwd)")
    parser.add_argument("--quick", action="store_true", help="Only scan changed files")
    parser.add_argument("--failed-only", action="store_true", help="Only re-run modules that failed in the previous refresh")
    args = _parse_args(parser, argv)

    workspace = Path(args.workspace).resolve()
    os.environ["WORKSPACE_PATH"] = str(workspace)

    try:
        import asyncio
        from antigravity_engine.hub.pipeline import refresh_pipeline

        status = asyncio.run(
            refresh_pipeline(
                workspace=workspace,
                quick=args.quick,
                failed_only=args.failed_only,
            )
        )
        if getattr(status, "exit_code", 0) != 0:
            sys.exit(int(status.exit_code))
    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)


def mcp_main(argv: Sequence[str] | None = None) -> None:
    """Entry point for ``ag-mcp``.

    Args:
        argv: Optional explicit argv list without the executable name.
    """
    from antigravity_engine.hub.mcp_server import main as mcp_server_main

    if argv is None:
        mcp_server_main()
        return

    original_argv = sys.argv[:]
    try:
        sys.argv = ["ag-mcp", *list(argv)]
        mcp_server_main()
    finally:
        sys.argv = original_argv


def _dispatch_main(argv: Sequence[str] | None, prog: str) -> None:
    """Dispatch a subcommand-oriented module entrypoint.

    Args:
        argv: Optional explicit argv list without the executable name.
        prog: Program name shown in argparse help.
    """
    parser = argparse.ArgumentParser(
        prog=prog,
        description="Antigravity engine command dispatcher",
    )
    parser.add_argument(
        "command",
        choices=("ask", "refresh", "mcp"),
        help="Engine command to run",
    )
    parsed, remainder = parser.parse_known_args(
        sys.argv[1:] if argv is None else list(argv)
    )

    if parsed.command == "ask":
        ask_main(remainder)
        return
    if parsed.command == "refresh":
        refresh_main(remainder)
        return
    mcp_main(remainder)


def engine_main(argv: Sequence[str] | None = None) -> None:
    """Entry point for ``python -m antigravity_engine``.

    Args:
        argv: Optional explicit argv list without the executable name.
    """
    _dispatch_main(argv, "antigravity_engine")


def hub_main(argv: Sequence[str] | None = None) -> None:
    """Entry point for ``python -m antigravity_engine.hub``.

    Args:
        argv: Optional explicit argv list without the executable name.
    """
    _dispatch_main(argv, "antigravity_engine.hub")
