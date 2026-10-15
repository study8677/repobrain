"""Read-only selection of completed local knowledge by committed Git version."""
from __future__ import annotations

import re
import subprocess
from pathlib import Path

from repobrain_engine.hub.refresh_lifecycle import load_baseline, read_json_object
from repobrain_engine.hub.storage import (
    GENERATION_SCHEMA_VERSION, control_root, read_current_pointer,
)


def workspace_head(workspace: Path) -> str | None:
    """Return a full commit id, or None outside a committed Git workspace."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"], cwd=workspace, capture_output=True,
            text=True, check=False, timeout=5,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    value = result.stdout.strip()
    if result.returncode == 0 and re.fullmatch(r"[0-9a-f]{40}|[0-9a-f]{64}", value):
        return value
    return None


def has_generations(workspace: Path) -> bool:
    """Distinguish generation-backed storage from the legacy flat layout."""
    root = control_root(workspace)
    return (root / "current.json").exists() or (root / "generations").is_dir()


def _saved_pointers(workspace: Path) -> list[dict]:
    """Find published versions, including completed pre-receipt generations.

    Unpublished interrupted candidates are never queryable. Older successful
    versions have no receipt; their full artifacts are validated by load_baseline
    before use. The active pointer remains the preferred copy.
    """
    active = read_current_pointer(workspace)
    pointers = [active] if active else []
    generations = control_root(workspace) / "generations"
    if not generations.is_dir():
        return pointers
    for root in sorted(generations.iterdir(), reverse=True):
        if not root.is_dir() or (active and root.name == active["generation"]):
            continue
        receipt = read_json_object(root / "published.json")
        if receipt is not None:
            if (
                receipt.get("schema_version") == GENERATION_SCHEMA_VERSION
                and receipt.get("generation") == root.name
            ):
                pointers.append(receipt)
            continue
        if (root / "published.json").exists():
            continue
        if (root / "resume.json").exists():
            continue
        snapshot = read_json_object(root / "snapshot.json")
        if snapshot and snapshot.get("head_sha"):
            pointers.append({
                "schema_version": GENERATION_SCHEMA_VERSION,
                "generation": root.name,
                "head_sha": snapshot["head_sha"],
                "merkle_root": snapshot.get("merkle_root", ""),
            })
    return pointers


def _usable(workspace: Path, pointer: dict, config: dict) -> bool:
    try:
        baseline, _ = load_baseline(workspace, config, pointer=pointer)
    except RuntimeError:
        return False
    return baseline is not None


def find_exact_generation(workspace: Path, head_sha: str, config: dict) -> dict | None:
    """Find complete, compatible knowledge for exactly this commit."""
    for pointer in _saved_pointers(workspace):
        if pointer.get("head_sha") == head_sha and _usable(workspace, pointer, config):
            return pointer
    return None


def select_refresh_baseline(workspace: Path, head_sha: str, config: dict) -> dict | None:
    """Prefer exact knowledge, then the nearest usable ancestor, never a sibling."""
    # A corrupt current.json still needs explicit repair. A damaged unrelated
    # branch, however, must not prevent reuse of a healthy exact version.
    active = read_current_pointer(workspace)
    if active is not None:
        if active.get("head_sha") == head_sha:
            load_baseline(workspace, config)
        exact = find_exact_generation(workspace, head_sha, config)
        if exact is not None:
            return exact
    load_baseline(workspace, config)
    return select_ask_generation(workspace, head_sha, config)


def is_ancestor(workspace: Path, saved_head: str, head_sha: str) -> bool:
    """Accept only a commit on the current history, including HEAD itself."""
    if not re.fullmatch(r"[0-9a-f]{40}|[0-9a-f]{64}", saved_head):
        return False
    result = subprocess.run(
        ["git", "merge-base", "--is-ancestor", saved_head, head_sha],
        cwd=workspace, capture_output=True, check=False, timeout=5,
    )
    return result.returncode == 0


def select_ask_generation(workspace: Path, head_sha: str, config: dict) -> dict | None:
    """Read exact knowledge or the nearest compatible ancestor, never a sibling.

    Unlike refresh selection, damage to an unrelated active generation does
    not prevent using a healthy ancestor for a read-only question.
    """
    exact = find_exact_generation(workspace, head_sha, config)
    if exact is not None:
        return exact
    pointers = _saved_pointers(workspace)
    best: tuple[int, dict] | None = None
    for pointer in pointers:
        saved_head = pointer.get("head_sha")
        if not isinstance(saved_head, str) or not re.fullmatch(
            r"[0-9a-f]{40}|[0-9a-f]{64}", saved_head,
        ):
            continue
        if not _usable(workspace, pointer, config):
            continue
        if saved_head == head_sha:
            return pointer
        if not is_ancestor(workspace, saved_head, head_sha):
            continue
        distance = subprocess.run(
            ["git", "rev-list", "--count", f"{saved_head}..{head_sha}"],
            cwd=workspace, capture_output=True, text=True, check=False, timeout=5,
        )
        if distance.returncode == 0:
            count = int(distance.stdout.strip())
            if best is None or count < best[0]:
                best = count, pointer
    return best[1] if best else None
