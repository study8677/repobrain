"""Antigravity Knowledge Hub — MCP Server.

Exposes `ask_project` and `refresh_project` as MCP tools so that
Claude Code (and any MCP-compatible AI IDE) can query the project
knowledge base without doing its own grep/file search.

Usage (stdio transport):
    python -m antigravity_engine.hub.mcp_server --workspace /path/to/project

Or via the installed entry-point:
    ag-mcp --workspace /path/to/project

Then configure in Claude Code's MCP settings (~/.claude/mcp.json):
    {
      "mcpServers": {
        "antigravity": {
          "command": "ag-mcp",
          "args": ["--workspace", "/path/to/your/project"]
        }
      }
    }
"""
from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path


def _resolve_workspace(workspace: str | None) -> Path:
    """Resolve workspace path from argument or environment."""
    if workspace:
        return Path(workspace).resolve()
    env = os.environ.get("WORKSPACE_PATH", "")
    if env:
        return Path(env).resolve()
    return Path.cwd()


def serve(workspace: Path) -> None:
    """Start the MCP server on stdio.

    Args:
        workspace: Absolute path to the project root.
    """
    from mcp.server.fastmcp import FastMCP

    mcp = FastMCP(
        "Antigravity Knowledge Hub",
        instructions=(
            "Use ask_project to answer any question about the codebase — "
            "where code lives, why decisions were made, how things work. "
            "Use refresh_project to rebuild the project knowledge base after "
            "significant changes. Prefer ask_project over manual file search."
        ),
    )

    @mcp.tool()
    async def ask_project(question: str) -> str:
        """Answer a question about the project using the knowledge hub.

        Searches the codebase, reads actual source files, checks git history,
        and synthesizes a grounded answer with file paths and line numbers.
        Use this instead of manual grep or file reading.

        Args:
            question: Natural language question about the project, e.g.
                "Where is the authentication logic?",
                "Why was the JWT migration done?",
                "What does the Scanner class do?"

        Returns:
            Grounded answer with file paths, line numbers, and context.
        """
        from antigravity_engine.hub.pipeline import ask_pipeline

        try:
            return await ask_pipeline(workspace, question)
        except Exception as exc:  # noqa: BLE001
            return f"Error: {exc}"

    @mcp.tool()
    async def refresh_project(quick: bool = False) -> str:
        """Rebuild the project knowledge base (.antigravity/conventions.md and structure.md).

        Run this after significant code changes to keep the knowledge base
        up to date. Use quick=True to only scan files changed since the
        last refresh.

        Args:
            quick: If True, only scan files changed since the last refresh.
                   Faster but may miss some changes.

        Returns:
            Confirmation message with updated file paths.
        """
        from antigravity_engine.hub.pipeline import refresh_pipeline

        try:
            status = await refresh_pipeline(workspace, quick=quick)
            ag_dir = workspace / ".antigravity"
            lines = [
                f"Knowledge base updated with status `{status.overall_status}`:",
                f"  {ag_dir / 'conventions.md'}",
                f"  {ag_dir / 'structure.md'}",
                f"  {ag_dir / 'status.json'}",
            ]
            refresh_plan_path = ag_dir / "agent_refresh_plan.json"
            if refresh_plan_path.is_file():
                lines.append(f"  {refresh_plan_path}")
            validation_path = ag_dir / "knowledge_validation.json"
            if validation_path.is_file():
                lines.append(f"  {validation_path}")
            if status.overall_status != "success":
                lines.append(
                    "Host LLM capability is required to complete semantic knowledge artifacts."
                )
            return "\n".join(lines)
        except Exception as exc:  # noqa: BLE001
            return f"Error: {exc}"

    mcp.run(transport="stdio")


def main() -> None:
    """Entry point for ag-mcp CLI command."""
    import argparse

    parser = argparse.ArgumentParser(
        prog="ag-mcp",
        description="Antigravity Knowledge Hub MCP server (stdio transport)",
    )
    parser.add_argument(
        "--workspace",
        default=None,
        help="Project root directory (default: WORKSPACE_PATH env or cwd)",
    )
    args = parser.parse_args()

    workspace = _resolve_workspace(args.workspace)

    if not workspace.exists():
        print(f"Error: workspace does not exist: {workspace}", file=sys.stderr)
        sys.exit(1)

    # Set env so pipeline picks up the workspace
    os.environ["WORKSPACE_PATH"] = str(workspace)

    serve(workspace)


if __name__ == "__main__":
    main()
