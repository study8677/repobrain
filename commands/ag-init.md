---
description: Scaffold a new multi-agent repository from the Antigravity template (invokes agent-repo-init skill).
---

Invoke the `agent-repo-init` skill. Parse $ARGUMENTS for: project name, destination path, mode (`quick` or `full`). If any are missing, ask before running `${CLAUDE_PLUGIN_ROOT}/skills/agent-repo-init/scripts/init_project.py`.
