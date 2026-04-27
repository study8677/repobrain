"""Smart module grouping for RefreshModuleAgents.

Groups source files into functional units using multiple signals:
1. Shared semantic package/import relationships (connected components)
2. Directory co-location
3. Filename prefix matching
4. Token budget and file-count constraints

Each group targets ~30K tokens of pre-loaded source code.
Large groups are split via min-cut on the import graph (hub removal).

All file contents are pre-loaded into agent context — no tool calls needed.
"""
from __future__ import annotations

import json
import os
import re
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Sequence

from antigravity_engine.hub._constants import SOURCE_CODE_EXTS
from antigravity_engine.hub.language_adapters import FileSemantics
from antigravity_engine.hub.semantic_index import analyze_source_file

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

#: Soft token budget per sub-agent (design choice for analysis quality).
DEFAULT_TOKEN_BUDGET = 30_000

#: Max files per sub-agent regardless of token count.
MAX_FILES_PER_GROUP = 20

#: Source file extensions to include.
SOURCE_EXTENSIONS = SOURCE_CODE_EXTS

#: Directories that contain build artifacts, not source code.
_ARTIFACT_DIRS = {
    # JS/TS build output
    "dist", "build", "out", ".next", ".nuxt", ".output",
    # Bundler output
    "assets",  # Vite/Webpack hashed bundles
    "chunks", "static",
    # Python build output
    "__pycache__", ".pyc_cache",
    "*.egg-info", "site-packages",
    # Dependencies
    "node_modules", "bower_components",
    # IDE / OS
    ".idea", ".vscode", ".DS_Store",
    # Coverage / test output
    "coverage", ".coverage", "htmlcov", ".nyc_output",
    # Cache
    ".cache", ".parcel-cache", ".turbo", ".eslintcache",
    # Generated docs
    "_build", "site",
}

#: File patterns that indicate build artifacts (not source code).
_ARTIFACT_PATTERNS = {
    # Minified / bundled JS
    ".min.js", ".min.css", ".bundle.js", ".chunk.js",
    # Source maps
    ".map", ".js.map", ".css.map",
    # Lock files
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    "Pipfile.lock", "poetry.lock", "uv.lock",
    # Compiled
    ".pyc", ".pyo", ".so", ".dll", ".dylib", ".wasm",
    # Bundler manifests
    ".LICENSE.txt",
}

#: Maximum tokens for a single file. Files above this are likely
#: bundled/generated artifacts, not human-written source code.
_MAX_FILE_TOKENS = 50_000

#: Token discount factors by file category.
CATEGORY_WEIGHTS: dict[str, float] = {
    "test": 0.3,
    "glue": 0.5,
    "config": 0.5,
    "interface": 1.0,
    "implementation": 1.0,
}


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class SourceFile:
    """A source file with metadata for grouping."""
    rel_path: str            # Relative to workspace
    abs_path: Path
    content: str
    language: str
    raw_tokens: int          # len(content) // 4
    category: str            # interface/implementation/glue/test/config
    effective_tokens: int    # raw_tokens * category weight
    prefix: str              # Filename prefix for grouping (e.g. "community")
    package_identity: str | None = None
    imports_modules: list[str] = field(default_factory=list)  # modules this file imports
    signature_summary: str = ""
    semantics: FileSemantics | None = None


@dataclass
class FileGroup:
    """A group of functionally related source files."""
    name: str
    files: list[SourceFile]
    total_tokens: int = 0
    total_effective_tokens: int = 0

    def add(self, f: SourceFile) -> None:
        self.files.append(f)
        self.total_tokens += f.raw_tokens
        self.total_effective_tokens += f.effective_tokens


# ---------------------------------------------------------------------------
# Step 1: Read and classify files
# ---------------------------------------------------------------------------

