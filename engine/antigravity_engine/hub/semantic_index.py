"""Shared semantic analysis entrypoints for hub graphing and grouping."""
from __future__ import annotations

import os
from pathlib import Path

from pydantic import BaseModel, Field

from antigravity_engine.hub._constants import SKIP_DIRS, SOURCE_CODE_EXTS
from antigravity_engine.hub.language_adapters import FileSemantics, get_language_adapter


class SemanticIndex(BaseModel):
    """Collection of analyzed source-file semantics.

    Args:
        files: Semantic records for analyzed source files.
    """

    files: list[FileSemantics] = Field(
        default_factory=list,
        description="Semantic records for analyzed source files.",
    )

    def by_rel_path(self) -> dict[str, FileSemantics]:
        """Index semantic records by relative path."""
        return {item.rel_path: item for item in self.files}


def analyze_source_file(
    workspace: Path,
    abs_path: Path,
    *,
    rel_path: str | None = None,
    content: str | None = None,
) -> FileSemantics:
    """Analyze one source file using the registered language adapter.

    Args:
        workspace: Workspace root directory.
        abs_path: Absolute path to the source file.
        rel_path: Optional workspace-relative path.
        content: Optional decoded file contents.

    Returns:
        Language-neutral semantic analysis result.

    Raises:
        OSError: If the file cannot be read and ``content`` is not provided.
    """
    adapter = get_language_adapter(abs_path)
    resolved_rel_path = rel_path or abs_path.relative_to(workspace).as_posix()
    if content is None:
        content = abs_path.read_text(encoding="utf-8", errors="replace")
    return adapter.analyze(workspace, abs_path, resolved_rel_path, content)


def build_semantic_index(
    root: Path,
    *,
    candidate_rel_paths: list[str] | None = None,
    max_files: int | None = None,
    skip_dirs: set[str] | None = None,
) -> SemanticIndex:
    """Analyze a set of workspace source files into a shared semantic index.

    Args:
        root: Workspace root directory.
        candidate_rel_paths: Optional explicit file list to analyze.
        max_files: Optional hard limit on analyzed files.
        skip_dirs: Optional extra directory names to skip during walking.

    Returns:
        Semantic index for the analyzed files. Individual file failures
        degrade through adapters rather than raising.
    """
    files: list[FileSemantics] = []
    count = 0

    for abs_path, rel_path in iter_semantic_candidates(
        root=root,
        candidate_rel_paths=candidate_rel_paths,
        skip_dirs=skip_dirs,
    ):
        try:
            files.append(analyze_source_file(root, abs_path, rel_path=rel_path))
        except OSError:
            continue
        count += 1
        if max_files is not None and count >= max_files:
            break

    return SemanticIndex(files=files)


def iter_semantic_candidates(
    root: Path,
    *,
    candidate_rel_paths: list[str] | None = None,
    skip_dirs: set[str] | None = None,
) -> list[tuple[Path, str]]:
    """Return source files eligible for semantic analysis.

    Args:
        root: Workspace root directory.
        candidate_rel_paths: Optional explicit file list to analyze.
        skip_dirs: Optional extra directory names to skip during walking.

    Returns:
        Stable list of ``(abs_path, rel_path)`` tuples for analyzable files.
    """
    if candidate_rel_paths is not None:
        candidates: list[tuple[Path, str]] = []
        for rel_path in sorted(candidate_rel_paths):
            abs_path = root / rel_path
            if not abs_path.is_file():
                continue
            if abs_path.suffix.lower() not in SOURCE_CODE_EXTS:
                continue
            candidates.append((abs_path, rel_path))
        return candidates

    skip = set(SKIP_DIRS)
    skip.update(skip_dirs or set())
    candidates = []
    for dirpath_str, dirnames, filenames in os.walk(root):
        dirnames[:] = [
            dirname
            for dirname in dirnames
            if dirname not in skip and not dirname.startswith(".")
        ]
        for filename in filenames:
            abs_path = Path(dirpath_str) / filename
            if abs_path.suffix.lower() not in SOURCE_CODE_EXTS:
                continue
            try:
                rel_path = abs_path.relative_to(root).as_posix()
            except ValueError:
                continue
            candidates.append((abs_path, rel_path))
    return sorted(candidates, key=lambda item: item[1])
