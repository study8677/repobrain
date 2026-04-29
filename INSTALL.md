# Installing the Antigravity plugin

## Claude Code

```
/plugin marketplace add /absolute/path/to/antigravity-workspace-template
/plugin install antigravity@antigravity
```

The first session after install runs `hooks/install_engine.sh`, which auto-installs the engine via `pipx` (preferred) or `pip --user`. If both fail, follow the printed manual command and restart the session.

You can also add the marketplace directly from GitHub:

```
/plugin marketplace add study8677/antigravity-workspace-template
/plugin install antigravity@antigravity
```

## Codex CLI

Codex CLI does not auto-run install hooks (as of April 2026), so install the engine first:

```
pipx install /absolute/path/to/antigravity-workspace-template/engine
ag-mcp --help    # verify
```

Then register and install the plugin:

```
codex plugin marketplace add /absolute/path/to/antigravity-workspace-template
codex plugin install antigravity
```

## Verifying

- **Claude Code**: `/ag-ask "what does the engine do?"` should invoke `mcp__antigravity__ask_project`.
- **Codex CLI**: confirm the `antigravity` MCP server appears in your Codex MCP server list.

## Available slash commands (Claude Code)

| Command | What it does |
|---|---|
| `/ag-ask <question>` | Routed Q&A on the current codebase |
| `/ag-refresh [quick]` | Rebuild the project knowledge base |
| `/ag-init <name>` | Scaffold a new multi-agent repo from this template |

## Bundled MCP tools

After install, the `antigravity` MCP server exposes:

- `ask_project(question)` — routed Q&A with file paths and line numbers
- `refresh_project(quick=False)` — rebuild knowledge base

## Uninstall

```
pipx uninstall antigravity-engine
/plugin uninstall antigravity
```

## Requirements

- Python 3.10+ on PATH (`python3` / `python`)
- `pipx` recommended (`brew install pipx`, `apt install pipx`, or `python3 -m pip install --user pipx`)
- Network access on first launch (for the auto-installer)

## Troubleshooting

**`ag-mcp` not found after install**
The user-pip bin directory may not be on PATH. The installer prints the path; add it to your shell rc file (`~/.zshrc`, `~/.bashrc`, etc.).

**Hook timed out**
Slow network during first install. Increase the `timeout` in `hooks/hooks.json` or run `pipx install <plugin-root>/engine` manually before restarting.

**Codex CLI marketplace add fails**
Codex's marketplace schema is partially undocumented. If `codex plugin marketplace add <path>` rejects the repo, you can still register the MCP server directly via your local Codex CLI MCP config and load skills from `<path>/skills/` manually.
