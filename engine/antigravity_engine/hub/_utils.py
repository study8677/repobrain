"""Shared utility helpers for the Hub package.

Centralises small helper functions that were previously duplicated
across scanner and ask_tools modules.
"""
from __future__ import annotations

import os
from pathlib import Path

from antigravity_engine.hub._constants import SKIP_DIRS


# ---------------------------------------------------------------------------
# Environment-variable helpers
# ---------------------------------------------------------------------------

def env_int(name: str, default: int, *, minimum: int) -> int:
    """Read an integer environment variable with fallback and lower bound.

    Args:
        name: Environment variable name.
        default: Value returned when the variable is unset.
        minimum: Lower bound for the returned value.

    Returns:
        The parsed integer clamped to *minimum*, or *default*.
    """
    raw = os.environ.get(name)
    if raw is None:
        return default
    try:
        value = int(raw)
    except ValueError:
        return default
    return max(minimum, value)


def env_float(name: str, default: float, *, minimum: float) -> float:
    """Read a float environment variable with fallback and lower bound.

    Args:
        name: Environment variable name.
        default: Value returned when the variable is unset.
        minimum: Lower bound for the returned value.

    Returns:
        The parsed float clamped to *minimum*, or *default*.
    """
    raw = os.environ.get(name)
    if raw is None:
        return default
    try:
        value = float(raw)
    except ValueError:
        return default
    return max(minimum, value)


# ---------------------------------------------------------------------------
# Path helpers
# ---------------------------------------------------------------------------

def is_safe_path(workspace: Path, target: Path) -> bool:
    """Return True if *target* is inside *workspace* (no traversal).

    Args:
        workspace: The trusted workspace root.
        target: The path to validate.

    Returns:
        True when *target* resolves to a location under *workspace*.
    """
    try:
        target.resolve().relative_to(workspace.resolve())
        return True
    except ValueError:
        return False


def should_skip_dir(name: str) -> bool:
    """Return True if a directory name matches the global skip list.

    Args:
        name: Directory base name to check.

    Returns:
        True when the name is in :data:`SKIP_DIRS` or ends with
        ``.egg-info``.
    """
    return name in SKIP_DIRS or name.endswith(".egg-info")
