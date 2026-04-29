#!/usr/bin/env bash
# SessionStart hook: ensure ag-mcp is on PATH. Idempotent and silent on the happy path.
set -u

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"

if command -v ag-mcp >/dev/null 2>&1; then
  exit 0
fi

echo "[antigravity] ag-mcp not found. Attempting auto-install..." >&2

if command -v pipx >/dev/null 2>&1; then
  if pipx install "${PLUGIN_ROOT}/engine" 1>&2 2>&1; then
    if command -v ag-mcp >/dev/null 2>&1; then
      echo "[antigravity] Installed via pipx." >&2
      exit 0
    fi
  fi
fi

if command -v python3 >/dev/null 2>&1; then
  if python3 -m pip install --user --quiet "${PLUGIN_ROOT}/engine" "${PLUGIN_ROOT}/cli" 1>&2 2>&1; then
    USER_BIN="$(python3 -c 'import site,os;print(os.path.join(site.USER_BASE,"bin"))' 2>/dev/null || true)"
    if [ -x "${USER_BIN}/ag-mcp" ] || command -v ag-mcp >/dev/null 2>&1; then
      echo "[antigravity] Installed via pip --user. If 'ag-mcp' still missing from PATH, add: ${USER_BIN}" >&2
      exit 0
    fi
  fi
fi

cat >&2 <<EOF
[antigravity] AUTO-INSTALL FAILED. Run ONE of these manually:

  Option A (recommended):
    pipx install "${PLUGIN_ROOT}/engine"

  Option B:
    python3 -m pip install --user "${PLUGIN_ROOT}/engine" "${PLUGIN_ROOT}/cli"

Then ensure the bin dir is on PATH and restart your Claude Code session.
EOF
exit 1
