#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(dirname "$0")"
ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
BENCH_DIR="$ROOT/benchmarks/codegraph-comparison"
WORK_DIR="$BENCH_DIR/.work"
RAW_DIR="$BENCH_DIR/results/raw"
RB_REFRESH="$WORK_DIR/repobrain-venv/bin/rb-refresh"
CODEGRAPH="$WORK_DIR/codegraph-runtime/node_modules/.bin/codegraph"

mkdir -p "$RAW_DIR"

run_repobrain() {
  local repository="$1"
  local workspace="$WORK_DIR/worktrees/$repository-repobrain"
  rm -rf "$workspace/.repobrain"
  /usr/bin/time -lp env RB_REFRESH_SCAN_ONLY=1 \
    "$RB_REFRESH" --workspace "$workspace" \
    >"$RAW_DIR/$repository-repobrain-index.stdout" \
    2>"$RAW_DIR/$repository-repobrain-index.stderr"
}

run_codegraph() {
  local repository="$1"
  local workspace="$WORK_DIR/worktrees/$repository-codegraph"
  rm -rf "$workspace/.codegraph"
  /usr/bin/time -lp env \
    CI=1 \
    CODEGRAPH_TELEMETRY=0 \
    CODEGRAPH_NO_UPDATE_CHECK=1 \
    CODEGRAPH_NO_DAEMON=1 \
    NO_COLOR=1 \
    "$CODEGRAPH" init "$workspace" \
    >"$RAW_DIR/$repository-codegraph-index.stdout" \
    2>"$RAW_DIR/$repository-codegraph-index.stderr"
}

for repository in verl excalidraw; do
  run_repobrain "$repository"
  run_codegraph "$repository"
done

echo "Raw index results written to $RAW_DIR"
