"""Selection and durable recovery metadata for automatic knowledge refresh."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

from repobrain_engine.hub.storage import (
    active_generation_root,
    atomic_write_json,
    control_root,
    read_current_pointer,
)

RECOVERY_SCHEMA_VERSION = 1


def generation_config() -> dict[str, object]:
    """Fingerprint output-affecting settings without persisting credentials."""
    from repobrain_engine.config import get_settings
    from repobrain_engine.hub.incremental import GROUPING_VERSION

    settings = get_settings()
    raw = os.environ.get("RB_REFRESH_SCAN_ONLY")
    scan_only = bool(settings.RB_REFRESH_SCAN_ONLY) if raw is None else raw.lower().strip() in {"1", "true", "yes"}
    backend = "api" if settings.OPENAI_BASE_URL or settings.OPENAI_API_KEY else "host"
    values = {
        "schema_version": RECOVERY_SCHEMA_VERSION,
        "grouping_version": GROUPING_VERSION,
        "scan_only": scan_only,
        "backend": backend,
        "model": settings.OPENAI_MODEL if backend == "api" else settings.RB_HOST_MODEL,
        "endpoint": settings.OPENAI_BASE_URL if backend == "api" else "",
        "host_runner": settings.RB_HOST_RUNNER if backend == "host" else "",
        "host_command": settings.RB_HOST_COMMAND if backend == "host" else "",
        "host_output_mode": settings.RB_HOST_OUTPUT_MODE if backend == "host" else "",
        "context_limit": settings.RB_HOST_MAX_CONTEXT_CHARS,
        "limits": {name: os.environ.get(name, "") for name in (
            "RB_SCAN_MAX_FILES", "RB_SCAN_TIMEOUT_SECONDS", "RB_SCAN_SAMPLE_FILES",
            "RB_KNOWLEDGE_GRAPH_FILE_LIMIT", "RB_SEMANTIC_FILE_LIMIT",
            "RB_AUTO_SPLIT_THRESHOLD", "RB_MAX_GROUP_CHARS", "RB_REASONING_EFFORT",
        )},
    }
    fingerprint = hashlib.sha256(json.dumps(values, sort_keys=True).encode()).hexdigest()
    # Only the fingerprint and generation kind are written: command templates
    # can themselves contain credentials, so do not persist the raw values.
    return {"schema_version": RECOVERY_SCHEMA_VERSION, "fingerprint": fingerprint,
            "scan_only": scan_only, "grouping_version": GROUPING_VERSION}


def read_json_object(path: Path) -> dict[str, object] | None:
    """Return a JSON object, treating corrupt recovery metadata as unusable."""
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError, TypeError):
        return None
    return payload if isinstance(payload, dict) else None


def valid_artifact(path: Path) -> bool:
    """A completion marker alone never proves an artifact was saved."""
    try:
        return path.is_file() and bool(path.read_text(encoding="utf-8").strip())
    except (OSError, UnicodeError):
        return False


def load_baseline(workspace: Path, config: dict[str, object]) -> tuple[dict | None, dict | None]:
    """Distinguish absent/scan-only knowledge from a damaged active generation."""
    from repobrain_engine.hub.incremental import load_active_snapshot

    pointer = read_current_pointer(workspace)
    pointer_path = control_root(workspace) / "current.json"
    if pointer is None:
        if pointer_path.exists():
            raise RuntimeError("Knowledge baseline is damaged. Run `rb-refresh --full` to rebuild it.")
        return None, None
    snapshot = load_active_snapshot(workspace)
    if (snapshot is None or snapshot.get("head_sha") != pointer.get("head_sha")
            or not isinstance(snapshot.get("groups"), dict)
            or not isinstance(snapshot.get("file_to_group"), dict)):
        raise RuntimeError("Knowledge snapshot is damaged. Run `rb-refresh --full` to rebuild it.")
    root = active_generation_root(workspace)
    from repobrain_engine.hub.contracts import RefreshStatus

    status = read_json_object(root / "status.json")
    try:
        health = RefreshStatus.model_validate(status)
    except (ValueError, TypeError):
        health = None
    if health is None or health.overall_status != "success":
        raise RuntimeError("Knowledge status is damaged or incomplete. Run `rb-refresh --full` to rebuild it.")
    prior_config = read_json_object(root / "refresh_config.json")
    if (root / "refresh_config.json").exists() and prior_config is None:
        raise RuntimeError("Knowledge configuration record is damaged. Run `rb-refresh --full` to rebuild it.")
    if prior_config is not None and (
        prior_config.get("schema_version") != RECOVERY_SCHEMA_VERSION
        or not isinstance(prior_config.get("fingerprint"), str)
        or len(prior_config["fingerprint"]) != 64
        or not isinstance(prior_config.get("scan_only"), bool)
        or not isinstance(prior_config.get("grouping_version"), str)
    ):
        raise RuntimeError("Knowledge configuration record is damaged. Run `rb-refresh --full` to rebuild it.")
    if prior_config is not None and prior_config != config:
        return None, None
    if snapshot.get("grouping_version") != config["grouping_version"]:
        return None, None
    if not config["scan_only"]:
        stages = status.get("stages", {})
        if isinstance(stages, dict) and stages.get("module_docs") == "skipped" and (
            snapshot["groups"] or not valid_artifact(root / "map.md")
        ):
            return None, None
        if not valid_artifact(root / "map.md") or any(
            not isinstance(group, dict) or not valid_artifact(root / str(group.get("artifact_path", "")))
            for group in snapshot["groups"].values()
        ):
            raise RuntimeError("Knowledge documents are missing. Run `rb-refresh --full` to rebuild them.")
    return pointer, snapshot


def save_recovery(root: Path, *, mode: str, target_head: str,
                  baseline_generation: str | None, config: dict[str, object]) -> None:
    """Save enough identity to prevent mixing progress from different runs."""
    atomic_write_json(root / "resume.json", {
        "schema_version": RECOVERY_SCHEMA_VERSION, "mode": mode,
        "target_head": target_head, "baseline_generation": baseline_generation,
        "config": config,
    })


def find_recovery(workspace: Path, *, target_head: str,
                  baseline_generation: str | None, config: dict[str, object]) -> tuple[Path, str] | None:
    """Find the newest safe task; old or corrupt journals are never reused."""
    from repobrain_engine.hub.contracts import ImpactPlan
    from repobrain_engine.hub.incremental import _load_snapshot_from_root

    generations = control_root(workspace) / "generations"
    if not generations.is_dir():
        return None
    for root in sorted(generations.iterdir(), reverse=True):
        if not root.is_dir() or root.name == baseline_generation:
            continue
        record = read_json_object(root / "resume.json")
        if not record or record.get("schema_version") != RECOVERY_SCHEMA_VERSION:
            continue
        if (record.get("target_head") != target_head
                or record.get("baseline_generation") != baseline_generation
                or record.get("config") != config or record.get("invalidated")):
            continue
        mode = record.get("mode")
        if mode == "full":
            return root, mode
        if mode != "incremental":
            continue
        snapshot = _load_snapshot_from_root(root)
        try:
            plan = ImpactPlan.model_validate_json((root / "impact_plan.json").read_text(encoding="utf-8"))
        except (OSError, ValueError, TypeError):
            continue
        if (snapshot is not None and snapshot.get("head_sha") == target_head
                and plan.target_head == target_head and plan.baseline_generation == baseline_generation
                and not plan.unresolved_group_ids):
            return root, mode
    return None


def ensure_publishable(workspace: Path, root: Path, target_head: str) -> None:
    """Invalidate a candidate if source changed while the model was running."""
    from repobrain_engine.hub.incremental import ensure_clean_worktree, get_head_sha

    try:
        ensure_clean_worktree(workspace)
        if get_head_sha(workspace) != target_head:
            raise RuntimeError("HEAD changed during refresh; run `rb-refresh` again.")
    except Exception:
        record = read_json_object(root / "resume.json") or {}
        record["invalidated"] = True
        atomic_write_json(root / "resume.json", record)
        raise
