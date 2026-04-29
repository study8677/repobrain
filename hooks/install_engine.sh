#!/usr/bin/env bash
# Thin wrapper for manual invocation. The real install logic lives in
# `install_engine.py` so it can be reused by the Windows .bat wrapper and
# the cross-platform hook command in `hooks.json`.
set -u
DIR="$(cd "$(dirname "$0")" && pwd)"
exec python3 "${DIR}/install_engine.py" 2>/dev/null \
  || exec python "${DIR}/install_engine.py"
