#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(dirname "$0")"
ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
BENCH_DIR="$ROOT/benchmarks/codegraph-comparison"
WORK_DIR="$BENCH_DIR/.work"
RAW_DIR="$BENCH_DIR/results/raw"
QUESTIONS="$BENCH_DIR/config/questions.json"
RB_ASK="$WORK_DIR/repobrain-venv/bin/rb-ask"
CODEGRAPH="$WORK_DIR/codegraph-runtime/node_modules/.bin/codegraph"

RB_HOST_COMMAND="${RB_HOST_COMMAND:-trae-cli exec --cd {workspace} --sandbox read-only --skip-git-repo-check --ephemeral -o {output_file}}"

mkdir -p "$RAW_DIR"

while IFS=$'\t' read -r id repository prompt; do
  repobrain_workspace="$WORK_DIR/worktrees/$repository-repobrain"
  codegraph_workspace="$WORK_DIR/worktrees/$repository-codegraph"

  set +e
  /usr/bin/time -lp env \
    RB_HOST_RUNNER=generic \
    RB_HOST_COMMAND="$RB_HOST_COMMAND" \
    RB_HOST_OUTPUT_MODE=file \
    RB_HOST_TIMEOUT_SECONDS=600 \
    "$RB_ASK" "$prompt" --workspace "$repobrain_workspace" --json \
    >"$RAW_DIR/$id-repobrain.json" \
    2>"$RAW_DIR/$id-repobrain.time"
  repobrain_exit=$?
  set -e
  printf '%s\n' "$repobrain_exit" >"$RAW_DIR/$id-repobrain.exit-code"

  set +e
  /usr/bin/time -lp env \
    CODEGRAPH_TELEMETRY=0 \
    CODEGRAPH_NO_UPDATE_CHECK=1 \
    CODEGRAPH_NO_DAEMON=1 \
    NO_COLOR=1 \
    "$CODEGRAPH" explore -p "$codegraph_workspace" --max-files 12 "$prompt" \
    >"$RAW_DIR/$id-codegraph.md" \
    2>"$RAW_DIR/$id-codegraph.time"
  codegraph_exit=$?
  set -e
  printf '%s\n' "$codegraph_exit" >"$RAW_DIR/$id-codegraph.exit-code"
done < <(jq -r '.questions[] | [.id, .repository, .prompt] | @tsv' "$QUESTIONS")

echo "Raw retrieval results written to $RAW_DIR"