def load_module_files(module_path: Path, workspace: Path) -> list[SourceFile]:
    """Read all source files in a module and classify them via shared semantics.

    Args:
        module_path: Absolute path to the module directory.
        workspace: Project root.

    Returns:
        List of SourceFile objects with content pre-loaded.
    """
    files: list[SourceFile] = []
    if not module_path.is_dir():
        return files

    if module_path == workspace:
        candidates = sorted(module_path.iterdir())
    else:
        candidates = sorted(module_path.rglob("*"))

    for fpath in candidates:
        if not fpath.is_file():
            continue
        if module_path == workspace and fpath.parent != workspace:
            continue
        if fpath.suffix.lower() not in SOURCE_EXTENSIONS:
            continue
        if _is_artifact(fpath):
            continue

        try:
            content = fpath.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue

        rel = str(fpath.relative_to(workspace))
        raw_tokens = len(content) // 4

        # Skip oversized files (likely bundled/generated, not source)
        if raw_tokens > _MAX_FILE_TOKENS:
            continue
        semantics = analyze_source_file(workspace, fpath, rel_path=rel, content=content)
        category = _classify_file(fpath, content, semantics)
        weight = CATEGORY_WEIGHTS.get(category, 1.0)
        effective_tokens = int(raw_tokens * weight)
        prefix = _extract_prefix(fpath.stem)

        files.append(SourceFile(
            rel_path=rel,
            abs_path=fpath,
            content=content,
            language=semantics.language,
            raw_tokens=raw_tokens,
            category=category,
            effective_tokens=effective_tokens,
            prefix=prefix,
            package_identity=semantics.package_identity,
            imports_modules=list(semantics.imports),
            signature_summary=semantics.signature_summary,
            semantics=semantics,
        ))

    return files


def _is_artifact(fpath: Path) -> bool:
    """Check if a file is a build artifact that should be skipped.

    Checks directory names, file patterns, and heuristics for
    generated/bundled/compiled files.
    """
    parts = fpath.parts
    fname = fpath.name.lower()

    # Directory-based: any parent dir is an artifact directory
    for part in parts:
        if part.lower() in _ARTIFACT_DIRS:
            return True
        # Catch *.egg-info directories
        if part.endswith(".egg-info"):
            return True

    # Pattern-based: file name matches artifact patterns
    for pattern in _ARTIFACT_PATTERNS:
        if fname.endswith(pattern):
            return True

    # Heuristic: hashed filenames (e.g. index-009ZE0m4.js, vendor-Dfg0lvlF.js)
    # These are Vite/Webpack output with content hashes
    stem = fpath.stem
    if re.search(r"-[A-Za-z0-9_]{6,10}$", stem) and fpath.suffix in {".js", ".css"}:
        return True

    # Heuristic: vendor bundles
    if "vendor" in fname and fpath.suffix in {".js", ".css"}:
        return True

    return False


def _classify_file(
    fpath: Path,
    content: str,
    semantics: FileSemantics | None = None,
) -> str:
    """Classify a file into a category (language-agnostic).

    Categories: interface, implementation, glue, test, config.

    Uses semantic adapter output and filename heuristics — no AST parsing.
    """
    name = fpath.stem.lower()
    fname = fpath.name.lower()

    # Test files
    if semantics and semantics.is_test_file:
        return "test"
    if (name.startswith("test_") or name.endswith("_test")
            or "tests/" in str(fpath) or "test/" in str(fpath)
            or fname.endswith(".test.ts") or fname.endswith(".test.tsx")
            or fname.endswith(".spec.ts") or fname.endswith(".spec.tsx")
            or fname.endswith("_test.go")):
        return "test"

    # Glue files (language-specific index/init files)
    if name in ("__init__", "index", "mod"):
        return "glue"

    # Config files
    if name in ("config", "settings", "constants", "types", "enums", "env"):
        return "config"

    # Interface detection via semantic adapter (works for any language)
    if semantics and semantics.symbols:
        symbol_kinds = {symbol.kind for symbol in semantics.symbols}
        if symbol_kinds and symbol_kinds <= {"interface", "protocol", "abstract_class"}:
            return "interface"

    return "implementation"


def _extract_prefix(stem: str) -> str:
    """Extract the functional prefix from a filename stem.

    Examples:
        community_providers → community
        seo_audit → seo
        blog_writer → blog
        __init__ → __init__
        App → app
    """
    # Keep special names as-is
    if stem.startswith("_"):
        return stem

    # Split on underscore, take first part
    parts = stem.lower().split("_")
    return parts[0] if parts else stem.lower()

# ---------------------------------------------------------------------------
# Step 2: Build file dependency graph from knowledge graph
# ---------------------------------------------------------------------------

