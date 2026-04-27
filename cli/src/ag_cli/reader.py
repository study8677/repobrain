"""Pure-pathlib reader for .antigravity/ context files. No engine dependency."""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path


def read_antigravity_context(workspace: Path) -> dict[str, str]:
    """Read all context files from .antigravity/ directory.

    Args:
        workspace: Path to the project root.

    Returns:
        Dictionary mapping filenames to their content.
    """
    ag_dir = workspace / ".antigravity"
    if not ag_dir.is_dir():
        return {}

    context: dict[str, str] = {}
    for md_file in sorted(ag_dir.glob("*.md")):
        try:
            context[md_file.name] = md_file.read_text(encoding="utf-8")
        except OSError:
            pass
    return context


def append_to_memory(workspace: Path, filename: str, entry: str) -> Path:
    """Append a timestamped entry to a memory file.

    Args:
        workspace: Path to the project root.
        filename: Name of the memory file (e.g., "reports.md").
        entry: The text entry to append.

    Returns:
        Path to the memory file.
    """
    memory_dir = workspace / ".antigravity" / "memory"
    memory_dir.mkdir(parents=True, exist_ok=True)
    target = memory_dir / filename

    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    block = f"\n## {ts}\n\n{entry}\n"

    with target.open("a", encoding="utf-8") as f:
        f.write(block)

    return target


def append_decision(workspace: Path, decision: str, rationale: str) -> Path:
    """Append a decision entry to the decisions log.

    Args:
        workspace: Path to the project root.
        decision: The decision made.
        rationale: Why this decision was made.

    Returns:
        Path to the decisions log file.
    """
    decisions_dir = workspace / ".antigravity" / "decisions"
    decisions_dir.mkdir(parents=True, exist_ok=True)
    target = decisions_dir / "log.md"

    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    block = f"\n## {ts}\n\n**Decision:** {decision}\n\n**Rationale:** {rationale}\n"

    with target.open("a", encoding="utf-8") as f:
        f.write(block)

    return target
