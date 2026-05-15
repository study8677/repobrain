# Contributing

Thanks for improving Antigravity. The project direction is a repository
knowledge engine first; plugins, MCP, and templates are delivery paths around
that core.

## Before You Start

1. Read `README.md` and `VERSIONING.md`.
2. For behavior changes, add or update focused tests.
3. Keep docs aligned when you change install flows, environment variables,
   supported Python versions, or plugin commands.

## Local Setup

```bash
python3 -m venv venv
source venv/bin/activate
pip install -e ./cli -e './engine[dev]'
```

## Checks

Run the checks that match your change:

```bash
python scripts/check_repo_contract.py
pytest engine/tests cli/tests
```

For Docker changes:

```bash
docker compose config --quiet
docker build -t antigravity-local .
docker build -f Dockerfile.sandbox -t antigravity-sandbox-local .
```

## Versioning

Engine, CLI, and plugin versions may advance independently. Plugin metadata must
stay aligned across Claude Code, Claude marketplace, and Codex manifests. See
`VERSIONING.md` before changing versions.

## Pull Requests

Use a narrow scope. Explain the user-visible contract you changed, list the
checks you ran, and call out any skipped checks with the reason.
