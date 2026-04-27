# Plan: Agent Repo Init Skill with Quick/Full Modes

## Goal
Implement a reusable `agent-repo-init` skill that supports one-click initialization in both `quick` and `full` modes, and place the portable skill in a new top-level directory.

## Scope
1. Add a reusable core initializer module.
2. Add a new portable skill directory: `skills/agent-repo-init/`.
3. Provide a CLI entrypoint for cross-agent usage.
4. Update in-repo `src/skills/agent-repo-init` wrapper to expose both modes.
5. Extend tests for quick/full behavior.
6. Save test logs in `artifacts/logs/`.

## Modes
- `quick`: copy template to target and prepare minimal runnable structure.
- `full`: quick mode + environment/profile customization (provider, MCP, swarm preference, sandbox mode), optional git init.

## Validation
- `pytest tests/test_agent_repo_init_skill.py -v`
- `python -m py_compile` for new/updated Python files.
