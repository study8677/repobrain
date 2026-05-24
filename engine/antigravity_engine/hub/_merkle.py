"""Content-hash change detection for incremental refresh.

A Merkle-style content hash tree over the workspace at file -> module -> repo
granularity.  Persisting a snapshot lets a later refresh diff the current tree
against the previous one and learn *which modules changed* without trusting
git state — it sees uncommitted edits, survives branch switches, and works in
non-git directories.

This module is deliberately self-contained and side-effect-free apart from the
explicit snapshot read/write helpers.  It is NOT yet wired into the refresh
pipeline: detecting change here has no behavioural effect on its own.  The
follow-up step consumes :func:`diff_trees` to skip unchanged modules and
recompute only a changed module plus its graph impact closure.

Why module-grained hashes (not Cursor-style per-chunk):  Cursor re-embeds only
changed files because an embedding is a context-free function of one chunk.
Antigravity's per-module knowledge is *interpreted* and cross-references other
modules, so the eventual cache key is ``hash(own files + dependency closure)``
— but the raw per-file/per-module hashes built here are the inputs that key is
computed from.
"""
from __future__ import annotations

import hashlib
import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Mapping

logger = logging.getLogger(__name__)

# Bump when the on-disk snapshot schema changes; an older snapshot then loads
# as ``None`` and the caller rebuilds from scratch instead of misreading it.
SNAPSHOT_VERSION = 1

# Default file name for a persisted tree, written under the .antigravity dir.
SNAPSHOT_FILENAME = "merkle.json"

# Separator placed between a path and its hash inside a hashed line. NUL never
# appears in file paths, so it cannot be forged by a crafted path.
_SEP = "\0"


def compute_content_hash(content: str | bytes) -> str:
    """Return the SHA-256 hex digest of file content."""
    data = content.encode("utf-8") if isinstance(content, str) else content
    return hashlib.sha256(data).hexdigest()


@dataclass(frozen=True)
class ModuleNode:
    """One module's hash plus the per-file hashes it was derived from."""

    hash: str
    files: dict[str, str] = field(default_factory=dict)  # rel_path -> file hash


@dataclass(frozen=True)
class MerkleTree:
    """A workspace content-hash tree: root hash over all module hashes."""

    root: str
    modules: dict[str, ModuleNode] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "version": SNAPSHOT_VERSION,
            "root": self.root,
            "modules": {
                module_id: {"hash": node.hash, "files": node.files}
                for module_id, node in self.modules.items()
            },
        }

    @classmethod
    def from_dict(cls, data: Mapping) -> "MerkleTree":
        modules = {
            module_id: ModuleNode(
                hash=str(entry.get("hash", "")),
                files=dict(entry.get("files", {})),
            )
            for module_id, entry in data.get("modules", {}).items()
        }
        return cls(root=str(data.get("root", "")), modules=modules)


@dataclass(frozen=True)
class MerkleDiff:
    """Modules that appeared, changed, or vanished between two trees."""

    added: list[str]
    modified: list[str]
    removed: list[str]

    @property
    def changed_modules(self) -> list[str]:
        """Modules whose knowledge must be (re)generated: added + modified."""
        return sorted(set(self.added) | set(self.modified))

    @property
    def is_empty(self) -> bool:
        return not (self.added or self.modified or self.removed)


def _hash_lines(lines: list[str]) -> str:
    """Hash a set of ``name<SEP>hash`` lines order-independently."""
    return hashlib.sha256("\n".join(sorted(lines)).encode("utf-8")).hexdigest()


def build_tree(module_file_hashes: Mapping[str, Mapping[str, str]]) -> MerkleTree:
    """Build a :class:`MerkleTree` from precomputed per-file hashes.

    Pure: takes ``{module_id: {rel_path: file_hash}}`` and rolls hashes up
    deterministically (a module hash covers its file paths *and* contents, so
    renames register; the root covers all module ids and hashes).
    """
    modules: dict[str, ModuleNode] = {}
    for module_id, file_hashes in module_file_hashes.items():
        files = dict(file_hashes)
        module_hash = _hash_lines(
            [f"{rel_path}{_SEP}{files[rel_path]}" for rel_path in files]
        )
        modules[module_id] = ModuleNode(hash=module_hash, files=files)

    root = _hash_lines(
        [f"{module_id}{_SEP}{node.hash}" for module_id, node in modules.items()]
    )
    return MerkleTree(root=root, modules=modules)


def build_workspace_tree(workspace: Path) -> MerkleTree:
    """Build the content-hash tree for ``workspace``.

    Uses the same module detection and file-loading the refresh pipeline uses,
    so a "changed module" here corresponds exactly to a unit refresh would
    regenerate.  Performs file reads only — no LLM, no network.
    """
    from antigravity_engine.hub.module_grouping import load_module_files
    from antigravity_engine.hub.scanner import detect_modules, resolve_module_path

    module_file_hashes: dict[str, dict[str, str]] = {}
    for module_id in detect_modules(workspace):
        module_path = resolve_module_path(workspace, module_id)
        if module_path is None or not Path(module_path).is_dir():
            continue
        files = load_module_files(module_path, workspace)
        module_file_hashes[module_id] = {
            source_file.rel_path: compute_content_hash(source_file.content)
            for source_file in files
        }
    return build_tree(module_file_hashes)


def diff_trees(previous: MerkleTree | None, current: MerkleTree) -> MerkleDiff:
    """Compare two trees and report added / modified / removed modules."""
    if previous is None:
        return MerkleDiff(added=sorted(current.modules), modified=[], removed=[])

    prev_ids = set(previous.modules)
    cur_ids = set(current.modules)
    added = sorted(cur_ids - prev_ids)
    removed = sorted(prev_ids - cur_ids)
    modified = sorted(
        module_id
        for module_id in (cur_ids & prev_ids)
        if current.modules[module_id].hash != previous.modules[module_id].hash
    )
    return MerkleDiff(added=added, modified=modified, removed=removed)


def save_snapshot(tree: MerkleTree, path: Path) -> None:
    """Persist ``tree`` to ``path`` as JSON (creating parent dirs)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(tree.to_dict(), indent=2, sort_keys=True), encoding="utf-8"
    )


def load_snapshot(path: Path) -> MerkleTree | None:
    """Load a previously saved tree, or ``None`` if missing/unreadable/stale.

    Returns ``None`` (rather than raising) on a missing file, malformed JSON,
    or a snapshot written by a different :data:`SNAPSHOT_VERSION`, so callers
    transparently fall back to a full rebuild.
    """
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (ValueError, OSError) as exc:
        logger.warning("Ignoring unreadable merkle snapshot %s: %s", path, exc)
        return None
    if not isinstance(data, dict) or data.get("version") != SNAPSHOT_VERSION:
        logger.info("Discarding merkle snapshot %s: schema version mismatch", path)
        return None
    return MerkleTree.from_dict(data)
