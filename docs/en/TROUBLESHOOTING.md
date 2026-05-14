# Antigravity Troubleshooting

## Normal Claude Code Flow

```bash
/plugin marketplace add study8677/antigravity-workspace-template
/plugin install antigravity@antigravity
/antigravity:ag-setup
/antigravity:ag-refresh
/antigravity:ag-ask "How does this project work?"
```

The first refresh creates the project-local `.antigravity/` knowledge directory automatically.

## CLI Command Not Found

Symptom:

```text
ag-refresh: command not found
```

This means the engine CLI is not installed or its bin directory is not on `PATH`.
Install it manually:

```bash
pipx install "git+https://github.com/study8677/antigravity-workspace-template.git#subdirectory=engine"
```

This is not an API key failure. Do not rerun setup unless `/antigravity:ag-setup` has never completed.

## Missing LLM Configuration

Symptom:

```text
No LLM configured
```

Run `/antigravity:ag-setup` in the project root. It writes `.env` with the provider URL, API key, and model. Do not commit `.env`.

## Project Initialization

`/antigravity:ag-refresh` initializes `.antigravity/` automatically. It is safe to run repeatedly and does not overwrite existing knowledge files just to initialize the directory.

`/antigravity:ag-init` is for scaffolding a new repository from this template; it is not a required step before refresh.

## Optional MCP Diagnostic Log

If you manually register `ag-mcp`, it writes startup and tool errors to:

```text
~/.claude/plugins/data/antigravity-antigravity/ag-mcp.log
```

When Claude Code provides a plugin data directory, the log is written there instead. The log directory is created with `0700` permissions and the log file with `0600`; logged errors are redacted and must not contain API key values.

## Manual Verification Checklist

Use this checklist for behavior that requires a real Claude Code session:

- Fresh session after plugin install: `/antigravity:ag-refresh` runs `ag-refresh` through Bash.
- Ask command: `/antigravity:ag-ask "How does this project work?"` runs `ag-ask` through Bash.
- Missing CLI: `/antigravity:ag-refresh` tells the user to install the engine CLI, not to change API keys.
- First refresh in a clean project: `.antigravity/manifest.json` and knowledge artifacts are created without running `/antigravity:ag-init`.
- Missing LLM config: the tool points to `/antigravity:ag-setup`.
- Optional MCP startup failure: `ag-mcp.log` exists at the diagnostic path and contains no API key values.
