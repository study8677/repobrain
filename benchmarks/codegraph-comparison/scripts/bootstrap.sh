#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
BENCH_DIR="$ROOT/benchmarks/codegraph-comparison"
MANIFEST="$BENCH_DIR/config/manifest-latest-v2.json"

usage() {
  echo "Usage: $0 [--manifest PATH] [--repository ID ...]" >&2
}

SELECTED_REPOSITORIES=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --manifest)
      [[ $# -ge 2 ]] || { usage; exit 2; }
      MANIFEST="$2"
      shift 2
      ;;
    --repository)
      [[ $# -ge 2 ]] || { usage; exit 2; }
      SELECTED_REPOSITORIES+=("$2")
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 2
      ;;
  esac
done

[[ -f "$MANIFEST" ]] || { echo "Manifest not found: $MANIFEST" >&2; exit 2; }
jq -e '.schema_version == 2' "$MANIFEST" >/dev/null
for repository_id in "${SELECTED_REPOSITORIES[@]}"; do
  if ! jq -e --arg id "$repository_id" '.repositories[$id] != null' "$MANIFEST" >/dev/null; then
    echo "Unknown repository: $repository_id" >&2
    exit 2
  fi
done

manifest_work_root="$(jq -er '.artifacts.work_root' "$MANIFEST")"
WORK_ROOT="$BENCH_DIR/$manifest_work_root"
REPOS_DIR="$WORK_ROOT/repos"
WORKTREES_DIR="$WORK_ROOT/worktrees"
TOOLS_DIR="$WORK_ROOT/tools"
mkdir -p "$REPOS_DIR" "$WORKTREES_DIR" "$TOOLS_DIR"

assert_generated_path() {
  local path="$1"
  case "$path" in
    "$WORK_ROOT"/*) ;;
    *)
      echo "Refusing to replace path outside generated v2 work root: $path" >&2
      exit 2
      ;;
  esac
}

ensure_repository() {
  local name="$1"
  local url="$2"
  local revision="$3"
  local repository="$REPOS_DIR/$name"

  if [[ ! -d "$repository/.git" ]]; then
    assert_generated_path "$repository"
    if [[ -e "$repository" ]]; then
      rm -rf "$repository"
    fi
    git init --quiet "$repository"
    git -C "$repository" remote add origin "$url"
  else
    git -C "$repository" remote set-url origin "$url"
  fi

  git -C "$repository" fetch --quiet --depth 1 --no-tags origin "$revision"
  git -C "$repository" checkout --quiet --detach FETCH_HEAD
  local observed
  observed="$(git -C "$repository" rev-parse HEAD)"
  if [[ "$observed" != "$revision" ]]; then
    echo "$name pin mismatch: expected $revision, observed $observed" >&2
    exit 1
  fi
}

ensure_worktree() {
  local repository_name="$1"
  local destination_name="$2"
  local revision="$3"
  local repository="$REPOS_DIR/$repository_name"
  local destination="$WORKTREES_DIR/$destination_name"

  if [[ -e "$destination/.git" ]]; then
    local observed
    local tracked_state
    observed="$(git -C "$destination" rev-parse HEAD 2>/dev/null || true)"
    tracked_state="$(git -C "$destination" status --short --untracked-files=no 2>/dev/null || true)"
    if [[ "$observed" == "$revision" && -z "$tracked_state" ]]; then
      return
    fi
    git -C "$repository" worktree remove --force "$destination" 2>/dev/null || true
  fi
  if [[ -e "$destination" ]]; then
    assert_generated_path "$destination"
    rm -rf "$destination"
  fi
  git -C "$repository" worktree prune
  git -C "$repository" worktree add --quiet --detach "$destination" "$revision"
  [[ "$(git -C "$destination" rev-parse HEAD)" == "$revision" ]]
}

repobrain_url="$(jq -er '.tools.repobrain.repository' "$MANIFEST")"
repobrain_revision="$(jq -er '.tools.repobrain.revision' "$MANIFEST")"
ensure_repository "repobrain-tool" "$repobrain_url" "$repobrain_revision"
ensure_worktree "repobrain-tool" "repobrain-tool-source" "$repobrain_revision"

repository_selected() {
  local candidate="$1"
  if [[ ${#SELECTED_REPOSITORIES[@]} -eq 0 ]]; then
    return 0
  fi
  local selected
  for selected in "${SELECTED_REPOSITORIES[@]}"; do
    if [[ "$selected" == "$candidate" ]]; then
      return 0
    fi
  done
  return 1
}

while IFS=$'\t' read -r repository_id repository_url repository_revision; do
  if ! repository_selected "$repository_id"; then
    continue
  fi
  ensure_repository "$repository_id" "$repository_url" "$repository_revision"
  ensure_worktree "$repository_id" "$repository_id-repobrain" "$repository_revision"
  ensure_worktree "$repository_id" "$repository_id-codegraph" "$repository_revision"
done < <(
  jq -r '
    .repositories
    | to_entries[]
    | select(.value.enabled == true)
    | [.key, .value.repository, .value.revision]
    | @tsv
  ' "$MANIFEST"
)

if [[ -n "${PYTHON:-}" ]]; then
  PYTHON="$PYTHON"
elif [[ -x "$ROOT/.venv/bin/python" ]]; then
  PYTHON="$ROOT/.venv/bin/python"
else
  for python_candidate in python3.12 python3.11 python3.10 python3; do
    if command -v "$python_candidate" >/dev/null 2>&1; then
      PYTHON="$(command -v "$python_candidate")"
      break
    fi
  done
fi
if [[ -z "${PYTHON:-}" ]] || ! "$PYTHON" -c 'import sys; raise SystemExit(sys.version_info < (3, 10))'; then
  echo "RepoBrain benchmark requires Python 3.10 or newer; set PYTHON explicitly" >&2
  exit 1
fi
RB_VENV="$TOOLS_DIR/repobrain-venv"
if [[ -x "$RB_VENV/bin/python" ]] && \
   ! "$RB_VENV/bin/python" -c 'import sys; raise SystemExit(sys.version_info < (3, 10))'; then
  assert_generated_path "$RB_VENV"
  rm -rf "$RB_VENV"
fi
if [[ ! -x "$RB_VENV/bin/python" ]]; then
  "$PYTHON" -m venv "$RB_VENV"
fi
"$RB_VENV/bin/python" -m pip install --quiet --upgrade pip
"$RB_VENV/bin/python" -m pip install --quiet \
  -e "$WORKTREES_DIR/repobrain-tool-source/engine" \
  -e "$WORKTREES_DIR/repobrain-tool-source/cli"

CODEGRAPH_RUNTIME="$TOOLS_DIR/codegraph-runtime"
codegraph_package="$(jq -er '.tools.codegraph.package' "$MANIFEST")"
codegraph_release="$(jq -er '.tools.codegraph.release' "$MANIFEST")"
mkdir -p "$CODEGRAPH_RUNTIME"
npm install \
  --prefix "$CODEGRAPH_RUNTIME" \
  --save-exact \
  --no-audit \
  --no-fund \
  "$codegraph_package@$codegraph_release"

codegraph_package_json="$CODEGRAPH_RUNTIME/node_modules/$codegraph_package/package.json"
observed_codegraph_version="$(node -p "require('$codegraph_package_json').version")"
codegraph_registry_metadata="$(npm view "$codegraph_package@$codegraph_release" gitHead dist.integrity --json)"
observed_codegraph_git_head="$(jq -er '.gitHead' <<<"$codegraph_registry_metadata")"
expected_codegraph_git_head="$(jq -er '.tools.codegraph.npm_git_head' "$MANIFEST")"
if [[ "$observed_codegraph_version" != "$codegraph_release" ]]; then
  echo "CodeGraph version mismatch: expected $codegraph_release, observed $observed_codegraph_version" >&2
  exit 1
fi
if [[ "$observed_codegraph_git_head" != "$expected_codegraph_git_head" ]]; then
  echo "CodeGraph gitHead mismatch: expected $expected_codegraph_git_head, observed $observed_codegraph_git_head" >&2
  exit 1
fi

expected_integrity="$(jq -er '.tools.codegraph.dist_integrity' "$MANIFEST")"
registry_integrity="$(jq -er '."dist.integrity"' <<<"$codegraph_registry_metadata")"
lock_integrity="$(
  node -e '
    const fs = require("fs");
    const lock = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const name = process.argv[2];
    const entry = lock.packages[`node_modules/${name}`];
    process.stdout.write((entry && entry.integrity) || "");
  ' "$CODEGRAPH_RUNTIME/package-lock.json" "$codegraph_package"
)"
if [[ "$registry_integrity" != "$expected_integrity" ]] || \
   [[ "$lock_integrity" != "$expected_integrity" ]]; then
  echo "CodeGraph integrity mismatch between manifest, registry, and package lock" >&2
  exit 1
fi

{
  echo "manifest=$(cd "$(dirname "$MANIFEST")" && pwd)/$(basename "$MANIFEST")"
  echo "repobrain_revision=$repobrain_revision"
  echo "codegraph_version=$observed_codegraph_version"
  echo "codegraph_git_head=$observed_codegraph_git_head"
  echo "codegraph_integrity=$lock_integrity"
  if command -v trae-cli >/dev/null 2>&1; then
    echo "trae_cli=$(trae-cli --version 2>&1 | head -n 1)"
  else
    echo "trae_cli=unavailable"
  fi
} >"$WORK_ROOT/tool-versions.txt"

echo "Pinned benchmark dependencies are ready under $WORK_ROOT"
