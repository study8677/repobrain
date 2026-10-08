"""Refresh pipeline — scan the project and generate knowledge artifacts.

Extracted from ``pipeline.py`` to separate the refresh and ask
workflows into dedicated modules.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import subprocess
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from repobrain_engine.hub._constants import (
    AGENT_MD_FALLBACK_MARKER,
    AGENT_MD_FALLBACK_SENTINEL,
    SOURCE_CODE_EXTS,
    WORKSPACE_ROOT_MODULE_ID,
)
from repobrain_engine.hub.contracts import (
    EvidenceSpan,
    FailureRecord,
    GroupFactsDocument,
    ModuleClaim,
    ModuleFactsDocument,
    ModuleRegistryEntry,
    RefreshStatus,
)
from repobrain_engine.hub.storage import atomic_write_text, knowledge_root

logger = logging.getLogger(__name__)

_REPOBRAIN_MANIFEST_VERSION = 1
_REFRESH_INIT_DIRS = (
    "agents",
    "modules",
    "graph",
    "retrieval_graphs",
    "memory",
    "decisions",
    "logs",
)


def _ensure_refresh_workspace_initialized(workspace: Path) -> Path:
    """Create the refresh-owned workspace scaffold without overwriting data.

    Refresh owns the project-local ``.repobrain/`` knowledge directory. It
    should be safe to run on a clean project and safe to re-run on an existing
    project. If a required path is blocked by a regular file, fail before any
    destructive action instead of replacing user data.

    Args:
        workspace: Project root directory.

    Returns:
        Path to the ``.repobrain`` directory.

    Raises:
        RuntimeError: If the workspace cannot be initialized safely.
    """
    workspace = workspace.expanduser().resolve()
    if not workspace.exists() or not workspace.is_dir():
        raise RuntimeError(
            "Project initialization failed: workspace does not exist or is not a "
            f"directory: {workspace}"
        )

    rb_dir = knowledge_root(workspace)
    if rb_dir.exists() and not rb_dir.is_dir():
        raise RuntimeError(
            "Project initialization failed: .repobrain exists but is not a "
            f"directory: {rb_dir}. Move or remove that file, then rerun refresh."
        )
    rb_dir.mkdir(parents=True, exist_ok=True)

    for dirname in _REFRESH_INIT_DIRS:
        child = rb_dir / dirname
        if child.exists() and not child.is_dir():
            raise RuntimeError(
                "Project initialization failed: expected a directory at "
                f"{child}, but found a file. Move or remove that file, then "
                "rerun refresh."
            )
        child.mkdir(parents=True, exist_ok=True)

    manifest_path = rb_dir / "manifest.json"
    if manifest_path.exists() and not manifest_path.is_file():
        raise RuntimeError(
            "Project initialization failed: .repobrain/manifest.json exists "
            "but is not a file. Move or repair it, then rerun refresh."
        )
    if not manifest_path.exists():
        manifest = {
            "schema_version": _REPOBRAIN_MANIFEST_VERSION,
            "workspace": str(workspace),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "managed_by": "repobrain-refresh",
        }
        manifest_path.write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    return rb_dir

def _get_retry_config(max_retries: int | None = None, base_delay: float | None = None) -> tuple[int, float]:
    """Read retry configuration from environment variables.

    Args:
        max_retries: Override for max retries (uses env var if None).
        base_delay: Override for base delay in seconds (uses env var if None).

    Returns:
        Tuple of (max_retries, base_delay).
    """
    if max_retries is None:
        try:
            max_retries = max(0, int(os.environ.get("RB_REFRESH_RETRY_COUNT", "3")))
        except (ValueError, TypeError):
            max_retries = 3
    if base_delay is None:
        try:
            base_delay = max(0.0, float(os.environ.get("RB_REFRESH_RETRY_DELAY", "1.0")))
        except (ValueError, TypeError):
            base_delay = 1.0
    return max_retries, base_delay


def _is_retryable_error(exc: Exception) -> bool:
    """Check if an exception qualifies for retry.

    Retries on timeout, network errors, rate limits, and 5xx server errors.

    Args:
        exc: The exception to inspect.

    Returns:
        True if the error is retryable.
    """
    # A bare asyncio wait_for timeout has an empty str() and means OUR own
    # per-attempt deadline elapsed — the model is slow/stalling, not
    # transiently failing. Retrying the same full-length attempt just
    # multiplies wall-clock by (retries + 1) for the same outcome, which is
    # what made refresh appear to hang. Treat a *bare* timeout as NON-retryable
    # so the step falls back immediately. A provider-side timeout that carries
    # a message (e.g. "gateway time-out"/"504") falls through to the keyword
    # check below and stays retryable.
    if isinstance(exc, (TimeoutError, asyncio.TimeoutError)) and not str(exc).strip():
        return False
    msg = str(exc).lower()
    retryable_keywords = (
        "timeout",
        "gateway time-out",
        "504",
        "connection",
        "network",
        "unreachable",
        "refused",
        "rate limit",
        "ratelimit",
        "429",
        "502",
        "503",
        "500",
        "service unavailable",
        "bad gateway",
        "internal server error",
    )
    return any(kw in msg for kw in retryable_keywords)


async def _run_with_retry(
    coro_fn,
    *args,
    max_retries: int | None = None,
    base_delay: float | None = None,
    timeout: float | None = None,
    context: str = "",
    **kwargs,
):
    """Run an async coroutine with retry and exponential backoff.

    Args:
        coro_fn: Async callable to execute.
        *args: Positional arguments for ``coro_fn``.
        max_retries: Maximum retry attempts (overrides env var).
        base_delay: Initial delay between retries in seconds (overrides env var).
        timeout: Per-attempt timeout in seconds (None or <=0 for no timeout).
        context: Human-readable context string for logging.
        **kwargs: Keyword arguments for ``coro_fn``.

    Returns:
        Result of ``coro_fn``.
    Raises:
        The last exception if all retries are exhausted.
    """
    max_retries, base_delay = _get_retry_config(max_retries, base_delay)
    last_exc: Exception | None = None
    for attempt in range(max_retries + 1):
        try:
            if timeout is not None and timeout > 0:
                return await asyncio.wait_for(coro_fn(*args, **kwargs), timeout=timeout)
            return await coro_fn(*args, **kwargs)
        except Exception as exc:
            last_exc = exc
            # Last attempt failed, re-raise
            if attempt >= max_retries:
                raise
            # Non-retryable error, re-raise immediately
            if not _is_retryable_error(exc):
                raise
            # Calculate delay (exponential backoff)
            delay = base_delay * (2 ** attempt)
            label = f" ({context})" if context else ""
            # Clean newlines from error message to prevent log format issues
            raw_msg = str(exc).replace('\n', ' ').replace('\r', '')[:150]
            error_msg = raw_msg or type(exc).__name__
            print(
                f"  ⚠ Attempt {attempt + 1} failed{label}: {error_msg}. Retrying in {delay}s...",
                file=sys.stderr,
            )
            await asyncio.sleep(delay)
    # Unreachable - loop always returns or raises



async def _refresh_pipeline_into_generation(
    workspace: Path,
    *,
    resume: bool = False,
) -> RefreshStatus:
    """Build a full generation, resuming only validated completed artifacts.

    Generation identity and configuration matching are enforced by the public
    entrypoint. This worker additionally verifies status and artifacts before
    reusing any stage or group. Documents are durable before success is recorded.
    """
    from dataclasses import asdict
    from repobrain_engine.config import get_settings
    from repobrain_engine.hub.scanner import (
        ScanReport, build_knowledge_graph, extract_structure, full_scan,
        render_knowledge_graph_markdown, render_knowledge_graph_mermaid,
    )

    settings = get_settings()
    scan_only_raw = os.environ.get("RB_REFRESH_SCAN_ONLY")
    refresh_scan_only = (
        bool(settings.RB_REFRESH_SCAN_ONLY) if scan_only_raw is None
        else scan_only_raw.strip().lower() in {"1", "true", "yes"}
    )
    rb_dir = _ensure_refresh_workspace_initialized(workspace)
    current_sha = _get_head_sha(workspace)
    previous_status = _load_previous_refresh_status(rb_dir) if resume else {}
    if previous_status.get("head_sha") != current_sha:
        previous_status = {}
    status = RefreshStatus(
        refresh_run_id=datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ"),
        overall_status="success", head_sha=current_sha,
        stages=previous_status.get("stages", {}),
        modules=previous_status.get("modules", {}),
        groups=previous_status.get("groups", {}),
        group_head_shas=previous_status.get("group_head_shas", {}),
        module_head_shas=previous_status.get("module_head_shas", {}),
    )

    def completed(stage: str, artifacts: tuple[str, ...], *, allow_empty: bool = False) -> bool:
        old_state = previous_status.get("stages", {}).get(stage)
        reusable_states = {"success", "skipped"} if refresh_scan_only else {"success"}
        if old_state not in reusable_states:
            return False
        if not all(_refresh_artifact_valid(rb_dir / name, allow_empty=allow_empty) for name in artifacts):
            return False
        status.stages[stage] = old_state
        if stage == "module_registry":
            status.warnings = list(previous_status.get("warnings", []))
        print(f"  → Continuing: preserved {stage}.", file=sys.stderr)
        _write_refresh_status(rb_dir, status)
        return True

    def finish(stage: str, state: str = "success") -> None:
        status.stages[stage] = state
        _write_refresh_status(rb_dir, status)

    model: "str | object | None" = None
    host_runner_mode = False
    if not refresh_scan_only:
        from agents import Runner, set_tracing_disabled
        from repobrain_engine.hub.agents import (
            create_model, build_refresh_agent, build_single_turn_convention_agent,
            build_refresh_module_swarm_v2, build_refresh_git_agent,
        )
        from repobrain_engine.hub.host_runner import is_host_runner_model
        from repobrain_engine.hub.scanner import detect_modules
        set_tracing_disabled(True)
        model = create_model(settings)
        host_runner_mode = is_host_runner_model(model)
        if host_runner_mode:
            print(f"Using local host runner '{settings.RB_HOST_RUNNER}' for knowledge generation.", file=sys.stderr)

    report = None
    if completed("scan", ("scan_report.json",)):
        try:
            payload = json.loads((rb_dir / "scan_report.json").read_text(encoding="utf-8"))
            payload["root"] = workspace
            defaults = asdict(ScanReport(root=workspace))
            if set(payload) != set(defaults):
                raise ValueError("incomplete saved scan")
            for name, value in payload.items():
                if name == "root":
                    continue
                expected = type(defaults[name])
                if expected is float:
                    valid = isinstance(value, (int, float)) and not isinstance(value, bool)
                else:
                    valid = type(value) is expected
                if not valid:
                    raise ValueError(f"invalid saved scan field: {name}")
            report = ScanReport(**payload)
        except (OSError, ValueError, TypeError):
            status.stages.pop("scan", None)
    if report is None:
        print("[1/8] Scanning project...", file=sys.stderr)
        report = full_scan(workspace)
        scan_payload = asdict(report)
        scan_payload["root"] = str(report.root)
        atomic_write_text(rb_dir / "scan_report.json", json.dumps(scan_payload, ensure_ascii=False, indent=2))
        finish("scan")

    if not completed("conventions", ("conventions.md",)):
        print("[2/8] Analyzing project conventions...", file=sys.stderr)
        if refresh_scan_only:
            content = _build_fallback_conventions(report)
            state = "skipped"
        else:
            agent = (build_single_turn_convention_agent(model) if host_runner_mode
                     else build_refresh_agent(model or ""))
            try:
                result = await _run_with_retry(
                    Runner.run, agent, _format_scan_report(report),
                    timeout=float(os.environ.get("RB_REFRESH_AGENT_TIMEOUT_SECONDS", "300")),
                    context="Conventions swarm",
                )
                content = str(result.final_output).strip()
                if not content:
                    raise ValueError("empty conventions output")
                state = "success"
            except Exception as exc:
                content = _build_fallback_conventions(report)
                state = "partial"
                _mark_stage_failure(status, "conventions", str(exc) or type(exc).__name__, partial=True)
        atomic_write_text(rb_dir / "conventions.md", content)
        finish("conventions", state)

    if not completed("structure", ("structure.md",)):
        print("[3/8] Generating structure.md...", file=sys.stderr)
        atomic_write_text(rb_dir / "structure.md", extract_structure(workspace))
        finish("structure")

    graph_artifacts = ("knowledge_graph.json", "knowledge_graph.md", "knowledge_graph.mmd",
                       "graph/nodes.jsonl", "graph/edges.jsonl")
    if not completed("knowledge_graph", graph_artifacts, allow_empty=True):
        print("[4/8] Building knowledge graph artifacts...", file=sys.stderr)
        graph = build_knowledge_graph(workspace, report)
        atomic_write_text(rb_dir / "knowledge_graph.json", json.dumps(graph, ensure_ascii=False, indent=2))
        _export_normalized_graph_store(rb_dir, graph)
        atomic_write_text(rb_dir / "knowledge_graph.md", render_knowledge_graph_markdown(graph))
        atomic_write_text(rb_dir / "knowledge_graph.mmd", render_knowledge_graph_mermaid(graph))
        finish("knowledge_graph")

    if not completed("indexes", ("document_index.md", "data_overview.md", "media_manifest.md")):
        print("[5/8] Writing document/data/media indexes...", file=sys.stderr)
        for name, content in zip(("document_index.md", "data_overview.md", "media_manifest.md"),
                                 _build_non_code_indexes(report)):
            atomic_write_text(rb_dir / name, content)
        finish("indexes")

    if refresh_scan_only:
        finish("module_docs", "skipped")
        finish("git_insights", "skipped")
        finish("module_registry", "skipped")
    else:
        print("[6/8] Module agents learning codebase...", file=sys.stderr)
        entries = build_refresh_module_swarm_v2(model, workspace)
        all_group_counts = {module: len(groups) for module, groups in entries}
        expected_groups = {module: [name for name, _, _ in groups] for module, groups in entries}
        module_entries = _filter_completed_groups_for_head(
            module_entries=entries, previous_status=previous_status,
            current_sha=current_sha, refresh_status=status, agents_dir=rb_dir / "agents",
        )
        _write_refresh_status(rb_dir, status)
        module_timeout = float(os.environ.get("RB_MODULE_AGENT_TIMEOUT_SECONDS", "300"))
        module_sem = asyncio.Semaphore(max(1, int(os.environ.get("RB_REFRESH_CONCURRENCY", "8"))))
        api_sem = asyncio.Semaphore(max(1, int(os.environ.get("RB_API_CONCURRENCY", "5"))))
        write_lock = asyncio.Lock()

        async def run_module(entry: tuple) -> None:
            async with module_sem:
                module, groups = entry

                async def run_group(group_name: str, group, agent) -> None:
                    state, reason, content = "success", None, None
                    try:
                        async with api_sem:
                            result = await _run_with_retry(
                                Runner.run, agent,
                                "Analyze the pre-loaded source code and produce a comprehensive Markdown knowledge document.",
                                max_turns=3, timeout=module_timeout, context=f"{module}/{group_name}",
                            )
                        content = str(result.final_output).strip()
                        if not content:
                            state, reason = "failed", "empty output"
                    except Exception as exc:
                        state, reason = "partial", str(exc) or type(exc).__name__
                        content = _build_agent_md_fallback(module, group_name, group)
                    async with write_lock:
                        if content:
                            path = _agent_md_path(rb_dir / "agents", module, group_name, all_group_counts[module])
                            try:
                                atomic_write_text(path, content)
                            except OSError as exc:
                                state, reason = "failed", f"knowledge document could not be saved: {exc}"
                        # Persisting success only after the artifact removes the
                        # old crash window between status and Markdown writes.
                        _mark_group_completion(status, module=module, group_name=group_name,
                                               state=state, head_sha=current_sha)
                        if reason:
                            _mark_module_failure(status, module, group_name, reason, state)
                        _write_refresh_status(rb_dir, status)

                results = await asyncio.gather(*(run_group(*group) for group in groups), return_exceptions=True)
                for result in results:
                    if isinstance(result, BaseException):
                        raise result
                status.modules[module] = _aggregate_states([
                    status.groups[_group_key(module, name)]
                    for name in expected_groups[module]
                ])
                if current_sha:
                    status.module_head_shas[module] = current_sha
                _write_refresh_status(rb_dir, status)

        results = await asyncio.gather(*(run_module(entry) for entry in module_entries), return_exceptions=True)
        for result in results:
            if isinstance(result, BaseException):
                raise result
        for module in detect_modules(workspace):
            if module not in status.modules:
                _mark_module_failure(status, module, None, "module produced no group agents", "failed")
        finish("module_docs", _aggregate_states(list(status.modules.values()), skipped_state="skipped"))

        if not completed("git_insights", ("modules/_git_insights.md",)):
            print("[7/8] Analyzing git history...", file=sys.stderr)
            try:
                if host_runner_mode:
                    _write_host_runner_git_insights(workspace)
                else:
                    await _run_with_retry(
                        Runner.run, build_refresh_git_agent(model, workspace),
                        "Analyze the project's git history and write your git insights document.",
                        max_turns=25, timeout=module_timeout, context="Git agent",
                    )
                if not _refresh_artifact_valid(rb_dir / "modules/_git_insights.md"):
                    raise ValueError("git insights agent did not save its knowledge document")
                finish("git_insights")
            except Exception as exc:
                _mark_stage_failure(status, "git_insights", str(exc) or type(exc).__name__, partial=True)
                _write_refresh_status(rb_dir, status)

        if not completed("module_registry", ("map.md", "module_registry.json", "module_registry.md")):
            print("[8/8] Generating module map...", file=sys.stderr)
            try:
                try:
                    content = await _generate_map_md(workspace, model or "")
                    if not content.strip():
                        raise ValueError("empty map output")
                except Exception as exc:
                    agent_error = f"Map Agent failed: {exc}"
                    try:
                        content = _build_fallback_map_md(workspace)
                    except Exception as fallback_exc:
                        raise RuntimeError(f"{agent_error}; deterministic map fallback failed: {fallback_exc}") from fallback_exc
                    status.warnings.extend([agent_error, "Deterministic map fallback used."])
                atomic_write_text(rb_dir / "map.md", content)
                registry_entries = _build_module_registry_entries(workspace, status)
                atomic_write_text(rb_dir / "module_registry.json", json.dumps(
                    [entry.model_dump(mode="json") for entry in registry_entries], ensure_ascii=False, indent=2))
                atomic_write_text(rb_dir / "module_registry.md", _render_module_registry_markdown(registry_entries))
                finish("module_registry")
            except Exception as exc:
                _mark_stage_failure(status, "module_registry", str(exc), partial=False)
                _write_refresh_status(rb_dir, status)

    if current_sha:
        atomic_write_text(rb_dir / ".last_refresh_sha", current_sha)
    status.overall_status = _aggregate_states(list(status.stages.values()) + list(status.modules.values()))
    _write_refresh_status(rb_dir, status)
    print(f"Refresh status: {status.overall_status} (exit code {status.exit_code})")
    return status


async def _refresh_pipeline_generation_entry(
    workspace: Path,
    *,
    full: bool = False,
) -> RefreshStatus:
    """Choose full, recovery, incremental, or no-op under the workspace lock."""
    from repobrain_engine.hub.incremental import (
        _resume_failed_generation,
        ensure_clean_worktree,
        get_head_sha,
        incremental_refresh,
        initialize_full_generation_metadata,
    )
    from repobrain_engine.hub.refresh_lifecycle import (
        ensure_publishable,
        find_recovery,
        generation_config,
        load_baseline,
        save_recovery,
    )
    from repobrain_engine.hub.storage import (
        atomic_write_json,
        create_generation,
        new_generation_id,
        promote_generation,
        read_current_pointer,
        use_knowledge_root,
    )

    workspace = workspace.expanduser().resolve()
    ensure_clean_worktree(workspace)
    head_sha = get_head_sha(workspace)
    config = generation_config()
    active = read_current_pointer(workspace)
    baseline_generation = str(active["generation"]) if active else None
    recovery = None if full else find_recovery(
        workspace, target_head=head_sha,
        baseline_generation=baseline_generation, config=config,
    )
    if recovery is not None:
        generation_root, mode = recovery
        print(f"Continuing previous {mode} refresh / 继续上次更新", file=sys.stderr)
        if mode == "incremental":
            return await _resume_failed_generation(workspace, generation_root=generation_root, model=None)
    else:
        if not full:
            pointer, snapshot = load_baseline(workspace, config)
            if pointer is not None and snapshot is not None:
                if pointer["head_sha"] == head_sha:
                    print("Knowledge base is already up to date / 知识库已是最新", file=sys.stderr)
                    return RefreshStatus(
                        refresh_run_id=new_generation_id(head_sha), overall_status="success",
                        head_sha=head_sha, target_head=head_sha,
                        baseline_generation=baseline_generation, mode="noop",
                    )
                if not config["scan_only"]:
                    print("Incremental refresh / 增量更新", file=sys.stderr)
                    return await incremental_refresh(workspace, config=config)
        print("Full rebuild / 全部重建" if full else "Building knowledge base / 构建完整知识库", file=sys.stderr)
        generation_root = create_generation(workspace, new_generation_id(head_sha), clone_active=False)
        save_recovery(generation_root, mode="full", target_head=head_sha,
                      baseline_generation=baseline_generation, config=config)

    # Keep all candidate progress on failure/interruption. Readers continue to
    # resolve the prior active generation until the entire candidate succeeds.
    with use_knowledge_root(generation_root):
        status = await _refresh_pipeline_into_generation(workspace, resume=recovery is not None)
        status.mode = "full"
        status.resumed = recovery is not None
        status.baseline_generation = baseline_generation
        status.target_head = head_sha
        atomic_write_json(generation_root / "status.json", status.model_dump(mode="json"))
        if status.overall_status != "success":
            return status
        snapshot = initialize_full_generation_metadata(workspace, generation_root, head_sha, status)
        atomic_write_json(generation_root / "refresh_config.json", config)
    ensure_publishable(workspace, generation_root, head_sha)
    promote_generation(workspace, generation=generation_root.name, head_sha=head_sha,
                       merkle_root=str(snapshot.get("merkle_root", "")))
    (generation_root / "resume.json").unlink(missing_ok=True)
    return status


async def refresh_pipeline(
    workspace: Path,
    *,
    full: bool = False,
) -> RefreshStatus:
    """Serialize and execute a generation-backed refresh."""
    from repobrain_engine.hub.storage import refresh_lock

    with refresh_lock(workspace):
        return await _refresh_pipeline_generation_entry(
            workspace,
            full=full,
        )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _mark_stage_failure(
    status: RefreshStatus,
    stage: str,
    reason: str,
    partial: bool,
) -> None:
    """Record a stage-level failure on the refresh status object.

    Args:
        status: Mutable refresh status object.
        stage: Stage identifier.
        reason: Human-readable failure reason.
        partial: Whether the stage is degraded instead of fully failed.
    """
    next_state = "partial" if partial else "failed"
    current_state = status.stages.get(stage)
    status.stages[stage] = _combine_states(current_state, next_state)
    status.failures.append(
        FailureRecord(
            stage=stage,
            reason=reason,
        )
    )


def _print_artifact_status(path: Path, stage_state: str) -> None:
    """Print whether a refresh artifact was updated or preserved.

    Args:
        path: Artifact path to report.
        stage_state: Stage state associated with the artifact.
    """
    if not path.exists():
        return
    if stage_state == "skipped":
        print(f"Preserved {path}")
        return
    print(f"Updated {path}")


def _mark_module_failure(
    status: RefreshStatus,
    module: str,
    group_name: str | None,
    reason: str,
    state: str,
) -> None:
    """Record a module- or group-level failure.

    Args:
        status: Mutable refresh status object.
        module: Module identifier.
        group_name: Optional group identifier.
        reason: Human-readable failure reason.
        state: Failure state, usually ``partial`` or ``failed``.
    """
    current_state = status.modules.get(module)
    status.modules[module] = _combine_states(current_state, state)
    status.failures.append(
        FailureRecord(
            stage="module_docs",
            module=module,
            group=group_name,
            reason=reason,
        )
    )


def _combine_states(
    current: str | None,
    new: str | None,
) -> str:
    """Combine two refresh states, keeping the more severe value.

    Args:
        current: Existing state, if any.
        new: Candidate next state.

    Returns:
        The more severe state.
    """
    priority = {
        None: 0,
        "skipped": 1,
        "success": 2,
        "partial": 3,
        "unresolved": 4,
        "failed": 5,
    }
    left = current if current in priority else "success"
    right = new if new in priority else "success"
    return left if priority[left] >= priority[right] else right


def _aggregate_states(
    states: list[str],
    skipped_state: str = "success",
) -> str:
    """Aggregate a list of refresh states into a single health status.

    Args:
        states: Stage or module states.
        skipped_state: Replacement state to use for ``skipped`` entries.

    Returns:
        Aggregate state.
    """
    normalized = [
        skipped_state if state == "skipped" else state
        for state in states
        if state
    ]
    if not normalized:
        return skipped_state
    if "failed" in normalized:
        return "failed"
    if "unresolved" in normalized:
        return "unresolved"
    if "partial" in normalized:
        return "partial"
    if "success" in normalized:
        return "success"
    return skipped_state


def _write_refresh_status(rb_dir: Path, status: RefreshStatus) -> None:
    """Persist refresh status to ``.repobrain/status.json``.

    Args:
        rb_dir: RepoBrain output directory.
        status: Refresh status document to serialize.
    """
    status_path = rb_dir / "status.json"
    atomic_write_text(status_path, json.dumps(status.model_dump(mode="json"), ensure_ascii=False, indent=2))


def _load_previous_refresh_status(rb_dir: Path) -> dict[str, object]:
    """Load a previous status.json payload without requiring new fields."""
    status_path = rb_dir / "status.json"
    try:
        payload = json.loads(status_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError, TypeError):
        return {}
    if not isinstance(payload, dict):
        return {}
    try:
        return RefreshStatus.model_validate(payload).model_dump(mode="json")
    except ValueError:
        return {}


def _refresh_artifact_valid(path: Path, *, allow_empty: bool = False) -> bool:
    """Require readable, structurally valid artifacts before reusing progress."""
    try:
        content = path.read_text(encoding="utf-8")
        if not content.strip() and not (allow_empty and path.suffix == ".jsonl"):
            return False
        if AGENT_MD_FALLBACK_SENTINEL in content:
            return False
        if path.suffix == ".json":
            payload = json.loads(content)
            required_type = list if path.name == "module_registry.json" else dict
            return isinstance(payload, required_type)
        if path.suffix == ".jsonl":
            return all(isinstance(json.loads(line), dict) for line in content.splitlines() if line.strip())
        return True
    except (OSError, UnicodeError, ValueError):
        return False


def _agent_md_path(agents_dir: Path, module: str, group_name: str, group_count: int) -> Path:
    """Keep document layout stable when only some groups need to resume."""
    from repobrain_engine.hub.incremental import _artifact_path

    return agents_dir.parent / _artifact_path(module, group_name, group_count)


def _group_key(module: str, group_name: str) -> str:
    """Return the stable status key for a module group."""
    return f"{module}/{group_name}"


def _mark_group_completion(
    status: RefreshStatus,
    *,
    module: str,
    group_name: str,
    state: str,
    head_sha: str | None,
) -> None:
    """Record completion state for a single module group."""
    key = _group_key(module, group_name)
    status.groups[key] = state
    if head_sha:
        status.head_sha = head_sha
        status.group_head_shas[key] = head_sha


def _previous_group_success_at_head(
    previous_status: dict[str, object],
    module: str,
    group_name: str,
    current_sha: str | None,
) -> bool:
    """Return whether a group already succeeded at the current HEAD."""
    if not current_sha:
        return False
    key = _group_key(module, group_name)
    groups = previous_status.get("groups")
    if isinstance(groups, dict):
        if groups.get(key) != "success":
            return False
        group_head_shas = previous_status.get("group_head_shas")
        if isinstance(group_head_shas, dict):
            return group_head_shas.get(key) == current_sha
        return previous_status.get("head_sha") == current_sha
    return False


def _filter_completed_groups_for_head(
    *,
    module_entries: list,
    previous_status: dict[str, object],
    current_sha: str | None,
    refresh_status: RefreshStatus,
    agents_dir: Path,
) -> list:
    """Remove groups with successful status and durable documents at this HEAD."""
    if not current_sha or not previous_status:
        return module_entries

    filtered_entries: list = []
    for module, group_entries in module_entries:
        remaining_groups: list = []
        skipped_groups = 0
        for group_name, group, agent in group_entries:
            if _previous_group_success_at_head(
                previous_status,
                module,
                group_name,
                current_sha,
            ) and _refresh_artifact_valid(_agent_md_path(agents_dir, module, group_name, len(group_entries))):
                skipped_groups += 1
                _mark_group_completion(
                    refresh_status,
                    module=module,
                    group_name=group_name,
                    state="success",
                    head_sha=current_sha,
                )
                continue
            remaining_groups.append((group_name, group, agent))
        if remaining_groups:
            filtered_entries.append((module, remaining_groups))
        elif skipped_groups:
            refresh_status.modules[module] = "success"
            refresh_status.module_head_shas[module] = current_sha
    return filtered_entries


def _extract_json_payload(output: object) -> dict[str, object]:
    """Extract the first JSON object from a model output payload.

    Args:
        output: Raw agent output.

    Returns:
        Parsed JSON object.

    Raises:
        ValueError: If no JSON object can be extracted.
    """
    if isinstance(output, dict):
        return output
    text = str(output).strip()
    if not text:
        raise ValueError("group facts output is empty")

    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, flags=re.DOTALL)
    if fenced:
        return json.loads(fenced.group(1))

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError("group facts output does not contain JSON")
    return json.loads(text[start : end + 1])


def _parse_group_facts_output(
    output: object,
    module: str,
    group_name: str,
) -> GroupFactsDocument:
    """Parse model output into a structured group facts document.

    Args:
        output: Raw model output.
        module: Owning module identifier.
        group_name: Group identifier.

    Returns:
        Parsed and normalized group facts document.
    """
    payload = _extract_json_payload(output)
    payload["module"] = module
    payload["group_name"] = group_name
    document = GroupFactsDocument.model_validate(payload)
    normalized_claims: list[ModuleClaim] = []
    for claim in document.claims:
        claim.claim_id = _sanitize_claim_id(
            claim.claim_id or f"{module}.{group_name}.{claim.claim_type}"
        )
        claim.source_files = _dedupe_strings(claim.source_files or document.source_files)
        claim.evidence = _dedupe_evidence(claim.evidence)
        normalized_claims.append(claim)
    document.claims = normalized_claims
    document.source_files = _dedupe_strings(document.source_files)
    return document


def _build_group_facts_fallback(
    module: str,
    group_name: str,
    group,
) -> GroupFactsDocument:
    """Build deterministic fallback facts for a failed group agent.

    Args:
        module: Module identifier.
        group_name: Group identifier.
        group: File grouping object from ``module_grouping``.

    Returns:
        Deterministic group facts document.
    """
    source_files = [source_file.rel_path for source_file in group.files]
    claims: list[ModuleClaim] = []
    for source_file in group.files:
        claims.extend(_extract_symbol_claims(source_file))
    return GroupFactsDocument(
        module=module,
        group_name=group_name,
        source_files=_dedupe_strings(source_files),
        claims=claims[:18],
    )


def _extract_symbol_claims(source_file) -> list[ModuleClaim]:
    """Extract lightweight fallback claims from a source file.

    Args:
        source_file: Source file object from ``module_grouping``.

    Returns:
        Structured claims for top-level definitions and dependencies.
    """
    suffix = Path(source_file.rel_path).suffix.lower()
    if suffix == ".py":
        return _extract_python_symbol_claims(source_file)
    if suffix in {".js", ".jsx", ".ts", ".tsx"}:
        return _extract_js_symbol_claims(source_file)
    return []


def _extract_python_symbol_claims(source_file) -> list[ModuleClaim]:
    """Extract fallback claims from a Python source file.

    .. deprecated::
        Legacy function kept for backward compatibility with existing
        ``modules/*.facts.json`` artifacts. New refresh pipeline uses
        LLM-based analysis (``agents/*.md``) instead.

    Args:
        source_file: Source file object from ``module_grouping``.

    Returns:
        Claims derived from top-level definitions and imports.
    """
    import ast  # noqa: F811 — lazy import for legacy path only
    claims: list[ModuleClaim] = []
    rel_path = source_file.rel_path
    lines = source_file.content.splitlines()
    try:
        tree = ast.parse(source_file.content, filename=rel_path)
    except SyntaxError:
        return claims

    for node in ast.iter_child_nodes(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            symbol_name = node.name
            start_line = int(getattr(node, "lineno", 1))
            end_line = int(getattr(node, "end_lineno", start_line))
            claims.append(
                ModuleClaim(
                    claim_id=_sanitize_claim_id(f"{rel_path}.{symbol_name}.definition"),
                    claim_type="symbol_definition",
                    statement=f"`{symbol_name}` is defined in `{rel_path}`.",
                    importance="low",
                    source_files=[rel_path],
                    evidence=[
                        EvidenceSpan(
                            file=rel_path,
                            start_line=start_line,
                            end_line=end_line,
                            excerpt=_slice_excerpt(lines, start_line, end_line),
                        )
                    ],
                )
            )
        elif isinstance(node, ast.Import):
            for alias in node.names[:3]:
                imported_name = alias.name
                claims.append(
                    ModuleClaim(
                        claim_id=_sanitize_claim_id(f"{rel_path}.{imported_name}.dependency"),
                        claim_type="dependency",
                        statement=f"`{rel_path}` imports `{imported_name}`.",
                        importance="low",
                        source_files=[rel_path],
                        evidence=[
                            EvidenceSpan(
                                file=rel_path,
                                start_line=int(getattr(node, "lineno", 1)),
                                end_line=int(
                                    getattr(node, "end_lineno", getattr(node, "lineno", 1))
                                ),
                                excerpt=_slice_excerpt(
                                    lines,
                                    int(getattr(node, "lineno", 1)),
                                    int(
                                        getattr(
                                            node,
                                            "end_lineno",
                                            getattr(node, "lineno", 1),
                                        )
                                    ),
                                ),
                            )
                        ],
                    )
                )
        elif isinstance(node, ast.ImportFrom):
            imported_from = node.module or "."
            claims.append(
                ModuleClaim(
                    claim_id=_sanitize_claim_id(f"{rel_path}.{imported_from}.dependency"),
                    claim_type="dependency",
                    statement=f"`{rel_path}` depends on `{imported_from}`.",
                    importance="low",
                    source_files=[rel_path],
                    evidence=[
                        EvidenceSpan(
                            file=rel_path,
                            start_line=int(getattr(node, "lineno", 1)),
                            end_line=int(
                                getattr(node, "end_lineno", getattr(node, "lineno", 1))
                            ),
                            excerpt=_slice_excerpt(
                                lines,
                                int(getattr(node, "lineno", 1)),
                                int(getattr(node, "end_lineno", getattr(node, "lineno", 1))),
                            ),
                        )
                    ],
                )
            )
    return claims


def _extract_js_symbol_claims(source_file) -> list[ModuleClaim]:
    """Extract fallback claims from a JS/TS source file.

    Args:
        source_file: Source file object from ``module_grouping``.

    Returns:
        Claims derived from exports and imports.
    """
    claims: list[ModuleClaim] = []
    rel_path = source_file.rel_path
    lines = source_file.content.splitlines()

    export_patterns = [
        re.compile(r"^\s*export\s+(?:async\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)"),
        re.compile(r"^\s*export\s+class\s+([A-Za-z_][A-Za-z0-9_]*)"),
        re.compile(r"^\s*export\s+(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)"),
        re.compile(r"^\s*export\s+default\s+function\s+([A-Za-z_][A-Za-z0-9_]*)"),
        re.compile(r"^\s*export\s+default\s+class\s+([A-Za-z_][A-Za-z0-9_]*)"),
    ]
    import_pattern = re.compile(r"""^\s*import\s+.+?\s+from\s+['"](.+?)['"]""")

    for line_no, line in enumerate(lines, start=1):
        for pattern in export_patterns:
            match = pattern.search(line)
            if not match:
                continue
            symbol_name = match.group(1)
            claims.append(
                ModuleClaim(
                    claim_id=_sanitize_claim_id(f"{rel_path}.{symbol_name}.definition"),
                    claim_type="symbol_definition",
                    statement=f"`{symbol_name}` is exported from `{rel_path}`.",
                    importance="low",
                    source_files=[rel_path],
                    evidence=[
                        EvidenceSpan(
                            file=rel_path,
                            start_line=line_no,
                            end_line=line_no,
                            excerpt=line.strip(),
                        )
                    ],
                )
            )
            break

        import_match = import_pattern.search(line)
        if import_match:
            imported_from = import_match.group(1)
            claims.append(
                ModuleClaim(
                    claim_id=_sanitize_claim_id(f"{rel_path}.{imported_from}.dependency"),
                    claim_type="dependency",
                    statement=f"`{rel_path}` imports `{imported_from}`.",
                    importance="low",
                    source_files=[rel_path],
                    evidence=[
                        EvidenceSpan(
                            file=rel_path,
                            start_line=line_no,
                            end_line=line_no,
                            excerpt=line.strip(),
                        )
                    ],
                )
            )
    return claims


def _sanitize_claim_id(raw_claim_id: str) -> str:
    """Normalize claim identifiers for stable merging.

    Args:
        raw_claim_id: Proposed claim identifier.

    Returns:
        Sanitized identifier safe for JSON merging.
    """
    normalized = raw_claim_id.strip().lower()
    normalized = re.sub(r"[^a-z0-9._-]+", "_", normalized)
    normalized = re.sub(r"_+", "_", normalized)
    return normalized.strip("._") or "claim"


def _slice_excerpt(
    lines: list[str],
    start_line: int,
    end_line: int,
) -> str:
    """Slice a bounded excerpt from source lines.

    Args:
        lines: Source file split into lines.
        start_line: Inclusive 1-based start line.
        end_line: Inclusive 1-based end line.

    Returns:
        Joined excerpt string.
    """
    bounded_end = min(len(lines), max(start_line, end_line))
    bounded_start = max(1, start_line)
    window_end = min(bounded_end, bounded_start + 19)
    return "\n".join(lines[bounded_start - 1 : window_end]).strip()


def _merge_group_facts(
    module: str,
    group_docs: list[GroupFactsDocument],
) -> ModuleFactsDocument:
    """Merge multiple group fact documents into one module artifact.

    Args:
        module: Module identifier.
        group_docs: Facts extracted from module groups.

    Returns:
        Deterministic merged module facts document.
    """
    merged_claims: dict[str, ModuleClaim] = {}
    all_source_files: list[str] = []
    groups: list[str] = []

    for document in group_docs:
        groups.append(document.group_name)
        all_source_files.extend(document.source_files)
        for claim in document.claims:
            claim_id = _sanitize_claim_id(claim.claim_id)
            if claim_id not in merged_claims:
                merged_claims[claim_id] = claim.model_copy(deep=True)
                merged_claims[claim_id].claim_id = claim_id
                continue

            existing = merged_claims[claim_id]
            existing.importance = _max_importance(existing.importance, claim.importance)
            existing.source_files = _dedupe_strings(existing.source_files + claim.source_files)
            existing.evidence = _dedupe_evidence(existing.evidence + claim.evidence)
            if len(claim.statement) > len(existing.statement):
                existing.statement = claim.statement
            if claim.claim_type != existing.claim_type and existing.claim_type == "symbol_definition":
                existing.claim_type = claim.claim_type

    ordered_claims = sorted(
        merged_claims.values(),
        key=lambda claim: (
            -_importance_rank(claim.importance),
            claim.claim_type,
            claim.claim_id,
        ),
    )
    return ModuleFactsDocument(
        module=module,
        groups=_dedupe_strings(groups),
        source_files=_dedupe_strings(all_source_files),
        claims=ordered_claims,
    )


def _importance_rank(importance: str) -> int:
    """Rank claim importance for sorting and merging.

    Args:
        importance: Claim importance label.

    Returns:
        Higher value means higher importance.
    """
    ranking = {"high": 3, "medium": 2, "low": 1}
    return ranking.get(importance, 1)


def _max_importance(left: str, right: str) -> str:
    """Return the more important of two claim importance levels.

    Args:
        left: First importance label.
        right: Second importance label.

    Returns:
        Higher-priority importance label.
    """
    return left if _importance_rank(left) >= _importance_rank(right) else right


def _dedupe_strings(items: list[str]) -> list[str]:
    """Deduplicate strings while preserving order.

    Args:
        items: Candidate strings.

    Returns:
        Deduplicated strings.
    """
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        text = str(item).strip()
        if not text or text in seen:
            continue
        seen.add(text)
        result.append(text)
    return result


def _dedupe_evidence(evidence: list[EvidenceSpan]) -> list[EvidenceSpan]:
    """Deduplicate evidence spans while preserving order.

    Args:
        evidence: Candidate evidence spans.

    Returns:
        Deduplicated evidence spans.
    """
    seen: set[tuple[str, int, int, str]] = set()
    result: list[EvidenceSpan] = []
    for item in evidence:
        key = (item.file, item.start_line, item.end_line, item.excerpt)
        if key in seen:
            continue
        seen.add(key)
        result.append(item)
    return result


def _write_host_runner_git_insights(workspace: Path) -> Path:
    """Write a deterministic git insights doc for host-runner mode.

    The normal git stage drives a tool-using agent (git_log/git_diff/…),
    which a :class:`HostRunnerModel` cannot invoke. This writes the
    pre-extracted git data straight to ``.repobrain/modules/_git_insights.md``
    — the same artifact the agent would have produced — so downstream Q&A
    still has git context, just without LLM narration.

    Args:
        workspace: Project root directory.

    Returns:
        Path to the written git insights document.
    """
    from repobrain_engine.hub.scanner import extract_git_insights

    git_data = extract_git_insights(workspace)
    modules_dir = knowledge_root(workspace) / "modules"
    modules_dir.mkdir(parents=True, exist_ok=True)
    doc_path = modules_dir / "_git_insights.md"
    content = (
        "# Git Insights\n\n"
        "_Generated in host-runner mode without an API key. This is the "
        "pre-extracted git data; no LLM narration was applied._\n\n"
        f"{git_data.strip()}\n"
    )
    atomic_write_text(doc_path, content)
    return doc_path


def _build_agent_md_fallback(
    module: str,
    group_name: str,
    group,
) -> str:
    """Build a minimal fallback agent.md when the LLM fails.

    Lists source files with basic metadata (path, language, line count).

    Args:
        module: Module identifier.
        group_name: Group identifier.
        group: File grouping object from ``module_grouping``.

    Returns:
        Markdown string with file listing.
    """
    lines = [
        AGENT_MD_FALLBACK_MARKER,
        f"# Module: {module} — Group: {group_name}",
        "",
        AGENT_MD_FALLBACK_SENTINEL,
        "",
        "## Source Files",
        "",
    ]
    for source_file in group.files:
        line_count = source_file.content.count("\n") + 1
        lines.append(
            f"- `{source_file.rel_path}` ({source_file.language}, {line_count} lines)"
        )
    return "\n".join(lines) + "\n"


def _write_module_artifacts(
    modules_dir: Path,
    document: ModuleFactsDocument,
) -> None:
    """Write deterministic JSON and Markdown artifacts for a module.

    Args:
        modules_dir: Module artifact directory.
        document: Module facts to persist.
    """
    facts_path = modules_dir / f"{document.module}.facts.json"
    markdown_path = modules_dir / f"{document.module}.md"
    facts_path.write_text(
        json.dumps(document.model_dump(mode="json"), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    markdown_path.write_text(
        _render_module_markdown(document),
        encoding="utf-8",
    )


def _render_module_markdown(document: ModuleFactsDocument) -> str:
    """Render a human-readable Markdown view of module facts.

    Args:
        document: Module facts document.

    Returns:
        Markdown summary for human inspection.
    """
    lines = [
        f"# Module: {document.module}",
        "",
        f"- Groups: {', '.join(document.groups) if document.groups else '(none)'}",
        f"- Source files: {len(document.source_files)}",
        f"- Claims: {len(document.claims)}",
        f"- Generated at: {document.generated_at}",
        "",
    ]
    if document.source_files:
        lines.append("## Source Files")
        lines.append("")
        for rel_path in document.source_files[:20]:
            lines.append(f"- `{rel_path}`")
        if len(document.source_files) > 20:
            lines.append(f"- ... ({len(document.source_files) - 20} more)")
        lines.append("")

    claim_groups: dict[str, list[ModuleClaim]] = {}
    for claim in document.claims:
        claim_groups.setdefault(claim.claim_type, []).append(claim)

    for claim_type in sorted(claim_groups):
        lines.append(f"## {claim_type.replace('_', ' ').title()}")
        lines.append("")
        for claim in claim_groups[claim_type]:
            lines.append(f"- [{claim.importance}] {claim.statement}")
            for evidence in claim.evidence[:2]:
                lines.append(
                    f"  - Evidence: `{evidence.file}:{evidence.start_line}-{evidence.end_line}`"
                )
        lines.append("")
    return "\n".join(lines).strip() + "\n"


def _build_module_registry_entries(
    workspace: Path,
    status: RefreshStatus,
) -> list[ModuleRegistryEntry]:
    """Build lightweight module routing entries from facts artifacts.

    Args:
        workspace: Project root directory.
        status: Refresh status document for module health.

    Returns:
        Sorted module registry entries.
    """
    from repobrain_engine.hub.scanner import (
        detect_modules,
        list_root_module_files,
        resolve_module_path,
    )

    modules_dir = knowledge_root(workspace) / "modules"
    entries: list[ModuleRegistryEntry] = []
    for module_name in detect_modules(workspace):
        facts_path = modules_dir / f"{module_name}.facts.json"
        if facts_path.is_file():
            document = ModuleFactsDocument.model_validate_json(
                facts_path.read_text(encoding="utf-8")
            )
            keywords = _extract_registry_keywords(document)
            top_paths = document.source_files[:8]
            summary = _build_registry_summary(document)
        else:
            module_path = resolve_module_path(workspace, module_name)
            if module_name == WORKSPACE_ROOT_MODULE_ID:
                top_paths = [path.name for path in list_root_module_files(workspace)[:8]]
            else:
                top_paths = _list_module_files(module_path).splitlines()[:8]
            keywords = _tokenize_text(_module_display_name(module_name))
            if module_name == WORKSPACE_ROOT_MODULE_ID:
                for rel_path in top_paths:
                    keywords.extend(_tokenize_text(rel_path.replace(".", " ")))
            summary = _module_display_name(module_name)

        entries.append(
            ModuleRegistryEntry(
                module=module_name,
                keywords=keywords[:12],
                top_paths=[
                    path.removeprefix("- ").strip()
                    for path in top_paths
                    if path.strip()
                ],
                status=status.modules.get(module_name, "failed"),
                summary=summary,
            )
        )
    return sorted(entries, key=lambda entry: entry.module)


def _extract_registry_keywords(document: ModuleFactsDocument) -> list[str]:
    """Extract routing keywords from a module facts document.

    Args:
        document: Module facts document.

    Returns:
        Deduplicated routing keywords.
    """
    keywords: list[str] = []
    keywords.extend(_tokenize_text(_module_display_name(document.module)))
    for claim in document.claims[:20]:
        keywords.append(claim.claim_type.replace("_", " "))
        keywords.extend(_tokenize_text(claim.statement))
    for rel_path in document.source_files[:10]:
        keywords.extend(_tokenize_text(rel_path.replace("/", " ").replace(".", " ")))
    return _dedupe_strings(keywords)


def _build_registry_summary(document: ModuleFactsDocument) -> str:
    """Build a short human-readable module summary from top claims.

    Args:
        document: Module facts document.

    Returns:
        Short summary sentence.
    """
    top_claims = sorted(
        document.claims,
        key=lambda claim: (-_importance_rank(claim.importance), claim.claim_id),
    )[:2]
    if not top_claims:
        return _module_display_name(document.module)
    return " ".join(claim.statement for claim in top_claims)


def _render_module_registry_markdown(entries: list[ModuleRegistryEntry]) -> str:
    """Render registry entries into a compact Markdown overview.

    Args:
        entries: Machine-readable registry entries.

    Returns:
        Human-readable Markdown registry.
    """
    lines = ["# Module Registry", ""]
    for entry in entries:
        tags = ", ".join(entry.keywords[:8]) if entry.keywords else entry.summary
        lines.append(f"- **{_module_display_name(entry.module)}** ({entry.status}): {tags}")
        if entry.summary:
            lines.append(f"  Summary: {entry.summary}")
    return "\n".join(lines).strip() + "\n"


def _module_display_name(module_name: str) -> str:
    """Return a human-readable module label for docs and routing summaries.

    Args:
        module_name: Internal module identifier.

    Returns:
        Display-safe module label.
    """
    if module_name == WORKSPACE_ROOT_MODULE_ID:
        return "workspace root"
    return module_name.replace("_", " ")


def _tokenize_text(text: str) -> list[str]:
    """Tokenize free-form text into routing-friendly lowercase keywords.

    Args:
        text: Input text.

    Returns:
        Lowercase keyword tokens with lightweight stop-word filtering.
    """
    stop_words = {
        "the", "and", "for", "with", "from", "this", "that",
        "into", "uses", "used", "module", "project", "file",
        "files", "code", "data", "path", "paths", "json",
        "python", "function", "class",
    }
    tokens = re.findall(r"[a-zA-Z0-9_]{3,}", text.lower())
    return [token for token in tokens if token not in stop_words]

def _format_scan_report(report) -> str:
    """Format a ScanReport into a prompt string."""
    lines = [f"Project root: {report.root}"]

    if report.languages:
        lines.append("\nLanguages (file count):")
        for lang, count in list(report.languages.items())[:10]:
            lines.append(f"  - {lang}: {count}")

    if report.frameworks:
        lines.append("\nFrameworks/Tools detected:")
        for fw in report.frameworks:
            lines.append(f"  - {fw}")

    if report.top_dirs:
        lines.append(f"\nTop-level directories: {', '.join(report.top_dirs)}")

    lines.append(f"\nTotal files: {report.file_count}")
    lines.append(f"Scan elapsed seconds: {getattr(report, 'scan_elapsed_seconds', 0.0):.2f}")
    lines.append(f"Scan timed out: {getattr(report, 'timed_out', False)}")
    if getattr(report, "scan_stopped_reason", ""):
        lines.append(f"Scan stop reason: {report.scan_stopped_reason}")
    lines.append(f"Has tests: {report.has_tests}")
    lines.append(f"Has CI: {report.has_ci}")
    lines.append(f"Has Docker: {report.has_docker}")
    if getattr(report, "type_distribution", None):
        lines.append("\nFile types:")
        for ftype, count in report.type_distribution.items():
            lines.append(f"  - {ftype}: {count}")
    lines.append(f"Unreadable files: {getattr(report, 'unreadable_files', 0)}")
    lines.append(f"Oversized files: {getattr(report, 'oversized_files', 0)}")

    if report.readme_snippet:
        lines.append(f"\nREADME excerpt:\n{report.readme_snippet}")

    samples = getattr(report, "scanned_file_samples", [])
    if samples:
        lines.append("\nScanned file samples:")
        for rel in samples[:30]:
            lines.append(f"  - {rel}")

    if getattr(report, "config_contents", None):
        lines.append("\n--- Configuration files (actual content) ---")
        for name, content in report.config_contents.items():
            lines.append(f"\n### {name}\n```\n{content}\n```")

    if getattr(report, "entry_points", None):
        lines.append("\n--- Entry point files (first lines) ---")
        for name, content in report.entry_points.items():
            lines.append(f"\n### {name}\n```\n{content}\n```")

    git_summary = getattr(report, "git_summary", "")
    if git_summary:
        lines.append(f"\n--- Git activity ---\n{git_summary}")

    return "\n".join(lines)


def _export_normalized_graph_store(rb_dir: Path, graph: dict[str, Any]) -> None:
    """Export knowledge graph into normalized JSONL graph store files.

    Args:
        rb_dir: The ``.repobrain`` directory path.
        graph: The in-memory knowledge graph payload.
    """
    graph_dir = rb_dir / "graph"
    graph_dir.mkdir(parents=True, exist_ok=True)

    nodes = graph.get("nodes", [])
    edges = graph.get("edges", [])
    if not isinstance(nodes, list):
        nodes = []
    if not isinstance(edges, list):
        edges = []

    retrieval_id = str(graph.get("created_at_utc", "")) or "refresh-knowledge-graph"
    tool_name = "refresh_pipeline"

    nodes_lines: list[str] = []
    for node in nodes:
        if not isinstance(node, dict):
            continue
        nodes_lines.append(
            json.dumps(
                {
                    "schema": "repobrain-graph-node-v1",
                    "retrieval_id": retrieval_id,
                    "tool_name": tool_name,
                    "node": node,
                },
                ensure_ascii=False,
            )
        )
    (graph_dir / "nodes.jsonl").write_text(
        ("\n".join(nodes_lines) + "\n") if nodes_lines else "",
        encoding="utf-8",
    )

    edges_lines: list[str] = []
    for edge in edges:
        if not isinstance(edge, dict):
            continue
        edges_lines.append(
            json.dumps(
                {
                    "schema": "repobrain-graph-edge-v1",
                    "retrieval_id": retrieval_id,
                    "tool_name": tool_name,
                    "edge": edge,
                },
                ensure_ascii=False,
            )
        )
    (graph_dir / "edges.jsonl").write_text(
        ("\n".join(edges_lines) + "\n") if edges_lines else "",
        encoding="utf-8",
    )


def _get_head_sha(workspace: Path) -> str | None:
    """Get the current HEAD commit SHA."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            capture_output=True,
            text=True,
            cwd=str(workspace),
            check=False,
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except FileNotFoundError:
        pass
    return None


def _build_non_code_indexes(report) -> tuple[str, str, str]:
    """Build document/data/media markdown indexes from scan metadata."""
    docs: list[str] = []
    data: list[str] = []
    media: list[str] = []
    for rel, meta in getattr(report, "file_metadata", {}).items():
        ftype = str(meta.get("type", "other"))
        size = int(meta.get("size", 0))
        mime = str(meta.get("mime", "unknown"))
        line = f"- {rel} ({size} bytes, {mime})"
        if ftype == "documentation":
            docs.append(line)
        elif ftype == "data":
            data.append(line)
        elif ftype == "media":
            media.append(line)

    def _render(title: str, items: list[str]) -> str:
        if not items:
            return f"# {title}\n\n(none)\n"
        body = "\n".join(items[:200])
        if len(items) > 200:
            body += f"\n- ... ({len(items) - 200} more)"
        return f"# {title}\n\n{body}\n"

    return (
        _render("Document Index", docs),
        _render("Data Overview", data),
        _render("Media Manifest", media),
    )


def _build_scan_payload(report) -> dict[str, object]:
    """Build a JSON-serializable scan payload for traceability."""
    return {
        "root": str(getattr(report, "root", "")),
        "file_count": int(getattr(report, "file_count", 0)),
        "walked_file_count": int(getattr(report, "walked_file_count", 0)),
        "languages": dict(getattr(report, "languages", {}) or {}),
        "frameworks": list(getattr(report, "frameworks", []) or []),
        "type_distribution": dict(getattr(report, "type_distribution", {}) or {}),
        "timed_out": bool(getattr(report, "timed_out", False)),
        "scan_elapsed_seconds": float(getattr(report, "scan_elapsed_seconds", 0.0)),
        "scan_stopped_reason": str(getattr(report, "scan_stopped_reason", "") or ""),
        "scanned_file_samples": list(getattr(report, "scanned_file_samples", []) or []),
        "changed_files": list(getattr(report, "changed_files", []) or []),
        "unreadable_files": int(getattr(report, "unreadable_files", 0)),
        "oversized_files": int(getattr(report, "oversized_files", 0)),
        "binary_files": int(getattr(report, "binary_files", 0)),
    }


async def _generate_map_md(workspace: Path, model: str) -> str:
    """Generate map.md by feeding agent.md files to a Map Agent.

    Reads all ``agents/*.md`` files and passes them to a Map Agent LLM
    that produces a concise routing index.  If the total content exceeds
    a reasonable context size, groups are fed to multiple Map Agents and
    their outputs are concatenated.

    Args:
        workspace: Project root directory.
        model: LLM model identifier.

    Returns:
        Markdown content for map.md.
    """
    from repobrain_engine.hub.agents import build_map_agent

    try:
        from agents import Runner
    except ImportError:
        raise ImportError(
            "OpenAI Agent SDK not found. Install: pip install repobrain-engine"
        ) from None

    agents_dir = knowledge_root(workspace) / "agents"
    if not agents_dir.exists():
        return _build_fallback_map_md(workspace)

    # Collect all agent.md content
    agent_docs: list[tuple[str, str]] = []
    for item in sorted(agents_dir.iterdir()):
        if item.is_file() and item.suffix == ".md":
            module_name = item.stem
            try:
                content = item.read_text(encoding="utf-8")
                agent_docs.append((module_name, content))
            except OSError:
                continue
        elif item.is_dir():
            # Multi-group module
            module_name = item.name
            for md_file in sorted(item.glob("*.md")):
                try:
                    content = md_file.read_text(encoding="utf-8")
                    agent_docs.append((f"{module_name}/{md_file.stem}", content))
                except OSError:
                    continue

    if not agent_docs:
        return _build_fallback_map_md(workspace)

    # Split agent docs into context-sized batches.
    # Each batch gets its own Map Agent call; results are concatenated.
    max_batch_chars = int(os.environ.get("RB_MAP_BATCH_CHARS", "30000"))
    max_doc_chars = 20_000  # truncate individual docs to keep batches balanced

    batches: list[list[str]] = []
    current_batch: list[str] = []
    current_chars = 0

    for name, content in agent_docs:
        header = f"\n---\n## Agent: {name}\n"
        truncated = content[:max_doc_chars] if len(content) > max_doc_chars else content
        part = header + truncated
        if current_batch and current_chars + len(part) > max_batch_chars:
            batches.append(current_batch)
            current_batch = []
            current_chars = 0
        current_batch.append(part)
        current_chars += len(part)

    if current_batch:
        batches.append(current_batch)

    map_agent = build_map_agent(model)
    map_timeout = float(os.environ.get("RB_MAP_AGENT_TIMEOUT_SECONDS", "300"))

    async def _run_map_batch(batch: list[str], batch_idx: int) -> str:
        prompt = "Create a map.md from these module knowledge documents:\n" + "\n".join(batch)
        result = await _run_with_retry(
            Runner.run, map_agent, prompt,
            timeout=map_timeout,
            context=f"Map agent batch {batch_idx}",
        )
        return str(result.final_output).strip()

    if len(batches) == 1:
        return await _run_map_batch(batches[0], 0)

    # Multiple batches → parallel Map Agent calls → concatenate
    print(
        f"  → Map Agent: {len(agent_docs)} docs split into {len(batches)} batches",
        file=sys.stderr,
    )
    partial_maps = await asyncio.gather(
        *[_run_map_batch(batch, i) for i, batch in enumerate(batches)]
    )
    # Concatenate: keep the first header, strip duplicate headers from subsequent
    combined_parts: list[str] = []
    for i, partial in enumerate(partial_maps):
        if i == 0:
            combined_parts.append(partial)
        else:
            # Strip leading "# Module Map" header from subsequent batches
            lines = partial.splitlines()
            start = 0
            for j, line in enumerate(lines):
                if line.strip().startswith("## "):
                    start = j
                    break
            combined_parts.append("\n".join(lines[start:]))

    return "\n\n".join(combined_parts)


def _build_fallback_map_md(workspace: Path) -> str:
    """Build a basic map.md without LLM, from agent.md file listing.

    Args:
        workspace: Project root directory.

    Returns:
        Markdown content for a fallback map.
    """
    from repobrain_engine.hub.scanner import detect_modules, resolve_module_path

    modules = detect_modules(workspace)
    if not modules:
        return "# Module Map\n\n(No modules detected)\n"

    lines = ["# Module Map\n"]
    agents_dir = knowledge_root(workspace) / "agents"

    for mod in modules:
        mod_path = resolve_module_path(workspace, mod)
        try:
            rel_dir = str(mod_path.relative_to(workspace))
        except ValueError:
            rel_dir = mod

        lines.append(f"## {mod}")
        lines.append(f"**Path:** `{rel_dir}/`")

        # Check if agent.md exists for a brief summary
        agent_md = agents_dir / f"{mod}.md" if agents_dir.exists() else None
        if agent_md and agent_md.is_file():
            try:
                first_lines = agent_md.read_text(encoding="utf-8").splitlines()[:3]
                desc = " ".join(line.strip("#").strip() for line in first_lines if line.strip())
                if desc:
                    lines.append(f"**Description:** {desc[:200]}")
            except OSError:
                pass

        lines.append("")

    return "\n".join(lines)


async def _generate_module_registry(workspace: Path, model: str) -> str:
    """Call LLM to generate a module registry from all available knowledge.

    Reads structure.md (always available) and modules/*.md (if generated),
    then asks the LLM to produce a concise 2-3 sentence description per module.

    Args:
        workspace: Project root directory.
        model: LLM model identifier.

    Returns:
        Markdown content for module_registry.md.
    """
    from repobrain_engine.hub.scanner import detect_modules

    rb_dir = knowledge_root(workspace)
    modules = detect_modules(workspace)

    # -- Collect per-module evidence --
    from repobrain_engine.hub.scanner import resolve_module_path

    # Read structure.md once
    structure = ""
    structure_file = rb_dir / "structure.md"
    if structure_file.is_file():
        try:
            structure = structure_file.read_text(encoding="utf-8")
        except OSError:
            pass

    module_evidence: list[str] = []
    for mod in modules:
        parts: list[str] = [f"### Module: {mod}"]

        # Source 1: module knowledge doc (best quality, from RefreshModuleAgent)
        mod_doc = rb_dir / "modules" / f"{mod}.md"
        if mod_doc.is_file():
            try:
                content = mod_doc.read_text(encoding="utf-8")
                # Take first 800 chars — usually contains purpose + key files
                parts.append(f"**Deep knowledge (excerpt):**\n{content[:800]}")
            except OSError:
                pass

        # Source 2: structure.md section (AST-extracted)
        # Use resolve_module_path for accurate directory matching
        mod_path = resolve_module_path(workspace, mod)
        rel_dir = str(mod_path.relative_to(workspace)) + "/"
        if structure:
            section = _extract_module_section(structure, mod, rel_dir)
            if section:
                parts.append(f"**Code structure:**\n{section[:1200]}")

        # Source 3: fallback — list actual files if structure.md had no section
        if len(parts) == 1:  # Only has the header, no evidence yet
            file_listing = _list_module_files(mod_path)
            if file_listing:
                parts.append(f"**Files in module:**\n{file_listing[:1200]}")

        module_evidence.append("\n".join(parts))

    # -- Build LLM prompt --
    evidence_text = "\n\n---\n\n".join(module_evidence)

    # Include conventions.md for overall context
    conventions = ""
    conv_file = rb_dir / "conventions.md"
    if conv_file.is_file():
        try:
            conventions = conv_file.read_text(encoding="utf-8")[:2000]
        except OSError:
            pass

    prompt = f"""\
You are a senior software architect. Based on the evidence below, write an
**ultra-compact Module Registry** — a tag-line index for a Router agent.

FORMAT — one line per module, NO exceptions:
- **module_name**: 5-10 keyword tags (comma-separated)

The Router reads the ENTIRE registry to decide which module expert to
consult. Keep it SHORT so it always fits in context. Focus on what
TOPICS and QUESTIONS each module can answer.

GOOD example:
- **extensions_telegram**: Telegram bot, polling, message handlers, voice, grammY
- **src_gateway**: WebSocket server, device auth, TLS, protocol, REST API

BAD example (too long):
- **extensions_telegram**: The Telegram integration provides complete bot infrastructure including inbound message processing...

Output ONLY the Markdown registry. Start with `# Module Registry`.

---

## Project Overview
{conventions}

---

## Module Evidence

{evidence_text}
"""

    # -- Single LLM call --
    from agents import Agent, Runner

    registry_agent = Agent(
        name="RegistryWriter",
        instructions="Output only the requested Markdown. No commentary.",
        model=model,
    )

    registry_timeout = float(os.environ.get("RB_REGISTRY_TIMEOUT_SECONDS", "120"))
    result = await _run_with_retry(
        Runner.run, registry_agent, prompt,
        timeout=registry_timeout,
        context="Registry agent",
    )

    return result.final_output


def _extract_module_section(structure_text: str, module_id: str, rel_dir: str = "") -> str:
    """Extract lines from structure.md relevant to a module.

    Matches both ``## dir/`` section headers and ``### dir/file.py`` file
    entries whose path starts with the module's resolved directory.

    Args:
        structure_text: Full content of structure.md.
        module_id: Module identifier (e.g. "src_tools", "frontend").
        rel_dir: Resolved relative directory path (e.g. "src/opencmo/tools/").

    Returns:
        Extracted section text, or empty string.
    """
    # Build prefixes to match
    prefixes: list[str] = [f"{module_id}/"]
    if rel_dir:
        prefixes.append(rel_dir)
        prefixes.append(rel_dir.rstrip("/"))
    if "_" in module_id:
        parts = module_id.split("_", 1)
        prefixes.append(f"{parts[0]}/{parts[1]}/")

    def _line_matches(line: str) -> bool:
        # Match ## or ### headers that contain a matching path
        stripped = line.lstrip("#").strip()
        return any(stripped.startswith(p) or stripped.startswith(p.rstrip("/")) for p in prefixes)

    lines = structure_text.splitlines()
    result: list[str] = []
    collecting = False

    for line in lines:
        if line.startswith("## ") or line.startswith("### "):
            if _line_matches(line):
                collecting = True
                result.append(line)
                continue
            elif collecting and line.startswith("## "):
                # New top-level section that doesn't match → stop
                if not _line_matches(line):
                    collecting = False
                    continue
        if collecting:
            result.append(line)

    return "\n".join(result[:80])  # Cap at 80 lines per module


def _list_module_files(mod_path: Path) -> str:
    """List source files in a module directory for evidence.

    Args:
        mod_path: Absolute path to the module directory.

    Returns:
        Newline-separated list of relative file paths, or empty string.
    """
    if not mod_path.is_dir():
        return ""
    files: list[str] = []
    try:
        for f in sorted(mod_path.rglob("*")):
            if (
                f.is_file()
                and f.suffix.lower() in SOURCE_CODE_EXTS
                and "__pycache__" not in str(f)
            ):
                files.append(f"- {f.relative_to(mod_path)}")
    except OSError:
        pass
    return "\n".join(files[:50])


def _build_fallback_registry(workspace: Path) -> str:
    """Build a basic module registry without LLM, from structure.md.

    Used when the LLM call fails. Extracts file listings per module
    and uses them as rough descriptions.

    Args:
        workspace: Project root directory.

    Returns:
        Markdown content for a fallback registry, or empty string.
    """
    from repobrain_engine.hub.scanner import (
        detect_modules,
        list_root_module_files,
        resolve_module_path,
    )

    rb_dir = knowledge_root(workspace)
    modules = detect_modules(workspace)
    if not modules:
        return ""

    structure_file = rb_dir / "structure.md"
    structure = ""
    if structure_file.is_file():
        try:
            structure = structure_file.read_text(encoding="utf-8")
        except OSError:
            pass

    lines: list[str] = ["# Module Registry\n"]
    modules_dir = rb_dir / "modules"
    for mod in modules:
        module_path = resolve_module_path(workspace, mod)
        rel_dir = ""
        if mod != WORKSPACE_ROOT_MODULE_ID:
            rel_dir = str(module_path.relative_to(workspace)) + "/"

        # Source 1: module knowledge doc — extract heading keywords
        tags: list[str] = []
        mod_doc = modules_dir / f"{mod}.md"
        if mod_doc.is_file():
            try:
                doc_text = mod_doc.read_text(encoding="utf-8")[:1500]
                for line in doc_text.splitlines():
                    line_s = line.strip()
                    # Extract ## and ### headings as tags
                    if line_s.startswith("## ") or line_s.startswith("### "):
                        heading = line_s.lstrip("#").strip().lower()
                        # Skip generic headings
                        if heading not in (
                            "overview", "summary", "key files", "main files",
                            "architecture", "design patterns", "file locations",
                            "key dependencies", "dependencies",
                        ):
                            tags.append(heading)
            except OSError:
                pass

        # Source 2: structure.md — extract key filenames
        if not tags:
            section = _extract_module_section(structure, mod, rel_dir) if structure else ""
            for line in section.splitlines():
                line_s = line.strip()
                if line_s.startswith("### "):
                    fname = line_s[4:].strip().rsplit("/", 1)[-1]
                    stem = fname.rsplit(".", 1)[0] if "." in fname else fname
                    if stem not in ("index", "__init__", "main", "test", "utils", "types"):
                        tags.append(stem)
        if not tags and mod == WORKSPACE_ROOT_MODULE_ID:
            for path in list_root_module_files(workspace):
                tags.extend(_tokenize_text(path.name.replace(".", " ")))

        # Deduplicate and limit to 8 tags
        seen: set[str] = set()
        unique_tags: list[str] = []
        for t in tags:
            if t not in seen:
                seen.add(t)
                unique_tags.append(t)
            if len(unique_tags) >= 8:
                break
        tag_str = ", ".join(unique_tags) if unique_tags else _module_display_name(mod)
        lines.append(f"- **{_module_display_name(mod)}**: {tag_str}")

    return "\n".join(lines)


def _build_fallback_conventions(report) -> str:
    """Build minimal conventions content when refresh runs in scan-only mode."""
    languages = ", ".join(report.languages.keys()) if getattr(report, "languages", None) else "unknown"
    frameworks = ", ".join(report.frameworks) if getattr(report, "frameworks", None) else "none"
    return (
        "# Project Conventions (Scan-Only)\n\n"
        "This file was generated in scan-only mode without LLM analysis.\n\n"
        f"- Languages: {languages}\n"
        f"- Frameworks: {frameworks}\n"
        f"- File count: {getattr(report, 'file_count', 0)}\n"
        f"- Scan elapsed: {getattr(report, 'scan_elapsed_seconds', 0.0):.2f}s\n"
        f"- Timed out: {getattr(report, 'timed_out', False)}\n"
        f"- Stop reason: {getattr(report, 'scan_stopped_reason', '') or 'completed'}\n"
    )
