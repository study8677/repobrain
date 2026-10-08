---
name: knowledge-layer
description: High-level deployment wrapper over RepoBrain core with graph-first knowledge injection and all-file support. Exposes `refresh_filesystem` and `ask_filesystem` for building and querying the knowledge graph.
---

# Knowledge Layer Skill

## Purpose
Provide a high-level deployment wrapper over RepoBrain core, with graph-first
knowledge injection and all-file support (code, docs, data, media metadata).

## Inputs
- `refresh_filesystem(workspace=".", full=False)`
- `ask_filesystem(question, workspace=".")`

Refresh automatically chooses a first complete build, matching interrupted-task
resume, committed-diff update, or no-op. `full=True` always starts a new complete
build. The workspace defaults to the current directory and must be a clean Git
worktree. Ask stays read-only and only suggests `rb-refresh` when knowledge is
stale. Both refresh surfaces report failures without replacing usable knowledge.

## Outputs
- Refresh writes graph-first artifacts under `.repobrain/`:
  - `knowledge_graph.json`
  - `knowledge_graph.md`
  - `knowledge_graph.mmd`
  - `document_index.md`
  - `data_overview.md`
  - `media_manifest.md`
  - plus existing `conventions.md` and `structure.md`
- Ask returns a grounded answer with source paths.

## Boundaries
- Skill is a wrapper layer only; no standalone runtime.
- Core Hub/Agent/Pipeline architecture remains the source of truth.

## Compatibility
- Existing commands (`rb-refresh`, `rb-ask`, `rb-mcp`) remain valid.
- High-level aliases can be disabled with `RB_ENABLE_LAYER_ALIASES=0`.

## Degrade Strategy
- If graph artifacts are unavailable, ask falls back to `structure.md` and
  `conventions.md` context.
