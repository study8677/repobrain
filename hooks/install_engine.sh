#!/usr/bin/env bash
# SessionStart hook: ensure ag-mcp is on PATH. Idempotent and silent on the happy path.
set -u

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"

if command -v ag-mcp >/dev/null 2>&1; then
  exit 0
fi

echo "[antigravity] ag-mcp not found. Attempting auto-install..." >&2

# Step 1: ensure pipx exists.
#
# Hook runs without a TTY, so anything requiring `sudo` will hang. We pick the
# safest available path:
#   - macOS with Homebrew → `brew install pipx` (no sudo)
#   - Anything else with python3 → `pip install --user pipx` (no sudo)
# Linux users who prefer `apt`/`dnf` get a clear instruction in the final
# fallback message below.
if ! command -v pipx >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    echo "[antigravity] Installing pipx via Homebrew..." >&2
    brew install pipx 1>&2 2>&1 || true
  elif command -v python3 >/dev/null 2>&1; then
    echo "[antigravity] Installing pipx via pip --user..." >&2
    python3 -m pip install --user --quiet pipx 1>&2 2>&1 || true
    if [ -d "${HOME}/.local/bin" ]; then
      export PATH="${HOME}/.local/bin:${PATH}"
    fi
  fi
fi

# Step 2: ensure pipx is on PATH (ensurepath is a no-op if already configured).
if command -v pipx >/dev/null 2>&1; then
  pipx ensurepath 1>&2 2>&1 || true
  if [ -d "${HOME}/.local/bin" ]; then
    export PATH="${HOME}/.local/bin:${PATH}"
  fi
fi

# Step 3: install antigravity-engine via pipx.
if command -v pipx >/dev/null 2>&1; then
  if pipx install "${PLUGIN_ROOT}/engine" 1>&2 2>&1; then
    if command -v ag-mcp >/dev/null 2>&1; then
      echo "[antigravity] Installed via pipx." >&2
      exit 0
    fi
  fi
fi

# Step 4: fallback to pip --user if pipx is still unavailable.
if command -v python3 >/dev/null 2>&1; then
  if python3 -m pip install --user --quiet "${PLUGIN_ROOT}/engine" "${PLUGIN_ROOT}/cli" 1>&2 2>&1; then
    USER_BIN="$(python3 -c 'import site,os;print(os.path.join(site.USER_BASE,"bin"))' 2>/dev/null || true)"
    if [ -n "${USER_BIN}" ] && [ -d "${USER_BIN}" ]; then
      export PATH="${USER_BIN}:${PATH}"
    fi
    if [ -x "${USER_BIN}/ag-mcp" ] || command -v ag-mcp >/dev/null 2>&1; then
      echo "[antigravity] Installed via pip --user. Add this to your shell rc to persist: export PATH=\"${USER_BIN}:\$PATH\"" >&2
      exit 0
    fi
  fi
fi

cat >&2 <<EOF
[antigravity] AUTO-INSTALL FAILED. Run ONE of these manually:

  Option A (recommended, requires pipx):
    brew install pipx     # macOS
    apt install pipx      # Debian/Ubuntu
    pipx ensurepath
    pipx install "${PLUGIN_ROOT}/engine"

  Option B (no pipx):
    python3 -m pip install --user "${PLUGIN_ROOT}/engine" "${PLUGIN_ROOT}/cli"

Then restart your Claude Code session.
EOF
exit 1