def build_file_dependency_graph(
    files: list[SourceFile],
    workspace: Path,
) -> dict[str, set[str]]:
    """Build an undirected file→file dependency graph from shared semantics.

    Semantic package identities connect files that are compiled or analyzed as
    a unit (for example, Go package peers). Import keys connect files to the
    local package or module identities they depend on.

    Args:
        files: List of source files in the module.
        workspace: Project root.

    Returns:
        Adjacency dict: {rel_path: {rel_paths it's connected to}}.
    """
    del workspace
    provided_to_files: dict[str, set[str]] = defaultdict(set)
    package_to_files: dict[str, set[str]] = defaultdict(set)
    for f in files:
        if f.package_identity:
            package_to_files[f.package_identity].add(f.rel_path)
        for provided in (f.semantics.provided_modules if f.semantics else []):
            provided_to_files[provided].add(f.rel_path)

    # Build adjacency graph
    # Exclude glue files (__init__.py, index.ts) from creating edges —
    # they import everything and create false connections between unrelated files.
    glue_paths = {f.rel_path for f in files if f.category == "glue"}

    graph: dict[str, set[str]] = defaultdict(set)
    for f in files:
        graph.setdefault(f.rel_path, set())
        if f.rel_path in glue_paths:
            continue  # Don't let glue files create edges

        if f.package_identity:
            for peer in package_to_files.get(f.package_identity, set()):
                if peer != f.rel_path and peer not in glue_paths:
                    graph[f.rel_path].add(peer)
                    graph[peer].add(f.rel_path)

        for imp_mod in f.imports_modules:
            for target in provided_to_files.get(imp_mod, set()):
                if target != f.rel_path and target not in glue_paths:
                    graph[f.rel_path].add(target)
                    graph[target].add(f.rel_path)

    return dict(graph)


# ---------------------------------------------------------------------------
# Step 3: Multi-signal functional grouping
# ---------------------------------------------------------------------------

def group_files(
    files: list[SourceFile],
    workspace: Path,
    token_budget: int = DEFAULT_TOKEN_BUDGET,
) -> list[FileGroup]:
    """Group files into functional units using multiple signals.

    Signals (in priority order):
    1. Import graph connected components
    2. Directory co-location
    3. Filename prefix matching
    4. 30K token soft budget + 20 file limit

    Args:
        files: All source files in the module.
        workspace: Project root.
        token_budget: Soft token limit per group.

    Returns:
        List of FileGroups ready for sub-agent assignment.
    """
    if not files:
        return []

    # Separate test files — they always get their own group
    test_files = [f for f in files if f.category == "test"]
    non_test_files = [f for f in files if f.category != "test"]

    # If everything fits in one group, don't split
    total_eff = sum(f.effective_tokens for f in non_test_files)
    if total_eff <= token_budget and len(non_test_files) <= MAX_FILES_PER_GROUP:
        groups = [_make_group("main", non_test_files)]
        if test_files:
            groups.append(_make_group("tests", test_files))
        return groups

    # Signal 1: Import graph connected components
    dep_graph = build_file_dependency_graph(non_test_files, workspace)
    components = _find_connected_components(dep_graph, non_test_files)

    # Signal 2+3: Merge orphan files by directory + prefix
    groups = _merge_by_directory_and_prefix(components, token_budget)

    # Signal 4: Split oversized groups via min-cut
    final_groups: list[FileGroup] = []
    for group in groups:
        if group.total_effective_tokens > token_budget or len(group.files) > MAX_FILES_PER_GROUP:
            splits = _split_large_group(group, dep_graph, token_budget)
            final_groups.extend(splits)
        else:
            final_groups.append(group)

    # Merge tiny groups (< 3K effective tokens) with neighbors
    final_groups = _merge_tiny_groups(final_groups, token_budget)

    # Add test group
    if test_files:
        # Split tests into budget-sized chunks if needed
        test_groups = _chunk_files("tests", test_files, token_budget)
        final_groups.extend(test_groups)

    return final_groups


def _make_group(name: str, files: list[SourceFile]) -> FileGroup:
    """Create a FileGroup from a list of files."""
    g = FileGroup(name=name, files=[])
    for f in files:
        g.add(f)
    return g


def _find_connected_components(
    graph: dict[str, set[str]],
    files: list[SourceFile],
) -> list[list[SourceFile]]:
    """Find connected components in the file dependency graph."""
    file_map = {f.rel_path: f for f in files}
    visited: set[str] = set()
    components: list[list[SourceFile]] = []

    for f in files:
        if f.rel_path in visited:
            continue
        # BFS from this file
        component: list[SourceFile] = []
        queue = [f.rel_path]
        while queue:
            current = queue.pop(0)
            if current in visited:
                continue
            visited.add(current)
            if current in file_map:
                component.append(file_map[current])
            for neighbor in graph.get(current, set()):
                if neighbor not in visited:
                    queue.append(neighbor)
        if component:
            components.append(component)

    return components


