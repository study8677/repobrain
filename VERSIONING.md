# Versioning Contract

RepoBrain is published through several surfaces, so version numbers do not all
mean the same thing.

## Versioned Surfaces

| Surface | File | Meaning |
|---|---|---|
| Engine | `engine/pyproject.toml` | Runtime package that provides `rb-ask`, `rb-refresh`, and `rb-mcp`. |
| CLI | `cli/pyproject.toml` | Lightweight `rb` command for templates and offline helpers. |
| Plugins | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.codex-plugin/plugin.json` | Host integration metadata for Claude Code and Codex CLI. |

The engine and plugin metadata share the public product version because plugin
commands invoke the engine entrypoints. The CLI package may advance
independently because it is a lightweight helper package with a separate public
contract.

Plugin metadata must stay aligned across Claude Code, Claude marketplace, Codex
plugin manifests, `engine/pyproject.toml`, and `engine/repobrain_engine/__init__.py`.
The CLI version must stay aligned between `cli/pyproject.toml` and
`cli/src/rb_cli/__init__.py`.

`scripts/check_repo_contract.py` compares runtime changes with the nearest
reachable `v*` tag. Engine/plugin or CLI runtime changes after that tag require
a strictly newer corresponding package version.

## Python Support

The supported Python range is declared in both Python packages:

- `engine/pyproject.toml`
- `cli/pyproject.toml`

Both packages currently require Python 3.10 or newer. CI should test the
supported minor versions that the project commits to, currently 3.10, 3.11, and
3.12.

## Release Checklist

1. Decide which surfaces changed: engine, plugin metadata, CLI, docs, or all.
2. Keep the engine and plugin product version identical.
3. Update the CLI version only when the `rb` helper contract changes.
4. Run `python scripts/check_repo_contract.py`.
5. Run the engine and CLI test suites before tagging a release.
6. Run `python scripts/check_clean_install.py --mode all` to verify a fresh
   plugin install and an upgrade from the previous release.
