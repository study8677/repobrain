# Installing the Antigravity plugin

## Claude Code

```
/plugin marketplace add study8677/antigravity-workspace-template
/plugin install antigravity@antigravity
/antigravity:ag-setup
/antigravity:ag-refresh
/antigravity:ag-ask "what does this project do?"
```

1. **Marketplace add** — clones the plugin manifest into Claude Code's cache.
2. **Install** — first session triggers `hooks/install_engine.py`, which auto-installs the engine CLI (`ag-ask`, `ag-refresh`, `ag-mcp`) via `pipx` (preferred), `pip --user` fallback, or prints a manual command if both fail. Cross-platform (macOS / Linux / Windows).
3. **Setup** — interactive: choose your LLM provider (OpenAI / DeepSeek / Groq / 阿里灵积 / NVIDIA / Ollama), paste your API key, writes a `.env` to the current project root and ensures it's git-ignored.
4. **Refresh** — runs `ag-refresh` directly and builds `.antigravity/` for the current project. The first refresh creates the project knowledge directory automatically.
5. **Ask** — runs `ag-ask` directly and queries the refreshed project knowledge base.

MCP is optional. If you want tool-style integration in an MCP-compatible host, register `ag-mcp --workspace <project>` separately.
An example MCP config lives at `docs/examples/antigravity.mcp.json`.

You can also add the marketplace from a local checkout:

```
/plugin marketplace add /absolute/path/to/antigravity-workspace-template
```

## Codex CLI

Codex CLI does not auto-run install hooks (as of April 2026), so install the engine first:

```
pipx install /absolute/path/to/antigravity-workspace-template/engine
ag-refresh --help    # verify
```

Then register and install the plugin:

```
codex plugin marketplace add /absolute/path/to/antigravity-workspace-template
```

Codex auto-discovers slash commands from the plugin's `commands/` directory (no manifest entry required), so the same four commands are available without the `antigravity:` prefix:

```
/ag-setup
/ag-refresh
/ag-ask "what does this project do?"
/ag-init my-new-project
```

You can also keep using the raw CLI directly: `ag-refresh --workspace <project>` and `ag-ask "question" --workspace <project>`.
If your Codex build supports MCP and you want tool-style integration, register
`ag-mcp --workspace <project>` separately in your Codex MCP configuration.

## Verifying

- **Claude Code**: `/antigravity:ag-ask "what does the engine do?"` should run `ag-ask` and print a routed answer.
- **Codex CLI**: `/ag-ask "what does the engine do?"` (or `ag-ask "..." --workspace <project>` from the shell) should print a routed answer.

## Available slash commands

Same four commands ship to both hosts. Claude Code namespaces them as `/antigravity:<name>`; Codex CLI surfaces them as bare `/<name>`.

| Claude Code | Codex CLI | What it does |
|---|---|---|
| `/antigravity:ag-setup` | `/ag-setup` | **First-time setup** — interactive `.env` writer (LLM provider + key + model) |
| `/antigravity:ag-refresh [quick]` | `/ag-refresh [quick]` | Rebuild / incrementally update the project knowledge base |
| `/antigravity:ag-ask <question>` | `/ag-ask <question>` | Routed Q&A on the current codebase |
| `/antigravity:ag-init <name>` | `/ag-init <name>` | Scaffold a new multi-agent repo from this template |

The plugin also bundles the `agent-repo-init` skill (description-matched in either host), which is what `/ag-init` invokes under the hood.

## Optional MCP tools

If you manually register `ag-mcp`, the `antigravity` MCP server exposes:

- `ask_project(question)` — routed Q&A with file paths and line numbers
- `refresh_project(quick=False)` — rebuild knowledge base

Example config: [docs/examples/antigravity.mcp.json](docs/examples/antigravity.mcp.json)

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

**`ag-ask` / `ag-refresh` not found after install**
The user-pip bin directory may not be on PATH. The installer prints the path; add it to your shell rc file (`~/.zshrc`, `~/.bashrc`, etc.).

**Optional MCP tool is not connected**
The default slash commands do not require MCP. If you manually enabled `ag-mcp`, restart the MCP host so it reloads server configuration.

**Diagnostic log**
`ag-mcp` writes startup and tool errors to `~/.claude/plugins/data/antigravity-antigravity/ag-mcp.log` unless Claude provides a plugin data directory.

**Do I need `/ag-init` before refresh?**
No. `/ag-refresh` initializes the current project's `.antigravity/` directory automatically. `/ag-init` is for scaffolding a new repository from the Antigravity template.

**Hook timed out**
Slow network during first install. Increase the `timeout` in `hooks/hooks.json` or run `pipx install <plugin-root>/engine` manually before restarting.

**Codex CLI marketplace add fails or does not auto-load the plugin**
Codex's marketplace/plugin workflow varies by CLI build. If `codex plugin marketplace add <path>` rejects the repo, or if your build only registers the marketplace without installing plugins, register the MCP server directly via your local Codex CLI MCP config and load skills + commands from `<path>/skills/` and `<path>/commands/` manually.
