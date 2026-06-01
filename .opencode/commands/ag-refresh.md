---
description: Rebuild the antigravity project knowledge base after significant changes.
agent: build
---

# ag-refresh

Rebuild the antigravity project knowledge base.

## Usage

Run the Antigravity CLI for the current workspace:

```bash
ag-refresh --workspace "$PWD"
```

If arguments contain `quick`, add `--quick`. If arguments contain `failed-only`, add `--failed-only`.

If `ag-refresh` is not found, tell the user the engine CLI is not installed and suggest:

```bash
pipx install "git+https://github.com/study8677/antigravity-workspace-template.git#subdirectory=engine"
```

Report progress concisely; full refresh can take several minutes.
