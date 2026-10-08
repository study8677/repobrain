# RepoBrain usage reference

For installation, backend configuration, and local runner templates (including Trae), see [INSTALL.md](../../INSTALL.md). This page covers commands after installation.

## Refresh and ask

Run these commands in your project's root directory:

```bash
rb-refresh
rb-ask "How does authentication work?"
```

`rb-refresh` automatically builds the first complete knowledge base, updates an existing one incrementally, or resumes a matching unfinished task. If the knowledge base is already current, it skips generation. After a failure, run the same command again. To deliberately start a complete rebuild:

```bash
rb-refresh --full
```

Refresh uses committed Git code and requires a clean working tree. The first build can take several minutes or longer for a large repository. A failed refresh keeps the previously published knowledge base available. `rb-ask` warns when knowledge is behind the current commit; asking never refreshes it.

`--workspace` means the project directory and defaults to the current directory (`.`). Use an explicit path when running elsewhere:

```bash
rb-refresh --workspace /path/to/project
rb-ask "Where are the tests?" --workspace /path/to/project
```

The engine package provides `rb-refresh`, `rb-ask`, and `rb-mcp`. The CLI package provides template injection, diagnostics, and offline notes. With both packages installed, `rb refresh` and `rb ask` delegate to the same engine and accept the same `--full`, `--json`, and `--workspace` options for their respective commands. Installation details are in [INSTALL.md](../../INSTALL.md).

## Calling from a script or another agent

Use JSON output when the caller can run a shell command:

```bash
rb-ask "How does authentication work?" --workspace /path/to/project --json
```

A successful call writes this envelope to stdout and exits with code `0`:

```json
{
  "answer": "Authentication is handled in src/auth.py …",
  "sources": ["src/auth.py:12"],
  "limitations": [],
  "workspace": "/path/to/project",
  "question": "How does authentication work?"
}
```

On a query execution failure, stdout stays empty, stderr receives `{"error": "..."}`, and the exit code is nonzero. Invalid CLI arguments are rejected by the argument parser; interruption exits with code `130`. The equivalent wrapper is `rb ask "question" --json`.

## Plugin slash commands

Slash commands run inside the installed plugin's host, rather than as shell executables:

| Purpose | Claude Code | Codex CLI |
|---|---|---|
| Configure a backend | `/repobrain:rb-setup` | `/rb-setup` |
| Automatically refresh | `/repobrain:rb-refresh` | `/rb-refresh` |
| Force a complete rebuild | `/repobrain:rb-refresh --full` | `/rb-refresh --full` |
| Ask about the project | `/repobrain:rb-ask <question>` | `/rb-ask <question>` |
| Scaffold a new repository | `/repobrain:rb-init <name>` | `/rb-init <name>` |

Setup is needed only when the backend is not configured. There is no standalone `rb-setup` shell command; shell users configure `.env` as described in [INSTALL.md](../../INSTALL.md).

## Optional context files and notes

`rb init` injects shared instructions and IDE bootstrap files into a target directory. It is optional; refresh creates its own knowledge directory without it.

```bash
rb init /path/to/project
rb init /path/to/project --force
```

The first command skips existing files; `--force` overwrites them. Review generated files before committing. `AGENTS.md` supplies the shared rules, while IDE-specific files point to those rules.

The slash command `rb-init` has a different purpose: it invokes the `agent-repo-init` skill to scaffold a new repository from the RepoBrain template. It is not a prerequisite for refreshing an existing project. See [Zero-Config Features](ZERO_CONFIG.md) for the template workflow.

You can also record findings and decisions without a model call:

```bash
rb report "The authentication module needs refactoring"
rb log-decision "Use PostgreSQL" "The team has operational experience"
```

Reports go to `.repobrain/memory/reports.md`; decisions go to `.repobrain/decisions/log.md`. Both commands accept `--workspace /path/to/project`.

## Diagnostics

```bash
rb doctor --workspace /path/to/project
```

Doctor checks engine availability, configuration, provider reachability, knowledge health, and diagnostic log locations. It does not generate knowledge. Generic local runners have limited diagnostic coverage; check their own login and command configuration separately. See [Troubleshooting](TROUBLESHOOTING.md) for common installation and session issues.

## Exposing RepoBrain as an MCP server

Use this route for a client that consumes MCP tools. Build the knowledge base, then register the stdio server, for example in Claude Code:

```bash
rb-refresh --workspace /path/to/project
claude mcp add repobrain rb-mcp -- --workspace /path/to/project
```

For other clients, use the [example MCP configuration](../examples/repobrain.mcp.json), replacing the project path and ensuring `rb-mcp` is on the client's PATH. The server exposes `ask_project(question)` and `refresh_project(full=False)`. Asking is read-only; refreshing updates the knowledge base, with `full=True` forcing a new complete build.

This server integration is separate from RepoBrain consuming external MCP servers such as databases or GitHub. See [MCP Integration](MCP_INTEGRATION.md) for external tools, [Sandbox Execution](SANDBOX.md) for execution boundaries, and [Swarm Protocol](SWARM_PROTOCOL.md) for internal routing and generation details.
