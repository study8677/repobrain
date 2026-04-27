# Plan: Make agent-repo-init Skill Portable

## Goal
Ensure `skills/agent-repo-init/` can be reused by other agents (Codex, Claude Code) without importing project `src/` modules.

## Scope
1. Refactor `skills/agent-repo-init/scripts/init_project.py` to be self-contained.
2. Keep quick/full behavior parity.
3. Add a portability test for the script entrypoint.
4. Run targeted tests and save logs.