def _merge_by_directory_and_prefix(
    components: list[list[SourceFile]],
    token_budget: int,
) -> list[FileGroup]:
    """Merge small connected components by directory and prefix signals.

    Small orphan files in the same directory with the same prefix
    get merged together. Remaining small files in the same directory
    get merged into a directory group up to the token budget.
    """
    # First pass: create initial groups from components
    groups: list[FileGroup] = []
    orphans: list[SourceFile] = []  # Single-file components

    for comp in components:
        if len(comp) == 1:
            orphans.append(comp[0])
        else:
            groups.append(_make_group(_name_group(comp), comp))

    if not orphans:
        return groups

    # Second pass: group orphans by directory + prefix
    dir_prefix_buckets: dict[tuple[str, str], list[SourceFile]] = defaultdict(list)
    for f in orphans:
        dir_name = str(Path(f.rel_path).parent)
        dir_prefix_buckets[(dir_name, f.prefix)].append(f)

    # Merge prefix buckets
    used_orphans: set[str] = set()
    for (dir_name, prefix), bucket in dir_prefix_buckets.items():
        if len(bucket) >= 2:
            groups.append(_make_group(prefix, bucket))
            for f in bucket:
                used_orphans.add(f.rel_path)

    # Remaining orphans: group by directory up to budget
    remaining = [f for f in orphans if f.rel_path not in used_orphans]
    if remaining:
        dir_buckets: dict[str, list[SourceFile]] = defaultdict(list)
        for f in remaining:
            dir_name = str(Path(f.rel_path).parent)
            dir_buckets[dir_name].append(f)

        for dir_name, bucket in dir_buckets.items():
            chunks = _chunk_files(Path(dir_name).name or "misc", bucket, token_budget)
            groups.extend(chunks)

    return groups


_MERGE_THRESHOLD = 3000  # Groups below this effective token count get merged


def _merge_tiny_groups(
    groups: list[FileGroup],
    token_budget: int,
) -> list[FileGroup]:
    """Merge tiny groups into neighbors to avoid wasting LLM calls."""
    if len(groups) <= 1:
        return groups

    large: list[FileGroup] = []
    tiny: list[FileGroup] = []
    for g in groups:
        if g.total_effective_tokens < _MERGE_THRESHOLD and len(g.files) <= 3:
            tiny.append(g)
        else:
            large.append(g)

    if not tiny:
        return groups

    # Merge tiny groups into a single "misc" group, or append to smallest large group
    merged_files: list[SourceFile] = []
    for g in tiny:
        merged_files.extend(g.files)

    if large:
        # Find smallest large group that can absorb
        smallest = min(large, key=lambda g: g.total_effective_tokens)
        if smallest.total_effective_tokens + sum(f.effective_tokens for f in merged_files) <= token_budget:
            for f in merged_files:
                smallest.add(f)
            return large

    # Otherwise create a misc group
    large.append(_make_group("misc", merged_files))
    return large


def _name_group(files: list[SourceFile]) -> str:
    """Generate a descriptive name for a group of files."""
    # Use most common prefix among non-glue files
    prefix_counts: dict[str, int] = defaultdict(int)
    for f in files:
        if f.category != "glue":
            prefix_counts[f.prefix] += 1

    if prefix_counts:
        top_prefix = max(prefix_counts, key=prefix_counts.get)  # type: ignore[arg-type]
        # If dominant prefix covers majority, use it
        if prefix_counts[top_prefix] >= len(files) * 0.4:
            return top_prefix

    # Fallback: use parent directory name
    if files:
        return Path(files[0].rel_path).parent.name or "misc"
    return "misc"


#: Hard limit on raw characters per group to prevent exceeding LLM
#: context window / instructions size limits (typically ~1M chars).
_MAX_RAW_CHARS_PER_GROUP = int(os.environ.get("AG_MAX_GROUP_CHARS", "800000"))


def _chunk_files(
    base_name: str,
    files: list[SourceFile],
    token_budget: int,
) -> list[FileGroup]:
    """Split a list of files into budget-sized chunks.

    Respects both the effective-token budget (for analysis quality) and
    a hard raw-character limit (to avoid exceeding LLM context limits).
    """
    if not files:
        return []

    groups: list[FileGroup] = []
    current = FileGroup(name=base_name, files=[])
    current_raw_chars = 0
    idx = 0

    for f in files:
        raw_chars = len(f.content)
        would_exceed_budget = (
            current.total_effective_tokens + f.effective_tokens > token_budget
        )
        would_exceed_chars = (
            current_raw_chars + raw_chars > _MAX_RAW_CHARS_PER_GROUP
        )
        if current.files and (would_exceed_budget or would_exceed_chars):
            groups.append(current)
            idx += 1
            current = FileGroup(name=f"{base_name}_{idx}", files=[])
            current_raw_chars = 0
        current.add(f)
        current_raw_chars += raw_chars

    if current.files:
        groups.append(current)

    return groups


# ---------------------------------------------------------------------------
# Step 4: Min-cut split for large functional groups
# ---------------------------------------------------------------------------

