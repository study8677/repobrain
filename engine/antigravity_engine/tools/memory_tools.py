"""Memory tools for reading/searching markdown memory files."""

from pathlib import Path
import subprocess
from typing import Optional

from antigravity_engine.config import settings


def _resolve_memory_file(memory_file: Optional[str]) -> Path:
    """Resolve target memory file path.

    Args:
        memory_file: Optional explicit memory file path.

    Returns:
        Absolute path to the memory markdown file.
    """
    if memory_file:
        return settings.resolve_path(memory_file)
    return settings.memory_file_path


def read_memory_md(max_chars: int = 12000, memory_file: Optional[str] = None) -> str:
    """Read markdown memory content for model inspection.

    Args:
        max_chars: Max characters to return (0 or negative means no truncation).
        memory_file: Optional memory file path override.

    Returns:
        Memory file content (possibly truncated).
    """
    path = _resolve_memory_file(memory_file)
    if not path.exists():
        return f"Memory file not found: {path}"

    content = path.read_text(encoding="utf-8")
    if max_chars <= 0 or len(content) <= max_chars:
        return content
    return content[: max_chars - 20].rstrip() + "\n... (truncated)"


def search_memory_md(
    query: str,
    max_results: int = 20,
    case_insensitive: bool = True,
    memory_file: Optional[str] = None,
) -> str:
    """Search markdown memory using ripgrep with a Python fallback.

    Args:
        query: Search pattern.
        max_results: Maximum number of matching lines to return.
        case_insensitive: Whether to ignore case during matching.
        memory_file: Optional memory file path override.

    Returns:
        Matching lines with line numbers, or an informative message.
    """
    search_query = (query or "").strip()
    if not search_query:
        return "Query cannot be empty."

    path = _resolve_memory_file(memory_file)
    if not path.exists():
        return f"Memory file not found: {path}"

    if max_results < 1:
        max_results = 1

    rg_cmd = [
        "rg",
        "--no-heading",
        "--line-number",
        "--max-count",
        str(max_results),
        search_query,
        str(path),
    ]
    if case_insensitive:
        rg_cmd.insert(1, "-i")

    try:
        completed = subprocess.run(
            rg_cmd,
            capture_output=True,
            text=True,
            check=False,
        )
        if completed.returncode == 0 and completed.stdout.strip():
            return completed.stdout.strip()
        if completed.returncode in (0, 1):
            return "No matching memory lines found."
    except FileNotFoundError:
        # Fallback for environments without ripgrep installed.
        pass

    matches = []
    target = search_query.lower() if case_insensitive else search_query
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        haystack = line.lower() if case_insensitive else line
        if target in haystack:
            matches.append(f"{line_number}:{line}")
        if len(matches) >= max_results:
            break

    if not matches:
        return "No matching memory lines found."
    return "\n".join(matches)
