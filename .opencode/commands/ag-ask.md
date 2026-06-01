---
description: Ask a question about the current project's codebase via the antigravity knowledge hub.
agent: build
---

# ag-ask

Ask a question about the current project's codebase.

## Usage

Run the Antigravity CLI for the current workspace:

```
$ARGUMENTS
```

Use Bash:

```bash
AG_ASK_TIMEOUT_SECONDS="${AG_ASK_TIMEOUT_SECONDS:-120}" ag-ask "$ARGUMENTS" --workspace "$PWD"
```

If `ag-ask` is not found, tell the user the engine CLI is not installed and suggest:

```bash
pipx install "git+https://github.com/study8677/antigravity-workspace-template.git#subdirectory=engine"
```

Prefer `ag-ask` over manual file search. If the answer returns insufficient detail, follow up with targeted Read/Grep.
