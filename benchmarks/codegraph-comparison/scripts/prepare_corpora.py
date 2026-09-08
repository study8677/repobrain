#!/usr/bin/env python3
"""Build pinned indexes and publish source-free v2 query corpora."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


BENCH_DIR = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = BENCH_DIR / "config" / "manifest-latest-v2.json"


def read_json(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"Expected a JSON object: {path}")
    return payload


def resolve_benchmark_path(value: str) -> Path:
    path = (BENCH_DIR / value).resolve()
    try:
        path.relative_to(BENCH_DIR.resolve())
    except ValueError as exc:
        raise ValueError(f"Benchmark path escapes benchmark directory: {value}") from exc
    return path


def git_output(workspace: Path, *arguments: str) -> str:
    completed = subprocess.run(
        ["git", "-C", str(workspace), *arguments],
        text=True,
        capture_output=True,
        check=False,
    )
    if completed.returncode != 0:
        raise RuntimeError(completed.stderr.strip() or completed.stdout.strip())
    return completed.stdout.strip()


def verify_workspace(workspace: Path, revision: str) -> str:
    if not workspace.is_dir():
        raise FileNotFoundError(
            f"Missing pinned worktree {workspace}; run scripts/bootstrap.sh first"
        )
    observed = git_output(workspace, "rev-parse", "HEAD")
    if observed != revision:
        raise RuntimeError(
            f"Worktree pin mismatch for {workspace.name}: "
            f"expected {revision}, observed {observed}"
        )
    tracked_state = git_output(workspace, "status", "--short", "--untracked-files=no")
    if tracked_state:
        raise RuntimeError(f"Pinned worktree has tracked changes: {workspace}")
    return observed


def source_tree_hash(workspace: Path) -> str:
    listing = git_output(workspace, "ls-files", "-s", "--cached")
    return hashlib.sha256((listing + "\n").encode()).hexdigest()


def run_logged(
    command: list[str],
    *,
    workspace: Path,
    env: dict[str, str],
    stdout_path: Path,
    stderr_path: Path,
) -> tuple[int, float]:
    stdout_path.parent.mkdir(parents=True, exist_ok=True)
    started = time.perf_counter()
    with stdout_path.open("w", encoding="utf-8") as stdout, stderr_path.open(
        "w", encoding="utf-8"
    ) as stderr:
        completed = subprocess.run(
            command,
            cwd=workspace,
            env=env,
            stdout=stdout,
            stderr=stderr,
            text=True,
            check=False,
        )
    return completed.returncode, time.perf_counter() - started


def reject_escaping_symlinks(root: Path) -> None:
    resolved_root = root.resolve()
    for path in root.rglob("*"):
        if not path.is_symlink():
            continue
        try:
            path.resolve().relative_to(resolved_root)
        except ValueError as exc:
            raise RuntimeError(f"Source-free index contains escaping symlink: {path}") from exc


def publish_source_free(
    *,
    index_source: Path,
    destination: Path,
    provenance: dict[str, Any],
) -> None:
    if not index_source.is_dir() or not any(index_source.iterdir()):
        raise RuntimeError(f"Index is missing or empty: {index_source}")

    destination.parent.mkdir(parents=True, exist_ok=True)
    staging = destination.parent / f".{destination.name}.staging-{os.getpid()}"
    backup = destination.parent / f".{destination.name}.backup-{os.getpid()}"
    for generated in (staging, backup):
        if generated.exists():
            shutil.rmtree(generated)
    staging.mkdir()
    shutil.copytree(index_source, staging / index_source.name, symlinks=True)
    reject_escaping_symlinks(staging / index_source.name)

    provenance = {
        **provenance,
        "source_free": {
            "verified": True,
            "hard_filesystem_isolation": False,
            "allowed_top_level_entries": [index_source.name, "corpus-manifest.json"],
            "note": (
                "No source files are present in this query directory. The benchmark "
                "runner must still audit agent commands because this is not a container boundary."
            ),
        },
    }
    (staging / "corpus-manifest.json").write_text(
        json.dumps(provenance, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    observed_entries = {path.name for path in staging.iterdir()}
    expected_entries = {index_source.name, "corpus-manifest.json"}
    if observed_entries != expected_entries:
        raise RuntimeError(
            f"Unexpected source-free entries: {sorted(observed_entries - expected_entries)}"
        )

    if destination.exists():
        destination.rename(backup)
    try:
        staging.rename(destination)
    except BaseException:
        if backup.exists() and not destination.exists():
            backup.rename(destination)
        raise
    if backup.exists():
        shutil.rmtree(backup)


def build_repobrain(
    *,
    repository_id: str,
    repository: dict[str, Any],
    manifest: dict[str, Any],
    work_root: Path,
) -> dict[str, Any]:
    workspace = work_root / "worktrees" / f"{repository_id}-repobrain"
    revision = repository["revision"]
    verify_workspace(workspace, revision)
    index = workspace / ".repobrain"
    if index.exists():
        shutil.rmtree(index)

    rb_refresh = work_root / "tools" / "repobrain-venv" / "bin" / "rb-refresh"
    if not rb_refresh.is_file():
        raise FileNotFoundError(f"Missing {rb_refresh}; run scripts/bootstrap.sh first")
    model = manifest["tools"]["answer_model"]
    env = os.environ.copy()
    env.update(
        {
            "RB_HOST_RUNNER": "generic",
            "RB_HOST_COMMAND": model["repobrain_host_command"],
            "RB_HOST_OUTPUT_MODE": "file",
            "RB_HOST_TIMEOUT_SECONDS": str(model["timeout_seconds"]),
        }
    )
    log_root = work_root / "build-logs" / repository_id
    returncode, seconds = run_logged(
        [str(rb_refresh), "--workspace", str(workspace)],
        workspace=workspace,
        env=env,
        stdout_path=log_root / "repobrain.stdout",
        stderr_path=log_root / "repobrain.stderr",
    )
    if returncode != 0:
        raise RuntimeError(
            f"RepoBrain refresh failed for {repository_id} with exit code {returncode}; "
            f"see {log_root}"
        )
    current_path = index / "current.json"
    if not current_path.is_file():
        raise RuntimeError(f"RepoBrain did not promote an active generation: {workspace}")
    current = read_json(current_path)
    if current.get("head_sha") != revision:
        raise RuntimeError(
            f"RepoBrain generation SHA mismatch: {current.get('head_sha')} != {revision}"
        )

    destination = resolve_benchmark_path(repository["corpora"]["repobrain_query"])
    provenance = base_provenance(
        repository_id=repository_id,
        repository=repository,
        manifest=manifest,
        workspace=workspace,
        product="repobrain",
        seconds=seconds,
    )
    provenance["active_generation"] = current
    publish_source_free(index_source=index, destination=destination, provenance=provenance)
    return provenance


def build_codegraph(
    *,
    repository_id: str,
    repository: dict[str, Any],
    manifest: dict[str, Any],
    work_root: Path,
) -> dict[str, Any]:
    workspace = work_root / "worktrees" / f"{repository_id}-codegraph"
    verify_workspace(workspace, repository["revision"])
    index = workspace / ".codegraph"
    if index.exists():
        shutil.rmtree(index)

    codegraph = work_root / "tools" / "codegraph-runtime" / "node_modules" / ".bin" / "codegraph"
    if not codegraph.is_file():
        raise FileNotFoundError(f"Missing {codegraph}; run scripts/bootstrap.sh first")
    env = os.environ.copy()
    env.update(
        {
            "CI": "1",
            "CODEGRAPH_TELEMETRY": "0",
            "CODEGRAPH_NO_UPDATE_CHECK": "1",
            "CODEGRAPH_NO_DAEMON": "1",
            "NO_COLOR": "1",
        }
    )
    log_root = work_root / "build-logs" / repository_id
    returncode, seconds = run_logged(
        [str(codegraph), "init", str(workspace)],
        workspace=workspace,
        env=env,
        stdout_path=log_root / "codegraph.stdout",
        stderr_path=log_root / "codegraph.stderr",
    )
    if returncode != 0:
        raise RuntimeError(
            f"CodeGraph init failed for {repository_id} with exit code {returncode}; "
            f"see {log_root}"
        )

    destination = resolve_benchmark_path(repository["corpora"]["codegraph_query"])
    provenance = base_provenance(
        repository_id=repository_id,
        repository=repository,
        manifest=manifest,
        workspace=workspace,
        product="codegraph",
        seconds=seconds,
    )
    publish_source_free(index_source=index, destination=destination, provenance=provenance)
    return provenance


def base_provenance(
    *,
    repository_id: str,
    repository: dict[str, Any],
    manifest: dict[str, Any],
    workspace: Path,
    product: str,
    seconds: float,
) -> dict[str, Any]:
    tool = manifest["tools"][product]
    return {
        "schema_version": 1,
        "provenance_schema": "config/corpus-manifest-v1.schema.json",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "benchmark_id": manifest["benchmark_id"],
        "repository": {
            "id": repository_id,
            "url": repository["repository"],
            "revision": repository["revision"],
            "release": repository["release"],
            "primary_language": repository["primary_language"],
            "corpus": repository["corpus"],
            "tracked_tree_sha256": source_tree_hash(workspace),
        },
        "product": {
            "name": product,
            "pin": tool.get("revision") or tool.get("release"),
            "build_status": "success",
            "build_seconds": seconds,
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--repository", action="append", dest="repositories")
    parser.add_argument(
        "--product",
        choices=("all", "repobrain", "codegraph"),
        default="all",
    )
    args = parser.parse_args()

    manifest_path = args.manifest.expanduser().resolve()
    manifest = read_json(manifest_path)
    if manifest.get("schema_version") != 2:
        raise ValueError("prepare_corpora.py requires a schema_version 2 manifest")
    work_root = resolve_benchmark_path(manifest["artifacts"]["work_root"])
    selected = set(args.repositories or [])
    unknown = selected - set(manifest["repositories"])
    if unknown:
        raise ValueError(f"Unknown repositories: {', '.join(sorted(unknown))}")

    records = []
    for repository_id, repository in manifest["repositories"].items():
        if not repository["enabled"] or (selected and repository_id not in selected):
            continue
        if repository["corpus"]["mode"] != "full":
            raise NotImplementedError(
                f"Focused corpus preparation is not yet supported: {repository_id}"
            )
        print(f"Preparing {repository_id}...", flush=True)
        if args.product in {"all", "repobrain"}:
            records.append(
                build_repobrain(
                    repository_id=repository_id,
                    repository=repository,
                    manifest=manifest,
                    work_root=work_root,
                )
            )
        if args.product in {"all", "codegraph"}:
            records.append(
                build_codegraph(
                    repository_id=repository_id,
                    repository=repository,
                    manifest=manifest,
                    work_root=work_root,
                )
            )

    print(json.dumps({"status": "success", "corpora": records}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (FileNotFoundError, RuntimeError, ValueError, NotImplementedError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
