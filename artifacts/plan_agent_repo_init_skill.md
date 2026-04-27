# Plan: Add `agent-repo-init` Skill

## Goal
Create a reusable skill named `agent-repo-init` that can initialize a new agent repository from this template, then document it in multilingual README and docs.

## Scope
1. Add skill folder under `src/skills/agent-repo-init/`.
2. Implement a deterministic initialization tool in `tools.py`.
3. Add skill instructions in `SKILL.md`.
4. Add/extend tests for initialization behavior.
5. Update multilingual README files and docs to explain the new skill.
6. Run targeted tests and save logs in `artifacts/logs/`.

## Deliverables
- `src/skills/agent-repo-init/SKILL.md`
- `src/skills/agent-repo-init/tools.py`
- `tests/test_agent_repo_init_skill.py`
- Updates to:
  - `README.md`
  - `README_CN.md`
  - `README_ES.md`
  - `docs/en/README.md`
  - `docs/zh/README.md`
  - `docs/es/README.md`
  - `docs/en/ZERO_CONFIG.md`
  - `docs/zh/ZERO_CONFIG.md`
  - `docs/es/ZERO_CONFIG.md`

## Validation
- Run: `pytest tests/test_agent_repo_init_skill.py -v`
- Save output to: `artifacts/logs/test_agent_repo_init_skill.log`

## Notes
- `openspec` CLI is not available in this environment (`command not found`), so OpenSpec validation steps cannot be executed here.