def _split_large_group(
    group: FileGroup,
    dep_graph: dict[str, set[str]],
    token_budget: int,
) -> list[FileGroup]:
    """Split a large functional group using hub-removal min-cut.

    1. Find the hub (most-imported file)
    2. Remove it from the graph
    3. Find connected components in the remainder
    4. Each component becomes a sub-group
    5. Hub full source goes to the largest component
    6. Other components get hub's function signatures as summary

    Args:
        group: Oversized FileGroup to split.
        dep_graph: Full module dependency graph.
        token_budget: Target token budget per sub-group.

    Returns:
        List of smaller FileGroups.
    """
    files = group.files
    if len(files) <= 2:
        return [group]

    file_map = {f.rel_path: f for f in files}
    group_paths = set(file_map.keys())

    # Find hub: file with most connections within this group
    hub_path = max(
        group_paths,
        key=lambda p: len(dep_graph.get(p, set()) & group_paths),
    )
    hub_file = file_map[hub_path]

    # Remove hub, find components in remainder
    remaining = [f for f in files if f.rel_path != hub_path]
    remaining_paths = {f.rel_path for f in remaining}

    # Build subgraph without hub
    sub_graph: dict[str, set[str]] = {}
    for p in remaining_paths:
        neighbors = dep_graph.get(p, set()) & remaining_paths
        sub_graph[p] = neighbors

    components = _find_connected_components(sub_graph, remaining)

    if len(components) <= 1:
        # Hub removal didn't help (everyone is still connected)
        # Fall back to chunking by file order
        return _chunk_files(group.name, files, token_budget)

    # Build sub-groups
    # Sort components by total connection strength to hub (descending)
    def hub_affinity(comp: list[SourceFile]) -> int:
        return sum(
            1 for f in comp
            if hub_path in dep_graph.get(f.rel_path, set())
        )

    components.sort(key=hub_affinity, reverse=True)

    # Hub full source goes to the most connected component
    hub_summary = _extract_signatures(hub_file)

    sub_groups: list[FileGroup] = []
    for i, comp in enumerate(components):
        name = f"{group.name}_{i}"
        if i == 0:
            # Most connected component gets hub full source
            sub_groups.append(_make_group(name, [hub_file] + comp))
        else:
            # Others get a synthetic summary file for hub context
            summary_semantics = (
                hub_file.semantics.model_copy(
                    update={
                        "rel_path": f"[summary] {hub_file.rel_path}",
                        "signature_summary": hub_summary,
                    }
                )
                if hub_file.semantics is not None
                else None
            )
            summary_file = SourceFile(
                rel_path=f"[summary] {hub_file.rel_path}",
                abs_path=hub_file.abs_path,
                content=hub_summary,
                language=hub_file.language,
                raw_tokens=len(hub_summary) // 4,
                category="interface",
                effective_tokens=len(hub_summary) // 4,
                prefix=hub_file.prefix,
                package_identity=hub_file.package_identity,
                imports_modules=list(hub_file.imports_modules),
                signature_summary=hub_summary,
                semantics=summary_semantics,
            )
            sub_groups.append(_make_group(name, [summary_file] + comp))

    # Recursively split if any sub-group is still too large
    final: list[FileGroup] = []
    for sg in sub_groups:
        if sg.total_effective_tokens > token_budget and len(sg.files) > 3:
            final.extend(_split_large_group(sg, dep_graph, token_budget))
        else:
            final.append(sg)

    return final


def _extract_signatures(source_file: SourceFile) -> str:
    """Return the adapter-provided signature summary for a source file."""
    if source_file.signature_summary:
        return source_file.signature_summary
    if source_file.semantics and source_file.semantics.signature_summary:
        return source_file.semantics.signature_summary
    lines = source_file.content.splitlines()[:100]
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Step 5: Format groups for agent context
# ---------------------------------------------------------------------------

def format_group_context(group: FileGroup) -> str:
    """Format a FileGroup's files into a single context string for an agent.

    Args:
        group: FileGroup with pre-loaded file contents.

    Returns:
        Formatted string with all file contents, ready for agent instructions.
    """
    parts: list[str] = [
        f"# File Group: {group.name}",
        f"# Files: {len(group.files)} | Tokens: ~{group.total_tokens}",
        "",
    ]

    for f in group.files:
        is_summary = f.rel_path.startswith("[summary]")
        header = f"{'=' * 60}"
        label = f"[{f.category.upper()}]" if not is_summary else "[HUB SUMMARY]"
        parts.append(header)
        parts.append(f"# {label} {f.rel_path}")
        parts.append(header)
        parts.append(f.content)
        parts.append("")

    return "\n".join(parts)
