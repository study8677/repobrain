# CLAUDE.md

Claude Code bootstrap file.

Primary behavior rules live in `AGENTS.md`.

<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

Before acting:
1. Read `AGENTS.md`.
2. For spec or proposal work, follow `openspec/AGENTS.md`.
3. Load project context from `CONTEXT.md`, `.antigravity/`, and `mission.md` only as needed.
