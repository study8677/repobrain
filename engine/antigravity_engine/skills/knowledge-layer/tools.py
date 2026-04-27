"""Knowledge-layer skill tools.

This skill wraps the hub pipelines and exposes high-level all-file
operations with graph-first knowledge artifacts.
"""
from __future__ import annotations

import asyncio
import os
from pathlib import Path

from antigravity_engine.hub._utils import is_safe_path


def _workspace_root() -> Path:
    """Resolve the trusted workspace root from env var or current directory."""
    env = os.environ.get("WORKSPACE_PATH", "").strip()
    if env:
        return Path(env).resolve()
    return Path.cwd().resolve()


def _resolve_workspace(workspace: str | None = None) -> Path:
    """Resolve and validate workspace path from explicit arg, env var, or cwd.

    Args:
        workspace: Optional workspace path override.

    Returns:
        A canonical workspace path constrained to the trusted workspace root.

    Raises:
        ValueError: If the provided workspace escapes the trusted workspace root.
    """
    root = _workspace_root()
    candidate = Path(workspace).resolve() if workspace else root
    if not is_safe_path(root, candidate):
        raise ValueError(
            "workspace must be inside the current project workspace"
        )
    return candidate


def refresh_filesystem(workspace: str = ".", quick: bool = False) -> str:
    """Refresh graph-first knowledge artifacts for all file types.

    Args:
        workspace: Project root directory.
        quick: If True, incremental refresh from last git checkpoint.

    Returns:
        Status summary with generated artifact paths.
    """
    from antigravity_engine.hub.pipeline import refresh_pipeline

    ws = _resolve_workspace(workspace)
    asyncio.run(refresh_pipeline(ws, quick=quick))
    ag_dir = ws / ".antigravity"
    return (
        "Knowledge-layer refresh completed:\n"
        f"- {ag_dir / 'knowledge_graph.json'}\n"
        f"- {ag_dir / 'knowledge_graph.md'}\n"
        f"- {ag_dir / 'document_index.md'}\n"
        f"- {ag_dir / 'data_overview.md'}\n"
        f"- {ag_dir / 'media_manifest.md'}"
    )


def ask_filesystem(question: str, workspace: str = ".") -> str:
    """Ask a question using graph-first, all-file project context.

    Args:
        question: Natural language question.
        workspace: Project root directory.

    Returns:
        Grounded answer with source references.
    """
    from antigravity_engine.hub.pipeline import ask_pipeline

    ws = _resolve_workspace(workspace)
    return asyncio.run(ask_pipeline(ws, question))
