---
name: agent-repo-init
description: Bootstraps a new multi-agent repository from the Antigravity template via `init_agent_repo`. Supports quick scaffold and full runtime profile setup including LLM provider, MCP toggle, swarm preference, sandbox type, and optional git init.
---

# Agent Repo Init Skill

This skill bootstraps a new multi-agent repository from the Antigravity template.

## Usage
When asked to initialize a fresh repository from this template, call `init_agent_repo`.

## Modes
- `quick`: Fast clean scaffold.
- `full`: Quick scaffold plus runtime profile setup (`.env`, mission, context profile, and init report).

## Capabilities
- `init_agent_repo(project_name, destination_root=".", mode="quick", llm_provider="gemini", enable_mcp=False, enable_swarm=True, sandbox_runtime="local", init_git=False) -> dict`

## Notes
- The destination is created as `<destination_root>/<project_name>`.
- The destination must be outside the current template repository path.
- For `full` mode, review `.context/agent_runtime_profile.md` after generation.
