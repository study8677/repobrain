## Context

The Antigravity Engine is a production-grade agent runtime but lacks a focused product identity. This change transforms it into a "Knowledge Hub" — a multi-agent system that maintains project context files, making all AI IDEs smarter.

## Goals / Non-Goals

- Goals:
  - Make engine an installable Python package (`pip install`)
  - Provide CLI commands (`ag ask`, `ag refresh`, `ag report`, `ag log-decision`)
  - Support multiple LLM backends via OpenAI Agent SDK + LiteLLM
  - Maintain backward compatibility for existing engine users
- Non-Goals:
  - Real-time file watching (Phase 3, post-MVP)
  - Git hook auto-installation (Phase 3)
  - Migration tooling for old versions (Phase 3)

## Decisions

- **Decision: Dual-package distribution** — `cli/` (lightweight, no LLM deps) and `engine/` (full runtime with LLM deps) remain separate packages.
  - Alternatives: Single monolithic package (rejected — too heavy for users who just want `ag init`), three packages (rejected — unnecessary complexity).

- **Decision: Rename `src/` to `antigravity_engine/`** — Standard Python packaging requires the package directory name to match the import name. `src` conflicts with user projects.
  - Alternatives: Keep `src/` with `src_layout` (rejected — `from src.X` is confusing and conflicts), use `src/antigravity_engine/` layout (rejected — adds unnecessary nesting).

- **Decision: OpenAI Agent SDK for hub agents** — Provides structured agent orchestration with tool use, handoffs, and guardrails out of the box. `openai-agents[litellm]` enables any LLM backend.
  - Alternatives: Raw LLM calls (rejected — reinventing orchestration), LangChain (rejected — too heavy, too many abstractions).

- **Decision: `_cli_entry.py` bootstrap pattern** — Console scripts must set `WORKSPACE_PATH` env var BEFORE importing `config.py` (which reads it at module level). A thin bootstrap module handles this.
  - Alternatives: Lazy settings (rejected — too invasive to existing code), click-based CLI (rejected — engine already uses argparse).

## Risks / Trade-offs

- **Breaking import change** (`from src.X` → `from antigravity_engine.X`) — Mitigated by updating all internal imports and tests in a single atomic step.
- **New dependency** (`openai-agents[litellm]`) — Only needed for hub agents, not core engine functionality.

## Open Questions

- None — all major decisions resolved.
