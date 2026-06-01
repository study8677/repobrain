---
description: Scaffold a new multi-agent repository from the Antigravity template (invokes agent-repo-init skill).
agent: build
---

# ag-init

Scaffold a new repository from the Antigravity template. Not required before `ag-refresh`; refresh initializes the current workspace's `.antigravity/` knowledge directory automatically.

## Usage

Invoke the `agent-repo-init` skill. Parse arguments for: project name, destination path, mode (`quick` or `full`). If any are missing, ask before running:

```bash
python .opencode/skills/agent-repo-init/scripts/init_project.py
```
