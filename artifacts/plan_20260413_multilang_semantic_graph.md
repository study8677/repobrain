# Plan: Language-Agnostic Semantic Graph and Grouping

## Goal
- Replace the duplicated Python-centric semantic parsing paths in
  `knowledge_graph.py` and `module_grouping.py` with a shared,
  adapter-driven semantic layer.
- Preserve current Python behavior while adding first-class Go semantics.

## Constraints
- Keep refresh/ask pipeline changes minimal and integration-focused.
- Unsupported languages must degrade gracefully without raising.
- No mandatory Node/npm parser dependency.
- Root `.cursorrules`, `.antigravity/rules.md`, and `CONTEXT.md` are not
  present in this repo snapshot; `AGENTS.md` and `openspec/AGENTS.md` are the
  active governing docs that were available to read.
- `openspec` CLI is not installed in this environment, so OpenSpec state was
  inspected from files on disk instead of via CLI commands.

## Implementation
- Add a shared semantic layer under `engine/antigravity_engine/hub/` with:
  - typed language-neutral models
  - adapter protocol and registry
  - Python, Go, and generic fallback adapters
  - shared helpers for workspace-level and per-file semantic analysis
- Refactor `knowledge_graph.py` to build semantic nodes and edges from the
  shared semantic index rather than inline Python AST walking.
- Refactor `module_grouping.py` so file loading, dependency graph building, and
  hub signature summaries come from shared semantic output rather than `.py`
  checks.
- Keep directory/prefix grouping heuristics only as fallback after semantic
  connectivity.

## Verification
- Add deterministic tests for:
  - Python semantic regression
  - Go semantic extraction
  - Go knowledge graph edges
  - Go semantic grouping
  - Mixed Python/Go workspace stability
  - Unsupported-language graceful fallback
- Run focused engine tests and save command output under `artifacts/logs/`.
