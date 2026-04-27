# Change: Add Knowledge Hub — Transform Engine into Project Knowledge Hub

## Why

Engine lacks a focused product identity. The core thesis — "AI Agent's capability ceiling = the quality of context it can read" — needs a concrete realization: a multi-agent system that maintains project context files, making all AI IDEs smarter. Currently the engine is a generic agent runtime without a clear value proposition for end users.

## What Changes

- **BREAKING**: Rename `engine/src/` to `engine/antigravity_engine/` — all imports change from `from src.X` to `from antigravity_engine.X`
- Replace `engine/requirements.txt` with `engine/pyproject.toml` (Hatchling) — engine becomes an installable package with console scripts (`ag-engine`, `ag-hub`)
- Add Knowledge Hub agents (OpenAI Agent SDK): scanner, refresh pipeline, ask pipeline
- Add CLI commands: `ag ask`, `ag refresh`, `ag report`, `ag log-decision`, `ag hooks install`
- Update `.antigravity/` templates with self-contained inline rules
- Add IDE config templates: `CLAUDE.md`, `AGENTS.md`, `.windsurfrules`, `.clinerules`, `.github/copilot-instructions.md`
- Update all documentation (en/zh/es) to reflect new package structure

## Impact

- Affected specs: `deployment` (MODIFIED — package install replaces requirements.txt)
- Affected specs: `knowledge-hub` (ADDED — new capability)
- Affected code: All engine source files (import rename), all engine tests, CLI, Dockerfile, CI workflow, install scripts, all docs (en/zh/es)
