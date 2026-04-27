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

from antigravity_engine.hub._constants import SOURCE_CODE_EXTS, WORKSPACE_ROOT_MODULE_ID
from antigravity_engine.hub.contracts import (
    EvidenceSpan,
    FailureRecord,
    GroupFactsDocument,
    KeyFileKnowledge,
    ModuleClaim,
    ModuleFactsDocument,
    ModuleKnowledgeDocument,
    ModuleRegistryEntry,
    PublicApiKnowledge,
    RefreshStatus,
    SourceReference,
)
from antigravity_engine.hub.host_llm import (
    HOST_LLM_UNAVAILABLE_MESSAGE,
    HostLlmRequest,
    HostLlmResponse,
    call_host_llm,
    has_host_llm_capability,
)

logger = logging.getLogger(__name__)

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
            max_retries = max(0, int(os.environ.get("AG_REFRESH_RETRY_COUNT", "3")))
        except (ValueError, TypeError):
            max_retries = 3
    if base_delay is None:
        try:
            base_delay = max(0.0, float(os.environ.get("AG_REFRESH_RETRY_DELAY", "1.0")))
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
    # asyncio.TimeoutError has an empty str() — check type first.
    if isinstance(exc, (TimeoutError, asyncio.TimeoutError)):
        return True
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



async def refresh_pipeline(workspace: Path, quick: bool = False, failed_only: bool = False) -> RefreshStatus:
    """Scan project and update .antigravity/conventions.md.

    Args:
        workspace: Project root directory.
        quick: If True, only scan files changed since last refresh.
        failed_only: If True, only re-run modules that failed or were
            partial in the previous refresh.

    Returns:
        Structured refresh status, including stage and module health.
    """
    from antigravity_engine.hub.scanner import (
        build_knowledge_graph,
        extract_structure,
        full_scan,
        quick_scan,
        render_knowledge_graph_markdown,
        render_knowledge_graph_mermaid,
    )
    refresh_scan_only = os.environ.get("AG_REFRESH_SCAN_ONLY", "0").strip() in {"1", "true", "yes"}
    host_llm_available = has_host_llm_capability()
    host_llm_reason: str | None = None
    if refresh_scan_only:
        host_llm_available = False
    elif not host_llm_available:
        host_llm_reason = HOST_LLM_UNAVAILABLE_MESSAGE
        print(
            (
                "[0/8] Host LLM capability is unavailable; generating "
                "deterministic artifacts and agent refresh plan."
            ),
            file=sys.stderr,
        )
    else:
        print("[0/8] Using host LLM capability for semantic refresh.", file=sys.stderr)

    ag_dir = workspace / ".antigravity"
    ag_dir.mkdir(parents=True, exist_ok=True)
    sha_file = ag_dir / ".last_refresh_sha"
    refresh_status = RefreshStatus(
        refresh_run_id=datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ"),
        overall_status="success",
        llm_provider="host_agent_capability" if host_llm_available else "",
    )

    scan_timeout = os.environ.get("AG_SCAN_TIMEOUT_SECONDS", "(default)")
    scan_max_files = os.environ.get("AG_SCAN_MAX_FILES", "(default)")
    scan_sample_files = os.environ.get("AG_SCAN_SAMPLE_FILES", "(default)")
    scan_verbose = os.environ.get("AG_SCAN_VERBOSE", "1")
    print(
        (
            "[1/3] Scan config: "
            f"timeout={scan_timeout}, "
            f"max_files={scan_max_files}, "
            f"sample_files={scan_sample_files}, "
            f"verbose={scan_verbose}, "
            f"quick={quick}"
        ),
        file=sys.stderr,
    )

    print("[1/3] Scanning project...", file=sys.stderr)

    if quick and sha_file.exists():
        since_sha = sha_file.read_text(encoding="utf-8").strip()
        report = quick_scan(workspace, since_sha)
    else:
        report = full_scan(workspace)

    print("[1/3] Scan stage finished; preparing scan report...", file=sys.stderr)

    scan_report_path = ag_dir / "scan_report.json"
    scan_payload = _build_scan_payload(report)
    print("[1/3] Scan payload built; writing scan_report.json...", file=sys.stderr)
    scan_report_path.write_text(
        json.dumps(scan_payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    refresh_status.stages["scan"] = "success"

    print(
        (
            "[1/3] Scan summary: "
            f"files={report.file_count}, "
            f"walked={getattr(report, 'walked_file_count', 0)}, "
            f"elapsed={getattr(report, 'scan_elapsed_seconds', 0.0):.2f}s, "
            f"timed_out={getattr(report, 'timed_out', False)}, "
            f"reason={getattr(report, 'scan_stopped_reason', '') or 'completed'}"
        ),
        file=sys.stderr,
    )
    samples = getattr(report, "scanned_file_samples", [])
    if samples:
        print("[1/3] Retrieved file samples:", file=sys.stderr)
        for rel in samples[:20]:
            print(f"  - {rel}", file=sys.stderr)
    print(f"[1/3] Scan report: {scan_report_path}", file=sys.stderr)

    conventions_content = ""

    if host_llm_available:
        print("[2/3] Asking host LLM for project conventions...", file=sys.stderr)
        try:
            conventions_content = await _generate_conventions_with_host_llm(workspace, report)
            refresh_status.stages["conventions"] = "success"
        except Exception as exc:
            exc_msg = str(exc) or type(exc).__name__
            print(f"  ⚠ Host LLM conventions analysis failed: {exc_msg}", file=sys.stderr)
            conventions_content = _build_unavailable_conventions(report, exc_msg)
            _mark_stage_failure(
                refresh_status,
                stage="conventions",
                reason=exc_msg,
                partial=False,
            )
    else:
        if refresh_scan_only:
            print("[2/3] Scan-only mode enabled; skipping LLM analysis.", file=sys.stderr)
            refresh_status.stages["conventions"] = "skipped"
        else:
            print("[2/3] Host LLM unavailable; writing scan-only conventions stub.", file=sys.stderr)
            _mark_stage_failure(
                refresh_status,
                stage="conventions",
                reason=host_llm_reason or HOST_LLM_UNAVAILABLE_MESSAGE,
                partial=False,
            )
        conventions_content = _build_fallback_conventions(report) if refresh_scan_only else _build_unavailable_conventions(
            report,
            host_llm_reason or HOST_LLM_UNAVAILABLE_MESSAGE,
        )

    print("[3/8] Writing conventions.md...", file=sys.stderr)

    (ag_dir / "conventions.md").write_text(conventions_content, encoding="utf-8")

    # In quick mode the ScanReport only contains changed files, so
    # rebuilding structure / knowledge-graph / non-code indexes from it
    # would overwrite the full artifacts with near-empty content.
    # Skip these stages and keep the previous full-refresh output.
    if not quick:
        print("[4/8] Generating structure.md...", file=sys.stderr)
        structure_content = extract_structure(workspace)
        (ag_dir / "structure.md").write_text(structure_content, encoding="utf-8")
        refresh_status.stages["structure"] = "success"

        print("[5/8] Building knowledge graph artifacts...", file=sys.stderr)
        graph = build_knowledge_graph(workspace, report)
        (ag_dir / "knowledge_graph.json").write_text(
            json.dumps(graph, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        _export_normalized_graph_store(ag_dir, graph)
        (ag_dir / "knowledge_graph.md").write_text(
            render_knowledge_graph_markdown(graph),
            encoding="utf-8",
        )
        (ag_dir / "knowledge_graph.mmd").write_text(
            render_knowledge_graph_mermaid(graph),
            encoding="utf-8",
        )
        refresh_status.stages["knowledge_graph"] = "success"

        print("[6/8] Writing document/data/media indexes...", file=sys.stderr)
        doc_index, data_overview, media_manifest = _build_non_code_indexes(report)
        (ag_dir / "document_index.md").write_text(doc_index, encoding="utf-8")
        (ag_dir / "data_overview.md").write_text(data_overview, encoding="utf-8")
        (ag_dir / "media_manifest.md").write_text(media_manifest, encoding="utf-8")
        refresh_status.stages["indexes"] = "success"
    else:
        print("[4-6/8] Quick mode: keeping existing structure/graph/index artifacts.", file=sys.stderr)
        refresh_status.stages["structure"] = "skipped"
        refresh_status.stages["knowledge_graph"] = "skipped"
        refresh_status.stages["indexes"] = "skipped"

    modules_filter: list[str] | None = None
    if failed_only:
        status_path = ag_dir / "status.json"
        if status_path.is_file():
            try:
                prev_status_raw = json.loads(status_path.read_text(encoding="utf-8"))
                prev_modules = prev_status_raw.get("modules", {})
                modules_filter = [
                    mod for mod, state in prev_modules.items()
                    if state in ("failed", "partial")
                ]
                if modules_filter:
                    print(
                        f"[7/8] Failed-only mode: re-running {len(modules_filter)} "
                        f"failed/partial modules...",
                        file=sys.stderr,
                    )
                else:
                    print(
                        "[7/8] Failed-only mode: no failed/partial modules found. "
                        "Skipping module agents.",
                        file=sys.stderr,
                    )
            except Exception as exc:
                print(
                    f"  ⚠ Failed to load previous status: {exc}. "
                    "Running all modules.",
                    file=sys.stderr,
                )
        else:
            print(
                "[7/8] Failed-only mode: no previous status found. "
                "Running all modules.",
                file=sys.stderr,
            )

    if host_llm_available:
        from antigravity_engine.hub.scanner import detect_modules

        if modules_filter is not None and not modules_filter:
            print("[7/8] No failed/partial modules to re-run. Skipping module knowledge.", file=sys.stderr)
            refresh_status.stages["module_docs"] = "skipped"
        else:
            print("[7/8] Building module knowledge through host LLM capability...", file=sys.stderr)
            expected_modules = detect_modules(workspace)
            if modules_filter is not None:
                expected_modules = [m for m in expected_modules if m in modules_filter]
            await _generate_module_docs_with_host_llm(
                workspace=workspace,
                expected_modules=expected_modules,
                status=refresh_status,
            )
            refresh_status.stages["module_docs"] = _aggregate_states(
                list(refresh_status.modules.values()),
                skipped_state="skipped",
            )
        refresh_status.stages["git_insights"] = "skipped"
    else:
        if refresh_scan_only:
            print("[7/8] Scan-only mode: module agents skipped.", file=sys.stderr)
            refresh_status.stages["module_docs"] = "skipped"
            refresh_status.stages["git_insights"] = "skipped"
        else:
            print("[7/8] Host LLM unavailable: module knowledge cannot be built.", file=sys.stderr)
            from antigravity_engine.hub.scanner import detect_modules

            (ag_dir / "agents").mkdir(parents=True, exist_ok=True)
            modules = detect_modules(workspace)
            if modules:
                for module_name in modules:
                    _mark_module_failure(
                        refresh_status,
                        module=module_name,
                        group_name=None,
                        reason=host_llm_reason or HOST_LLM_UNAVAILABLE_MESSAGE,
                        state="failed",
                    )
                refresh_status.stages["module_docs"] = "failed"
            else:
                refresh_status.stages["module_docs"] = "skipped"
            _mark_stage_failure(
                refresh_status,
                stage="git_insights",
                reason=host_llm_reason or HOST_LLM_UNAVAILABLE_MESSAGE,
                partial=False,
            )

    # -- Step 8: Generate map.md via Map Agent --
    if host_llm_available:
        print("[8/8] Rendering map.md from validated host LLM module knowledge...", file=sys.stderr)
        try:
            module_docs = _load_host_module_knowledge(workspace)
            map_content = _render_map_from_module_knowledge(module_docs)
            map_issues = _validate_map_content(map_content, [doc.module for doc in module_docs])
            if map_issues:
                raise ValueError("; ".join(map_issues))
            (ag_dir / "map.md").write_text(map_content, encoding="utf-8")
            print("  ✓ map.md generated", file=sys.stderr)
            refresh_status.stages["module_registry"] = "success"

            registry_entries = _build_module_registry_entries_from_knowledge(
                module_docs,
                refresh_status,
            )
            (ag_dir / "module_registry.json").write_text(
                json.dumps([entry.model_dump(mode="json") for entry in registry_entries], ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            (ag_dir / "module_registry.md").write_text(
                _render_module_registry_markdown(registry_entries),
                encoding="utf-8",
            )
        except Exception as exc:
            print(f"  ⚠ Map rendering failed: {exc}", file=sys.stderr)
            _mark_stage_failure(
                refresh_status,
                stage="module_registry",
                reason=str(exc),
                partial=False,
            )
    else:
        if refresh_scan_only:
            print("[8/8] Scan-only mode: map generation skipped.", file=sys.stderr)
            refresh_status.stages["module_registry"] = "skipped"
        else:
            print("[8/8] Host LLM unavailable: writing incomplete map stub.", file=sys.stderr)
            fallback_map = _build_unavailable_map_md(workspace)
            (ag_dir / "map.md").write_text(fallback_map, encoding="utf-8")
            try:
                registry_entries = _build_module_registry_entries(workspace, refresh_status)
                (ag_dir / "module_registry.json").write_text(
                    json.dumps([entry.model_dump(mode="json") for entry in registry_entries], ensure_ascii=False, indent=2),
                    encoding="utf-8",
                )
                (ag_dir / "module_registry.md").write_text(
                    _render_module_registry_markdown(registry_entries),
                    encoding="utf-8",
                )
            except Exception:
                pass
            _mark_stage_failure(
                refresh_status,
                stage="module_registry",
                reason=host_llm_reason or HOST_LLM_UNAVAILABLE_MESSAGE,
                partial=False,
            )

    # -- Step 9: GitNexus code graph indexing (optional) --
    _run_gitnexus_analyze(workspace, refresh_status)

    current_sha = _get_head_sha(workspace)
    if current_sha:
        sha_file.write_text(current_sha, encoding="utf-8")

    # GitNexus is optional — exclude it from overall status calculation
    non_optional_stages = {
        k: v for k, v in refresh_status.stages.items() if k != "gitnexus"
    }
    refresh_status.overall_status = _aggregate_states(
        list(non_optional_stages.values()) + list(refresh_status.modules.values()),
        skipped_state="success",
    )
    refresh_status.knowledge_status = _aggregate_states(
        [
            refresh_status.stages.get("conventions", "skipped"),
            refresh_status.stages.get("module_docs", "skipped"),
            refresh_status.stages.get("module_registry", "skipped"),
        ],
        skipped_state="success",
    )
    refresh_status.failed_modules = sorted(
        module for module, state in refresh_status.modules.items() if state in {"failed", "partial"}
    )
    validation_status = _write_knowledge_validation(ag_dir, workspace, refresh_status)
    refresh_status.validation_status = validation_status
    if validation_status == "failed" and refresh_status.overall_status == "success":
        refresh_status.overall_status = "failed"
    _write_agent_refresh_plan(
        ag_dir=ag_dir,
        workspace=workspace,
        status=refresh_status,
        reason=host_llm_reason,
        report=report,
    )
    _remove_stale_host_delegation(ag_dir)
    _write_refresh_status(ag_dir, refresh_status)

    _print_artifact_status(
        ag_dir / "conventions.md",
        refresh_status.stages.get("conventions", "success"),
    )
    _print_artifact_status(
        ag_dir / "structure.md",
        refresh_status.stages.get("structure", "success"),
    )
    _print_artifact_status(
        ag_dir / "knowledge_graph.json",
        refresh_status.stages.get("knowledge_graph", "success"),
    )
    _print_artifact_status(
        ag_dir / "knowledge_graph.md",
        refresh_status.stages.get("knowledge_graph", "success"),
    )
    _print_artifact_status(
        ag_dir / "knowledge_graph.mmd",
        refresh_status.stages.get("knowledge_graph", "success"),
    )
    _print_artifact_status(
        ag_dir / "document_index.md",
        refresh_status.stages.get("indexes", "success"),
    )
    _print_artifact_status(
        ag_dir / "data_overview.md",
        refresh_status.stages.get("indexes", "success"),
    )
    _print_artifact_status(
        ag_dir / "media_manifest.md",
        refresh_status.stages.get("indexes", "success"),
    )
    _print_artifact_status(
        ag_dir / "module_registry.json",
        refresh_status.stages.get("module_registry", "success"),
    )
    _print_artifact_status(
        ag_dir / "module_registry.md",
        refresh_status.stages.get("module_registry", "success"),
    )
    agents_out_dir = ag_dir / "agents"
    if agents_out_dir.exists():
        agent_md_count = len(list(agents_out_dir.glob("*.md")))
        agent_dir_count = len([d for d in agents_out_dir.iterdir() if d.is_dir()])
        status_label = "Preserved" if refresh_status.stages.get("module_docs") == "skipped" else "Updated"
        print(f"{status_label} {agents_out_dir} ({agent_md_count} agent docs, {agent_dir_count} multi-group modules)")
    modules_dir = ag_dir / "modules"
    if modules_dir.exists():
        mod_count = len(list(modules_dir.glob("*.md")))
        facts_count = len(list(modules_dir.glob("*.facts.json")))
        if refresh_status.stages.get("module_registry") == "skipped":
            print(f"Preserved {modules_dir} ({mod_count} module docs, {facts_count} facts files)")
        else:
            print(f"Updated {modules_dir} ({mod_count} module docs, {facts_count} facts files)")
    print(
        f"Refresh status: {refresh_status.overall_status} "
        f"(exit code {refresh_status.exit_code})",
    )
    return refresh_status


async def prepare_refresh_project(
    workspace: Path,
    quick: bool = False,
    failed_only: bool = False,
) -> dict[str, object]:
    """Prepare a main-agent refresh task bundle without requiring local LLM keys."""
    status = await refresh_pipeline(workspace, quick=quick, failed_only=failed_only)
    plan_path = workspace / ".antigravity" / "agent_refresh_plan.json"
    if not plan_path.is_file():
        raise FileNotFoundError(f"refresh plan was not written: {plan_path}")
    payload = json.loads(plan_path.read_text(encoding="utf-8"))
    _refresh_plan_task_status(workspace, payload)
    payload["prepare_status"] = status.model_dump(mode="json")
    return payload


def submit_refresh_result(
    workspace: Path,
    task_id: str,
    result: dict[str, object] | str,
) -> dict[str, object]:
    """Store and validate one host/main-agent refresh task result."""
    plan = _load_agent_refresh_plan(workspace)
    task = _find_plan_task(plan, task_id)
    task_type = str(task.get("task", ""))
    plan_id = _plan_id(plan)
    response = HostLlmResponse(content=result) if isinstance(result, str) else HostLlmResponse.model_validate(result)

    stored: dict[str, object] = {
        "plan_id": plan_id,
        "task_id": task_id,
        "task": task_type,
        "module": task.get("module"),
        "group": task.get("group"),
        "status": "success",
        "result": response.model_dump(mode="json"),
    }
    if task_type == "conventions":
        content = str(response.data.get("markdown") or response.data.get("content") or response.content).strip()
        if not content:
            raise ValueError("conventions result is empty")
        stored["content"] = content
    elif task_type == "module_knowledge":
        document = _parse_module_knowledge_response(response.data, response.content)
        expected_module = str(task.get("module") or "")
        if document.module != expected_module:
            raise ValueError(f"host result module {document.module!r}, expected {expected_module!r}")
        if not document.path:
            document.path = str(task.get("context", {}).get("module_path") or task.get("module") or "")
        issues = _validate_module_knowledge(workspace, document)
        if issues:
            raise ValueError("; ".join(issues))
        stored["document"] = document.model_dump(mode="json")
    else:
        raise ValueError(f"unsupported refresh task: {task_type!r}")

    result_path = _host_task_result_path(workspace, task_id, plan_id=plan_id)
    result_path.parent.mkdir(parents=True, exist_ok=True)
    result_path.write_text(json.dumps(stored, ensure_ascii=False, indent=2), encoding="utf-8")
    _refresh_plan_task_status(workspace, plan)
    (workspace / ".antigravity" / "agent_refresh_plan.json").write_text(
        json.dumps(plan, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return {
        "status": "accepted",
        "plan_id": plan_id,
        "task_id": task_id,
        "path": str(result_path),
        "pending_tasks": plan.get("pending_tasks", []),
        "next_action": plan.get("next_action", "finalize_refresh_project"),
    }


def finalize_refresh_project(workspace: Path) -> RefreshStatus:
    """Merge submitted host task results into validated knowledge artifacts."""
    plan = _load_agent_refresh_plan(workspace)
    plan_id = _plan_id(plan)
    ag_dir = workspace / ".antigravity"
    agents_dir = ag_dir / "agents"
    knowledge_dir = ag_dir / "knowledge"
    agents_dir.mkdir(parents=True, exist_ok=True)
    knowledge_dir.mkdir(parents=True, exist_ok=True)

    status_payload = plan.get("status", {})
    refresh_status = (
        RefreshStatus.model_validate(status_payload)
        if isinstance(status_payload, dict) and status_payload.get("refresh_run_id")
        else RefreshStatus(refresh_run_id=datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ"), overall_status="success")
    )
    refresh_status.llm_provider = "host_agent_capability"
    refresh_status.failures = []
    refresh_status.modules = {}
    refresh_status.stages["git_insights"] = "skipped"

    expected_modules = sorted(
        {
            str(task.get("module") or "")
            for task in plan.get("tasks", [])
            if isinstance(task, dict) and task.get("task") == "module_knowledge" and task.get("module")
        }
    )
    for module in expected_modules:
        for path in (agents_dir / f"{module}.md", knowledge_dir / f"{module}.json"):
            _remove_or_tombstone_generated_artifact(path, module)

    conventions_result = _load_submitted_task(workspace, "conventions", plan_id=plan_id)
    if conventions_result and conventions_result.get("content"):
        (ag_dir / "conventions.md").write_text(str(conventions_result["content"]), encoding="utf-8")
        refresh_status.stages["conventions"] = "success"
    else:
        _mark_stage_failure(refresh_status, "conventions", "missing submitted conventions result", partial=False)

    docs_by_module: dict[str, list[ModuleKnowledgeDocument]] = {}
    for task in plan.get("tasks", []):
        if not isinstance(task, dict) or task.get("task") != "module_knowledge":
            continue
        task_id = str(task.get("task_id", ""))
        module = str(task.get("module", ""))
        submitted = _load_submitted_task(workspace, task_id, plan_id=plan_id)
        if not submitted:
            _mark_module_failure(refresh_status, module, str(task.get("group") or ""), "missing submitted result", state="failed")
            continue
        raw_doc = submitted.get("document")
        if not isinstance(raw_doc, dict):
            _mark_module_failure(refresh_status, module, str(task.get("group") or ""), "submitted result has no parsed document", state="failed")
            continue
        try:
            docs_by_module.setdefault(module, []).append(ModuleKnowledgeDocument.model_validate(raw_doc))
        except Exception as exc:  # noqa: BLE001
            _mark_module_failure(refresh_status, module, str(task.get("group") or ""), str(exc), state="failed")

    merged_docs: list[ModuleKnowledgeDocument] = []
    for module, docs in sorted(docs_by_module.items()):
        document = _merge_module_knowledge_documents(
            module=module,
            module_path=docs[0].path if docs else module,
            documents=docs,
        )
        issues = _validate_module_knowledge(workspace, document)
        if issues:
            for issue in issues:
                _mark_module_failure(refresh_status, module, None, issue, state="failed")
            continue
        (agents_dir / f"{module}.md").write_text(_render_agent_md_from_knowledge(document), encoding="utf-8")
        (knowledge_dir / f"{module}.json").write_text(
            json.dumps(document.model_dump(mode="json"), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        refresh_status.modules[module] = "success"
        merged_docs.append(document)

    refresh_status.stages["module_docs"] = _aggregate_states(list(refresh_status.modules.values()), skipped_state="skipped")
    if merged_docs:
        map_content = _render_map_from_module_knowledge(merged_docs)
        (ag_dir / "map.md").write_text(map_content, encoding="utf-8")
        registry_entries = _build_module_registry_entries_from_knowledge(merged_docs, refresh_status)
        (ag_dir / "module_registry.json").write_text(
            json.dumps([entry.model_dump(mode="json") for entry in registry_entries], ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        (ag_dir / "module_registry.md").write_text(_render_module_registry_markdown(registry_entries), encoding="utf-8")
        refresh_status.stages["module_registry"] = "success"
    else:
        _mark_stage_failure(refresh_status, "module_registry", "no submitted module knowledge", partial=False)

    refresh_status.knowledge_status = _aggregate_states(
        [
            refresh_status.stages.get("conventions", "skipped"),
            refresh_status.stages.get("module_docs", "skipped"),
            refresh_status.stages.get("module_registry", "skipped"),
        ],
        skipped_state="success",
    )
    refresh_status.failed_modules = sorted(
        module for module, state in refresh_status.modules.items() if state in {"failed", "partial"}
    )
    refresh_status.validation_status = _write_knowledge_validation(ag_dir, workspace, refresh_status)
    refresh_status.overall_status = _aggregate_states(
        [state for key, state in refresh_status.stages.items() if key != "gitnexus"] + list(refresh_status.modules.values()),
        skipped_state="success",
    )
    if refresh_status.validation_status == "failed" and refresh_status.overall_status == "success":
        refresh_status.overall_status = "failed"
    _write_refresh_status(ag_dir, refresh_status)
    return refresh_status


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _is_no_llm_config_error(exc: Exception) -> bool:
    """Return True when model resolution failed because no backend is configured."""
    return "no llm configured" in str(exc).lower()


def _host_task_id(task: str, module: str | None = None, group: str | None = None) -> str:
    """Return a stable task id safe for JSON filenames and MCP callers."""
    parts = [task]
    if module:
        parts.append(module)
    if group:
        parts.append(group)
    raw = "::".join(parts)
    return re.sub(r"[^A-Za-z0-9_.:-]+", "_", raw)


def _safe_host_filename(value: str) -> str:
    """Return a value safe for host result file or directory names."""
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", value)


def _plan_id(plan: dict[str, object]) -> str:
    """Return the active host-agent plan id."""
    value = str(plan.get("plan_id") or plan.get("refresh_run_id") or "").strip()
    if value:
        return value
    status = plan.get("status", {})
    if isinstance(status, dict):
        value = str(status.get("refresh_run_id") or "").strip()
        if value:
            return value
    return "legacy"


def _host_task_result_path(workspace: Path, task_id: str, plan_id: str | None = None) -> Path:
    """Return where a submitted host task result is stored."""
    safe_id = _safe_host_filename(task_id)
    if plan_id:
        return workspace / ".antigravity" / "host_results" / _safe_host_filename(plan_id) / f"{safe_id}.json"
    return workspace / ".antigravity" / "host_results" / f"{safe_id}.json"


def _load_agent_refresh_plan(workspace: Path) -> dict[str, object]:
    """Load the generated main-agent refresh plan."""
    path = workspace / ".antigravity" / "agent_refresh_plan.json"
    if not path.is_file():
        raise FileNotFoundError(f"agent refresh plan not found: {path}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("agent refresh plan must be a JSON object")
    return payload


def _find_plan_task(plan: dict[str, object], task_id: str) -> dict[str, object]:
    """Find a task in an agent refresh plan by id."""
    for task in plan.get("tasks", []):
        if isinstance(task, dict) and task.get("task_id") == task_id:
            return task
    raise KeyError(f"refresh task not found in plan: {task_id}")


def _load_submitted_task(workspace: Path, task_id: str, plan_id: str | None = None) -> dict[str, object] | None:
    """Load one submitted host result if present."""
    path = _host_task_result_path(workspace, task_id, plan_id=plan_id)
    if not path.is_file():
        return None
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        return None
    if plan_id and str(payload.get("plan_id") or "") != plan_id:
        return None
    return payload


def _refresh_plan_task_status(workspace: Path, plan: dict[str, object]) -> None:
    """Annotate a refresh plan with accepted and pending task ids."""
    plan_id = _plan_id(plan)
    accepted: list[str] = []
    pending: list[str] = []
    for task in plan.get("tasks", []):
        if not isinstance(task, dict):
            continue
        task_id = str(task.get("task_id") or "")
        if not task_id:
            continue
        if _load_submitted_task(workspace, task_id, plan_id=plan_id):
            accepted.append(task_id)
            task["submission_status"] = "accepted"
        else:
            pending.append(task_id)
            task["submission_status"] = "pending"
    plan["accepted_tasks"] = accepted
    plan["pending_tasks"] = pending
    plan["next_action"] = (
        "run_pending_tasks_and_submit_results"
        if pending
        else "finalize_refresh_project"
    )


def _remove_or_tombstone_generated_artifact(path: Path, module: str) -> None:
    """Remove a generated module artifact, or overwrite it when deletion is blocked."""
    if not path.is_file():
        return
    try:
        path.unlink()
        return
    except OSError:
        pass
    try:
        if path.suffix == ".json":
            path.write_text(
                json.dumps(
                    {
                        "status": "stale_removed",
                        "module": module,
                        "reason": "current refresh plan has no accepted result for this artifact",
                    },
                    ensure_ascii=False,
                    indent=2,
                ),
                encoding="utf-8",
            )
        else:
            path.write_text(
                (
                    "# Stale Knowledge Removed\n\n"
                    "The current refresh plan has no accepted result for this module artifact.\n"
                ),
                encoding="utf-8",
            )
    except OSError:
        pass


def _conventions_result_contract() -> dict[str, object]:
    """Return the host response contract for conventions tasks."""
    return {
        "type": "HostLlmResponse",
        "submit_shape": {
            "content": "",
            "data": {"markdown": "# Project Conventions\n\n..."},
            "metadata": {"execution_mode": "subagent|main_agent_llm"},
        },
        "required_result": "Markdown in data.markdown or content",
    }


def _module_result_contract() -> dict[str, object]:
    """Return the host response contract for module knowledge tasks."""
    return {
        "type": "HostLlmResponse",
        "submit_shape": {
            "content": "",
            "data": {
                "module": "<exact module id>",
                "path": "<module path>",
                "summary": "<concrete summary>",
                "responsibilities": ["<responsibility>"],
                "key_files": [
                    {
                        "path": "<workspace-relative file>",
                        "purpose": "<purpose>",
                        "references": [
                            {"file": "<workspace-relative file>", "start_line": 1, "end_line": 1}
                        ],
                    }
                ],
                "public_apis": [
                    {
                        "name": "<api>",
                        "kind": "<kind>",
                        "purpose": "<purpose>",
                        "signature": "<signature>",
                        "references": [
                            {"file": "<workspace-relative file>", "start_line": 1, "end_line": 1}
                        ],
                    }
                ],
                "data_flow": ["<observation>"],
                "dependencies": ["<dependency>"],
                "configuration": ["<configuration or none observed>"],
                "risks": ["<risk>"],
                "source_references": [
                    {"file": "<workspace-relative file>", "start_line": 1, "end_line": 1}
                ],
            },
            "metadata": {"execution_mode": "subagent|main_agent_llm"},
        },
        "source_reference_rule": (
            "Every SourceReference object must use keys file, start_line, end_line. "
            "Do not use path for source references; path is only for key_files[].path."
        ),
    }


def _build_conventions_task(workspace: Path, report) -> dict[str, object]:
    """Build the host-agent task package for project conventions."""
    prompt = (
        "Analyze this project scan and write a concise Markdown conventions "
        "document. Cover languages, frameworks, structure, tests, packaging, "
        "runtime configuration, and practical developer guidance. Output only "
        "Markdown.\n\n"
        f"{_format_scan_report(report)}"
    )
    return {
        "task_id": "conventions",
        "task": "conventions",
        "workspace": str(workspace.resolve()),
        "execution_mode_preference": "subagent_first",
        "agent_instructions": (
            "Use a sub-agent for this refresh task when available. If the host "
            "does not support sub-agents, use the main agent LLM on the supplied "
            "prompt. Do not ask the main agent to inspect files beyond the "
            "provided scan context."
        ),
        "prompt": prompt,
        "schema": {"type": "markdown", "required_heading": "#"},
        "result_contract": _conventions_result_contract(),
        "context": {"scan_report": _build_scan_payload(report)},
        "acceptance_criteria": [
            "output is Markdown only",
            "output starts with a heading",
            "content is based only on the provided scan report",
        ],
        "source_files": [],
        "required_outputs": [".antigravity/conventions.md"],
    }


def _build_module_knowledge_task(
    workspace: Path,
    module: str,
    module_path: str,
    group,
) -> dict[str, object]:
    """Build the host-agent task package for one module source group."""
    from antigravity_engine.hub.module_grouping import format_group_context

    source_files = [source_file.rel_path for source_file in group.files]
    task_id = _host_task_id("module_knowledge", module, str(group.name))
    prompt = f"""\
You are producing structured code-understanding for Antigravity refresh.

Execution requirement for the embedding main agent:
- Prefer launching a sub-agent to complete this task.
- If no sub-agent capability exists, use the main agent LLM directly on this exact prompt.
- Do not perform open-ended code exploration; analyze only the preloaded source below.
- Return one JSON object matching the requested schema. Do not return Markdown.

Analyze the preloaded source for module `{module}`, group `{group.name}`.
Every substantive claim must be grounded with source references using
workspace-relative file paths and 1-based line ranges.

Required JSON fields:
- module: string, exactly `{module}`
- path: string, module path `{module_path}`
- summary: concrete 1-2 sentence module/group summary
- responsibilities: list of concrete responsibilities
- key_files: list of objects: path, purpose, references
- public_apis: list of objects: name, kind, purpose, signature, references
- data_flow: list of concrete data/control-flow observations
- dependencies: list of internal/external dependencies and why they matter
- configuration: list of env vars, constants, config files, or "none observed"
- risks: list of limitations, legacy areas, mocks, or operational caveats
- source_references: list of important references for the overall summary

Source reference contract:
- key_files[].path names a file.
- Every reference object inside key_files[].references,
  public_apis[].references, and source_references must use exactly:
  {{"file": "relative/path.ext", "start_line": 1, "end_line": 2}}.
- Do not use "path" inside a source reference object.

Minimal JSON shape:
{{
  "module": "{module}",
  "path": "{module_path}",
  "summary": "...",
  "responsibilities": ["..."],
  "key_files": [
    {{
      "path": "{source_files[0] if source_files else module_path}",
      "purpose": "...",
      "references": [{{"file": "{source_files[0] if source_files else module_path}", "start_line": 1, "end_line": 1}}]
    }}
  ],
  "public_apis": [
    {{
      "name": "...",
      "kind": "...",
      "purpose": "...",
      "signature": "...",
      "references": [{{"file": "{source_files[0] if source_files else module_path}", "start_line": 1, "end_line": 1}}]
    }}
  ],
  "data_flow": ["..."],
  "dependencies": ["..."],
  "configuration": ["..."],
  "risks": ["..."],
  "source_references": [{{"file": "{source_files[0] if source_files else module_path}", "start_line": 1, "end_line": 1}}]
}}

Preloaded source:

{format_group_context(group)}
"""
    return {
        "task_id": task_id,
        "task": "module_knowledge",
        "workspace": str(workspace.resolve()),
        "module": module,
        "group": str(group.name),
        "execution_mode_preference": "subagent_first",
        "agent_instructions": (
            "The middleware has already selected and preloaded the source files. "
            "The host should delegate this package to a sub-agent when possible; "
            "otherwise the main agent LLM should complete the same package."
        ),
        "prompt": prompt,
        "schema": _module_knowledge_schema(),
        "result_contract": _module_result_contract(),
        "context": {
            "module": module,
            "module_path": module_path,
            "group": str(group.name),
            "source_files": source_files,
        },
        "acceptance_criteria": [
            "return one JSON object only",
            "module matches the requested module exactly",
            "all source references use provided workspace-relative paths",
            "source reference objects use file/start_line/end_line, not path",
            "line ranges are 1-based and within the referenced files",
            "no placeholder or template-like content",
        ],
        "source_files": source_files,
        "required_outputs": [
            f".antigravity/knowledge/{module}.json",
            f".antigravity/agents/{module}.md",
            ".antigravity/map.md",
            ".antigravity/knowledge_validation.json",
        ],
    }


async def _generate_conventions_with_host_llm(workspace: Path, report) -> str:
    """Generate project conventions through the host LLM capability."""
    task = _build_conventions_task(workspace, report)
    response = await call_host_llm(
        HostLlmRequest(
            task="conventions",
            workspace=str(workspace.resolve()),
            prompt=str(task["prompt"]),
            schema=task["schema"],
            context=task["context"],
            agent_instructions=str(task["agent_instructions"]),
            acceptance_criteria=list(task["acceptance_criteria"]),
            required_outputs=list(task["required_outputs"]),
        )
    )
    content = str(response.data.get("markdown") or response.data.get("content") or response.content).strip()
    if not content:
        raise ValueError("host LLM returned empty conventions")
    return content


async def _generate_module_docs_with_host_llm(
    workspace: Path,
    expected_modules: list[str],
    status: RefreshStatus,
) -> None:
    """Build module knowledge docs through the host LLM capability."""
    from antigravity_engine.hub.module_grouping import group_files, load_module_files
    from antigravity_engine.hub.scanner import resolve_module_path

    ag_dir = workspace / ".antigravity"
    agents_dir = ag_dir / "agents"
    knowledge_dir = ag_dir / "knowledge"
    agents_dir.mkdir(parents=True, exist_ok=True)
    knowledge_dir.mkdir(parents=True, exist_ok=True)

    concurrency = int(os.environ.get("AG_REFRESH_CONCURRENCY", "4"))
    sem = asyncio.Semaphore(max(1, concurrency))

    async def _run_module(module_name: str) -> None:
        async with sem:
            module_path = resolve_module_path(workspace, module_name)
            rel_path = _relative_path(workspace, module_path)
            files = load_module_files(module_path, workspace)
            if not files:
                _mark_module_failure(
                    status,
                    module=module_name,
                    group_name=None,
                    reason="module has no readable source files",
                    state="failed",
                )
                return

            groups = group_files(files, workspace)
            if not groups:
                _mark_module_failure(
                    status,
                    module=module_name,
                    group_name=None,
                    reason="module produced no source groups",
                    state="failed",
                )
                return

            print(f"  -> Host LLM module {module_name} ({len(groups)} groups)...", file=sys.stderr)
            group_docs: list[ModuleKnowledgeDocument] = []
            for group in groups:
                try:
                    group_docs.append(
                        await _request_module_knowledge(
                            workspace=workspace,
                            module=module_name,
                            module_path=rel_path,
                            group=group,
                        )
                    )
                except Exception as exc:
                    _mark_module_failure(
                        status,
                        module=module_name,
                        group_name=getattr(group, "name", None),
                        reason=str(exc) or type(exc).__name__,
                        state="failed",
                    )

            if not group_docs:
                status.modules[module_name] = "failed"
                return

            document = _merge_module_knowledge_documents(
                module=module_name,
                module_path=rel_path,
                documents=group_docs,
            )
            issues = _validate_module_knowledge(workspace, document)
            if issues:
                for issue in issues:
                    _mark_module_failure(
                        status,
                        module=module_name,
                        group_name=None,
                        reason=issue,
                        state="failed",
                    )
                return

            md_content = _render_agent_md_from_knowledge(document)
            (agents_dir / f"{module_name}.md").write_text(md_content, encoding="utf-8")
            (knowledge_dir / f"{module_name}.json").write_text(
                json.dumps(document.model_dump(mode="json"), ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            status.modules[module_name] = "success"
            print(f"  OK Host LLM module {module_name}", file=sys.stderr)

    await asyncio.gather(*[_run_module(module_name) for module_name in expected_modules])


async def _request_module_knowledge(
    workspace: Path,
    module: str,
    module_path: str,
    group,
) -> ModuleKnowledgeDocument:
    """Request structured module understanding for one file group."""
    task = _build_module_knowledge_task(workspace, module, module_path, group)
    response = await call_host_llm(
        HostLlmRequest(
            task="module_knowledge",
            workspace=str(workspace.resolve()),
            module=module,
            group=str(group.name),
            prompt=str(task["prompt"]),
            schema=task["schema"],
            context=task["context"],
            agent_instructions=str(task["agent_instructions"]),
            acceptance_criteria=list(task["acceptance_criteria"]),
            source_files=list(task["source_files"]),
            required_outputs=list(task["required_outputs"]),
        )
    )
    document = _parse_module_knowledge_response(response.data, response.content)
    if document.module != module:
        raise ValueError(f"host LLM returned module {document.module!r}, expected {module!r}")
    if not document.path:
        document.path = module_path
    return document


def _module_knowledge_schema() -> dict[str, object]:
    """Return the expected structured host LLM module-knowledge schema."""
    source_reference_schema: dict[str, object] = {
        "type": "object",
        "required": ["file", "start_line", "end_line"],
        "additionalProperties": False,
        "properties": {
            "file": {
                "type": "string",
                "description": "Workspace-relative source file path. Do not use key name 'path' here.",
            },
            "start_line": {"type": "integer", "minimum": 1},
            "end_line": {"type": "integer", "minimum": 1},
        },
    }
    return {
        "type": "object",
        "additionalProperties": False,
        "required": [
            "module",
            "summary",
            "responsibilities",
            "key_files",
            "public_apis",
            "data_flow",
            "dependencies",
            "configuration",
            "source_references",
        ],
        "properties": {
            "module": {"type": "string"},
            "path": {"type": "string"},
            "summary": {"type": "string"},
            "responsibilities": {"type": "array", "items": {"type": "string"}},
            "key_files": {
                "type": "array",
                "items": {
                    "type": "object",
                    "required": ["path", "purpose", "references"],
                    "additionalProperties": False,
                    "properties": {
                        "path": {"type": "string"},
                        "purpose": {"type": "string"},
                        "references": {"type": "array", "items": source_reference_schema},
                    },
                },
            },
            "public_apis": {
                "type": "array",
                "items": {
                    "type": "object",
                    "required": ["name", "kind", "purpose", "signature", "references"],
                    "additionalProperties": False,
                    "properties": {
                        "name": {"type": "string"},
                        "kind": {"type": "string"},
                        "purpose": {"type": "string"},
                        "signature": {"type": "string"},
                        "references": {"type": "array", "items": source_reference_schema},
                    },
                },
            },
            "data_flow": {"type": "array", "items": {"type": "string"}},
            "dependencies": {"type": "array", "items": {"type": "string"}},
            "configuration": {"type": "array", "items": {"type": "string"}},
            "risks": {"type": "array", "items": {"type": "string"}},
            "source_references": {"type": "array", "items": source_reference_schema},
        },
    }


def _parse_module_knowledge_response(
    data: dict[str, Any],
    content: str,
) -> ModuleKnowledgeDocument:
    """Parse host LLM output into a structured module document."""
    payload: object
    if data:
        payload = data.get("knowledge", data)
    else:
        payload = _extract_json_payload(content)
    return ModuleKnowledgeDocument.model_validate(payload)


def _merge_module_knowledge_documents(
    module: str,
    module_path: str,
    documents: list[ModuleKnowledgeDocument],
) -> ModuleKnowledgeDocument:
    """Merge group-level host LLM knowledge into one module document."""
    if len(documents) == 1:
        document = documents[0]
        document.module = module
        if not document.path:
            document.path = module_path
        return document

    summaries = _dedupe_strings([doc.summary for doc in documents])
    merged = ModuleKnowledgeDocument(
        module=module,
        path=module_path,
        summary=" ".join(summaries[:3]),
        responsibilities=_dedupe_strings(
            item for doc in documents for item in doc.responsibilities
        ),
        key_files=_dedupe_key_files(
            item for doc in documents for item in doc.key_files
        ),
        public_apis=_dedupe_public_apis(
            item for doc in documents for item in doc.public_apis
        ),
        data_flow=_dedupe_strings(item for doc in documents for item in doc.data_flow),
        dependencies=_dedupe_strings(item for doc in documents for item in doc.dependencies),
        configuration=_dedupe_strings(item for doc in documents for item in doc.configuration),
        risks=_dedupe_strings(item for doc in documents for item in doc.risks),
        source_references=_dedupe_source_references(
            item for doc in documents for item in doc.source_references
        ),
    )
    return merged


def _dedupe_key_files(items) -> list[KeyFileKnowledge]:
    """Deduplicate key-file records by path."""
    seen: set[str] = set()
    result: list[KeyFileKnowledge] = []
    for item in items:
        key = item.path
        if key in seen:
            continue
        seen.add(key)
        result.append(item)
    return result


def _dedupe_public_apis(items) -> list[PublicApiKnowledge]:
    """Deduplicate public API records by name and signature."""
    seen: set[tuple[str, str]] = set()
    result: list[PublicApiKnowledge] = []
    for item in items:
        key = (item.name, item.signature)
        if key in seen:
            continue
        seen.add(key)
        result.append(item)
    return result


def _dedupe_source_references(items) -> list[SourceReference]:
    """Deduplicate source references while preserving order."""
    seen: set[tuple[str, int, int]] = set()
    result: list[SourceReference] = []
    for item in items:
        key = (item.file, item.start_line, item.end_line)
        if key in seen:
            continue
        seen.add(key)
        result.append(item)
    return result


def _validate_module_knowledge(
    workspace: Path,
    document: ModuleKnowledgeDocument,
) -> list[str]:
    """Validate a host LLM module-knowledge document."""
    issues: list[str] = []
    required_lists = {
        "responsibilities": document.responsibilities,
        "key_files": document.key_files,
        "public_apis": document.public_apis,
        "data_flow": document.data_flow,
        "dependencies": document.dependencies,
        "configuration": document.configuration,
        "source_references": document.source_references,
    }
    if not document.summary.strip():
        issues.append("summary is empty")
    if _looks_like_placeholder(document.summary):
        issues.append("summary looks placeholder-like")
    for field_name, value in required_lists.items():
        if not value:
            issues.append(f"{field_name} is empty")

    references = _collect_module_references(document)
    if not references:
        issues.append("no source references found")
    for ref in references:
        issues.extend(_validate_source_reference(workspace, ref))

    return _dedupe_strings(issues)


def _collect_module_references(document: ModuleKnowledgeDocument) -> list[SourceReference]:
    """Collect every source reference embedded in a module document."""
    references: list[SourceReference] = list(document.source_references)
    for key_file in document.key_files:
        references.extend(key_file.references)
    for api in document.public_apis:
        references.extend(api.references)
    return _dedupe_source_references(references)


def _validate_source_reference(workspace: Path, ref: SourceReference) -> list[str]:
    """Validate one source reference against the workspace filesystem."""
    issues: list[str] = []
    if Path(ref.file).is_absolute():
        return [f"source reference must be relative: {ref.file}"]

    root = workspace.resolve()
    path = (root / ref.file).resolve()
    try:
        path.relative_to(root)
    except ValueError:
        return [f"source reference escapes workspace: {ref.file}"]

    if not path.is_file():
        return [f"source reference file does not exist: {ref.file}"]

    try:
        line_count = len(path.read_text(encoding="utf-8", errors="replace").splitlines())
    except OSError as exc:
        return [f"source reference file is unreadable: {ref.file}: {exc}"]
    line_count = max(1, line_count)
    if ref.start_line > line_count or ref.end_line > line_count:
        issues.append(
            f"source reference line range out of bounds: {ref.file}:{ref.start_line}-{ref.end_line}"
        )
    return issues


def _looks_like_placeholder(text: str) -> bool:
    """Return True if text looks like a template placeholder."""
    normalized = text.strip().lower()
    if not normalized:
        return True
    placeholders = ("todo", "tbd", "placeholder", "unknown", "lorem ipsum")
    return any(item in normalized for item in placeholders)


def _render_agent_md_from_knowledge(document: ModuleKnowledgeDocument) -> str:
    """Render a validated module-knowledge document to Markdown."""
    lines = [
        f"# Module Knowledge: {document.module}",
        "",
        "## Purpose and Responsibilities",
        document.summary.strip(),
        "",
    ]
    for item in document.responsibilities:
        lines.append(f"- {item}")
    lines.extend(["", "## Key Files", ""])
    for item in document.key_files:
        lines.append(f"- `{item.path}`: {item.purpose} {_format_refs(item.references)}".rstrip())
    lines.extend(["", "## Public APIs, Classes, and Functions", ""])
    for item in document.public_apis:
        label = item.name if not item.signature else f"{item.name} `{item.signature}`"
        kind = f" ({item.kind})" if item.kind else ""
        lines.append(f"- {label}{kind}: {item.purpose} {_format_refs(item.references)}".rstrip())
    lines.extend(["", "## Data and Control Flow", ""])
    lines.extend(f"- {item}" for item in document.data_flow)
    lines.extend(["", "## Dependencies", ""])
    lines.extend(f"- {item}" for item in document.dependencies)
    lines.extend(["", "## Configuration, Env Vars, and Constants", ""])
    lines.extend(f"- {item}" for item in document.configuration)
    lines.extend(["", "## Risks and Caveats", ""])
    if document.risks:
        lines.extend(f"- {item}" for item in document.risks)
    else:
        lines.append("- none observed")
    lines.extend(["", "## Source References", ""])
    for ref in document.source_references:
        lines.append(f"- `{ref.file}:{ref.start_line}-{ref.end_line}`")
    return "\n".join(lines).strip() + "\n"


def _format_refs(references: list[SourceReference]) -> str:
    """Format source references for inline Markdown."""
    if not references:
        return ""
    refs = ", ".join(
        f"`{ref.file}:{ref.start_line}-{ref.end_line}`"
        for ref in references[:3]
    )
    return f"({refs})"


def _load_host_module_knowledge(workspace: Path) -> list[ModuleKnowledgeDocument]:
    """Load structured module-knowledge JSON artifacts."""
    knowledge_dir = workspace / ".antigravity" / "knowledge"
    documents: list[ModuleKnowledgeDocument] = []
    if not knowledge_dir.is_dir():
        return documents
    for path in sorted(knowledge_dir.glob("*.json")):
        try:
            documents.append(
                ModuleKnowledgeDocument.model_validate_json(path.read_text(encoding="utf-8"))
            )
        except Exception:
            continue
    return documents


def _render_map_from_module_knowledge(documents: list[ModuleKnowledgeDocument]) -> str:
    """Render map.md from validated module knowledge."""
    if not documents:
        raise ValueError("no module knowledge documents available for map rendering")
    lines = ["# Module Map", ""]
    for document in sorted(documents, key=lambda item: item.module):
        topics = _map_topics_for_document(document)
        module_path = document.path.rstrip("/") + "/" if document.path else ""
        lines.extend(
            [
                f"## {document.module}",
                f"**Path:** `{module_path}`",
                f"**Description:** {document.summary.strip()}",
                f"**Key topics:** {', '.join(topics)}",
                "",
            ]
        )
    return "\n".join(lines).strip() + "\n"


def _map_topics_for_document(document: ModuleKnowledgeDocument) -> list[str]:
    """Extract concise routing topics from one module document."""
    tokens: list[str] = []
    tokens.extend(_tokenize_text(document.module.replace("_", " ")))
    tokens.extend(_tokenize_text(document.summary))
    for item in document.public_apis[:5]:
        tokens.extend(_tokenize_text(item.name.replace("_", " ")))
    for item in document.key_files[:5]:
        tokens.extend(_tokenize_text(Path(item.path).stem.replace("_", " ")))
    topics = _dedupe_strings(tokens)
    return topics[:10] or [_module_display_name(document.module)]


def _validate_map_content(map_content: str, modules: list[str]) -> list[str]:
    """Validate the generated module map."""
    issues: list[str] = []
    if not map_content.startswith("# Module Map"):
        issues.append("map.md must start with # Module Map")
    for module in modules:
        section_pattern = re.compile(
            rf"^##\s+{re.escape(module)}\s*$([\s\S]*?)(?=^##\s+|\Z)",
            flags=re.MULTILINE,
        )
        match = section_pattern.search(map_content)
        if not match:
            issues.append(f"map.md missing module section: {module}")
            continue
        body = match.group(1)
        if "**Path:**" not in body:
            issues.append(f"map.md missing Path for {module}")
        if "**Description:**" not in body:
            issues.append(f"map.md missing Description for {module}")
        if "**Key topics:**" not in body:
            issues.append(f"map.md missing Key topics for {module}")
    return issues


def _build_module_registry_entries_from_knowledge(
    documents: list[ModuleKnowledgeDocument],
    status: RefreshStatus,
) -> list[ModuleRegistryEntry]:
    """Build module registry entries from host LLM knowledge documents."""
    entries: list[ModuleRegistryEntry] = []
    for document in documents:
        keywords = _map_topics_for_document(document)
        top_paths = [item.path for item in document.key_files[:8]]
        entries.append(
            ModuleRegistryEntry(
                module=document.module,
                keywords=keywords,
                top_paths=top_paths,
                status=status.modules.get(document.module, "failed"),
                summary=document.summary,
            )
        )
    return sorted(entries, key=lambda entry: entry.module)


def _write_knowledge_validation(
    ag_dir: Path,
    workspace: Path,
    status: RefreshStatus,
) -> str:
    """Write validation results for host LLM generated knowledge artifacts."""
    semantic_states = [
        status.stages.get("conventions", "skipped"),
        status.stages.get("module_docs", "skipped"),
        status.stages.get("module_registry", "skipped"),
    ]
    if all(state == "skipped" for state in semantic_states):
        validation_payload = {
            "schema": "antigravity-knowledge-validation-v1",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "status": "skipped",
            "modules": {},
            "map": {"status": "skipped", "issues": []},
        }
        (ag_dir / "knowledge_validation.json").write_text(
            json.dumps(validation_payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        return "skipped"

    from antigravity_engine.hub.scanner import detect_modules

    modules = detect_modules(workspace)
    knowledge_dir = ag_dir / "knowledge"
    agents_dir = ag_dir / "agents"
    module_results: dict[str, dict[str, object]] = {}
    any_failed = False
    for module in modules:
        issues: list[str] = []
        json_path = knowledge_dir / f"{module}.json"
        md_path = agents_dir / f"{module}.md"
        if not json_path.is_file():
            issues.append(f"missing structured knowledge: {json_path.relative_to(ag_dir)}")
        if not md_path.is_file() or not md_path.read_text(encoding="utf-8", errors="replace").strip():
            issues.append(f"missing Markdown knowledge: {md_path.relative_to(ag_dir)}")
        if json_path.is_file():
            try:
                document = ModuleKnowledgeDocument.model_validate_json(
                    json_path.read_text(encoding="utf-8")
                )
                issues.extend(_validate_module_knowledge(workspace, document))
            except Exception as exc:
                issues.append(f"invalid structured knowledge: {exc}")
        module_status = "failed" if issues else "success"
        any_failed = any_failed or bool(issues)
        module_results[module] = {"status": module_status, "issues": _dedupe_strings(issues)}

    map_path = ag_dir / "map.md"
    if map_path.is_file():
        map_issues = _validate_map_content(map_path.read_text(encoding="utf-8"), modules)
    else:
        map_issues = ["missing map.md"]
    any_failed = any_failed or bool(map_issues)

    validation_status = "failed" if any_failed else "success"
    validation_payload = {
        "schema": "antigravity-knowledge-validation-v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "status": validation_status,
        "modules": module_results,
        "map": {
            "status": "failed" if map_issues else "success",
            "issues": map_issues,
        },
    }
    (ag_dir / "knowledge_validation.json").write_text(
        json.dumps(validation_payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return validation_status


def _write_agent_refresh_plan(
    ag_dir: Path,
    workspace: Path,
    status: RefreshStatus,
    reason: str | None,
    report,
) -> None:
    """Write the host LLM refresh plan consumed by embedding hosts."""
    from antigravity_engine.hub.scanner import detect_modules, resolve_module_path

    plan_id = status.refresh_run_id
    modules: list[dict[str, object]] = []
    tasks: list[dict[str, object]] = [_build_conventions_task(workspace, report)]
    for module in detect_modules(workspace):
        module_path = resolve_module_path(workspace, module)
        files = _list_source_files(workspace, module_path)
        module_task_ids: list[str] = []
        try:
            from antigravity_engine.hub.module_grouping import group_files, load_module_files

            groups = group_files(load_module_files(module_path, workspace), workspace)
            for group in groups:
                task = _build_module_knowledge_task(
                    workspace=workspace,
                    module=module,
                    module_path=_relative_path(workspace, module_path),
                    group=group,
                )
                tasks.append(task)
                module_task_ids.append(str(task["task_id"]))
        except Exception as exc:  # noqa: BLE001
            module_task_ids.append(f"task-build-error: {exc}")
        modules.append(
            {
                "module": module,
                "path": _relative_path(workspace, module_path),
                "source_files": files[:100],
                "source_file_count": len(files),
                "status": status.modules.get(module, "skipped"),
                "task_ids": module_task_ids,
            }
        )

    payload = {
        "schema": "antigravity-agent-refresh-plan-v1",
        "plan_id": plan_id,
        "refresh_run_id": status.refresh_run_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "workspace": str(workspace.resolve()),
        "host_llm_capability": "available" if has_host_llm_capability() else "unavailable",
        "reason": reason or "semantic refresh uses host_agent_capability",
        "status": status.model_dump(mode="json"),
        "inputs": [
            ".antigravity/scan_report.json",
            ".antigravity/structure.md",
            ".antigravity/knowledge_graph.json",
            ".antigravity/document_index.md",
            ".antigravity/data_overview.md",
            ".antigravity/media_manifest.md",
        ],
        "modules": modules,
        "semantic_contract": {
            "provider": "host_agent_capability",
            "engine_role": "scan, orchestrate, persist, validate",
            "llm_role": (
                "main agent should expose these prompts to sub-agents when "
                "available; otherwise use the main agent LLM on the supplied "
                "prompt. The engine never reads local LLM keys."
            ),
            "output_schema": _module_knowledge_schema(),
        },
        "execution": {
            "preference": "subagent_first",
            "fallback": "main_agent_llm",
            "main_agent_role": "dispatch supplied task packages and return structured outputs",
            "middleware_role": "scan, group source, expose prompts/schema, validate, persist",
        },
        "main_agent_workflow": [
            "Call prepare_refresh_project to get this plan and all pending task packages.",
            "For each pending task, launch a sub-agent when available; otherwise use the main agent LLM on the exact prompt.",
            "Submit each HostLlmResponse-shaped JSON result with submit_refresh_result(task_id, result_json).",
            "If submit_refresh_result returns status=rejected, repair the same task output using validation_errors and repair_hint, then resubmit.",
            "When pending_tasks is empty, call finalize_refresh_project to write the knowledge artifacts.",
        ],
        "tasks": tasks,
        "required_outputs": [
            ".antigravity/knowledge/{module}.json",
            ".antigravity/agents/{module}.md",
            ".antigravity/map.md",
            ".antigravity/knowledge_validation.json",
        ],
        "validation": [
            "all detected modules have structured and Markdown knowledge artifacts",
            "source references use workspace-relative paths and valid line ranges",
            "map.md contains Path, Description, and Key topics for each module",
            "template-like or placeholder semantic content fails validation",
        ],
    }
    _refresh_plan_task_status(workspace, payload)
    (ag_dir / "agent_refresh_plan.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _remove_stale_host_delegation(ag_dir: Path) -> None:
    """Remove the legacy host-delegation artifact when refresh uses the new plan."""
    legacy_path = ag_dir / "host_delegation.json"
    try:
        if legacy_path.is_file():
            legacy_path.unlink()
    except OSError:
        pass


def _list_source_files(workspace: Path, module_path: Path) -> list[str]:
    """List source files under a module path."""
    if not module_path.exists():
        return []
    if module_path.is_file():
        candidates = [module_path]
    else:
        candidates = sorted(module_path.rglob("*"))
    files: list[str] = []
    for path in candidates:
        if path.is_file() and path.suffix.lower() in SOURCE_CODE_EXTS:
            try:
                files.append(str(path.relative_to(workspace)))
            except ValueError:
                continue
    return files


def _relative_path(workspace: Path, path: Path) -> str:
    """Return a workspace-relative POSIX path when possible."""
    try:
        rel = path.relative_to(workspace)
    except ValueError:
        return path.as_posix()
    return rel.as_posix()


def _build_unavailable_conventions(report, reason: str) -> str:
    """Build a non-semantic conventions stub when host LLM is unavailable."""
    return (
        "# Project Conventions Unavailable\n\n"
        "Semantic convention analysis requires the host LLM capability.\n\n"
        f"- Reason: {reason}\n"
        f"- File count: {getattr(report, 'file_count', 0)}\n"
        f"- Languages seen during scan: {', '.join(getattr(report, 'languages', {}) or {}) or 'unknown'}\n"
    )


def _build_unavailable_map_md(workspace: Path) -> str:
    """Build a non-semantic map stub when host LLM is unavailable."""
    from antigravity_engine.hub.scanner import detect_modules, resolve_module_path

    lines = [
        "# Module Map",
        "",
        "Semantic module descriptions are unavailable because the host LLM capability is not registered.",
        "",
    ]
    for module in detect_modules(workspace):
        module_path = resolve_module_path(workspace, module)
        lines.extend(
            [
                f"## {module}",
                f"**Path:** `{_relative_path(workspace, module_path).rstrip('/')}/`",
                "**Description:** unavailable until host LLM semantic refresh succeeds",
                "**Key topics:** unavailable",
                "",
            ]
        )
    return "\n".join(lines).strip() + "\n"

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
        "failed": 4,
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
    if "partial" in normalized:
        return "partial"
    if "success" in normalized:
        return "success"
    return skipped_state


def _write_refresh_status(ag_dir: Path, status: RefreshStatus) -> None:
    """Persist refresh status to ``.antigravity/status.json``.

    Args:
        ag_dir: Antigravity output directory.
        status: Refresh status document to serialize.
    """
    status_path = ag_dir / "status.json"
    status_path.write_text(
        json.dumps(status.model_dump(mode="json"), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


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


def _write_agent_md_artifacts(
    agents_dir: Path,
    module: str,
    group_outputs: list[tuple[str, str]],
) -> None:
    """Write agent.md Markdown artifacts for a module.

    For single-group modules: writes ``agents/{module}.md``.
    For multi-group modules: writes ``agents/{module}/group_name.md``
    (one per group, no merging — each is a standalone knowledge document).

    Args:
        agents_dir: The ``.antigravity/agents`` directory.
        module: Module identifier.
        group_outputs: List of ``(group_name, markdown_content)`` tuples.
    """
    if len(group_outputs) == 1:
        # Single group → single file
        _group_name, md_content = group_outputs[0]
        out_path = agents_dir / f"{module}.md"
        out_path.write_text(md_content, encoding="utf-8")
    else:
        # Multiple groups → directory with one file per group
        mod_dir = agents_dir / module
        mod_dir.mkdir(parents=True, exist_ok=True)
        for group_name, md_content in group_outputs:
            safe_name = re.sub(r"[^a-zA-Z0-9_-]", "_", group_name)
            out_path = mod_dir / f"{safe_name}.md"
            out_path.write_text(md_content, encoding="utf-8")


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
        f"# Module: {module} — Group: {group_name}",
        "",
        "(Auto-generated fallback — LLM analysis was unavailable)",
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
    from antigravity_engine.hub.scanner import (
        detect_modules,
        list_root_module_files,
        resolve_module_path,
    )

    modules_dir = workspace / ".antigravity" / "modules"
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


def _export_normalized_graph_store(ag_dir: Path, graph: dict[str, Any]) -> None:
    """Export knowledge graph into normalized JSONL graph store files.

    Args:
        ag_dir: The ``.antigravity`` directory path.
        graph: The in-memory knowledge graph payload.
    """
    graph_dir = ag_dir / "graph"
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
                    "schema": "antigravity-graph-node-v1",
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
                    "schema": "antigravity-graph-edge-v1",
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


def _run_gitnexus_analyze(workspace: Path, refresh_status: RefreshStatus) -> None:
    """Run ``gitnexus analyze`` to build/update the code knowledge graph.

    Silently skips if the ``gitnexus`` CLI is not installed. This step is
    optional — the ask pipeline degrades gracefully without it.

    Args:
        workspace: Project root directory.
        refresh_status: Mutable refresh status to record outcome.
    """
    try:
        result = subprocess.run(
            ["gitnexus", "--version"],
            capture_output=True,
            check=False,
        )
        if result.returncode != 0:
            print("[9/9] GitNexus not installed; skipping code graph indexing.", file=sys.stderr)
            refresh_status.stages["gitnexus"] = "skipped"
            return
    except FileNotFoundError:
        print("[9/9] GitNexus not installed; skipping code graph indexing.", file=sys.stderr)
        refresh_status.stages["gitnexus"] = "skipped"
        return

    print("[9/9] Running GitNexus code graph indexing...", file=sys.stderr)
    try:
        gitnexus_timeout = int(os.environ.get("AG_GITNEXUS_TIMEOUT_SECONDS", "300"))
        result = subprocess.run(
            ["gitnexus", "analyze", str(workspace.resolve())],
            capture_output=True,
            text=True,
            cwd=str(workspace),
            check=False,
            timeout=gitnexus_timeout,
        )
        if result.returncode == 0:
            print("  ✓ GitNexus code graph indexed", file=sys.stderr)
            refresh_status.stages["gitnexus"] = "success"
        else:
            stderr_snippet = (result.stderr or "")[:200].strip()
            print(f"  ⚠ GitNexus analyze failed: {stderr_snippet}", file=sys.stderr)
            _mark_stage_failure(
                refresh_status,
                stage="gitnexus",
                reason=stderr_snippet or "non-zero exit code",
                partial=True,
            )
    except subprocess.TimeoutExpired:
        print("  ⚠ GitNexus analyze timed out", file=sys.stderr)
        _mark_stage_failure(
            refresh_status,
            stage="gitnexus",
            reason="timeout",
            partial=True,
        )
    except Exception as exc:
        print(f"  ⚠ GitNexus analyze error: {exc}", file=sys.stderr)
        _mark_stage_failure(
            refresh_status,
            stage="gitnexus",
            reason=str(exc),
            partial=True,
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


def _compute_affected_modules(
    report,
    module_ids: list[str],
) -> set[str] | None:
    """Determine which modules were touched by changed files in a quick scan.

    Returns ``None`` if the impact cannot be determined (e.g. no file
    metadata), in which case the caller should run all modules.

    Args:
        report: ScanReport from quick_scan.
        module_ids: List of known module identifiers.

    Returns:
        Set of affected module identifiers, or None.
    """
    metadata = getattr(report, "file_metadata", None)
    samples = getattr(report, "scanned_file_samples", None)
    changed_paths = list(metadata.keys()) if metadata else (samples or [])
    if not changed_paths:
        return None

    affected: set[str] = set()
    for rel_path in changed_paths:
        parts = rel_path.replace("\\", "/").split("/")
        if not parts:
            continue
        # Match against module IDs — check both simple ("cli") and
        # two-level ("engine_hub") patterns.
        top = parts[0]
        for mid in module_ids:
            if mid == top:
                affected.add(mid)
            elif mid.startswith(f"{top}_") and len(parts) > 1:
                # Two-level: "engine_hub" matches "engine/antigravity_engine/hub/..."
                # Heuristic: if any path component matches the suffix, it's affected.
                suffix = mid.split("_", 1)[1]
                if suffix in parts:
                    affected.add(mid)
    return affected


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
    from antigravity_engine.hub.agents import build_map_agent

    try:
        from agents import Runner
    except ImportError:
        raise ImportError(
            "OpenAI Agent SDK not found. Install: pip install antigravity-engine"
        ) from None

    agents_dir = workspace / ".antigravity" / "agents"
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
    max_batch_chars = int(os.environ.get("AG_MAP_BATCH_CHARS", "30000"))
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
    map_timeout = float(os.environ.get("AG_MAP_AGENT_TIMEOUT_SECONDS", "90"))

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
    from antigravity_engine.hub.scanner import detect_modules, resolve_module_path

    modules = detect_modules(workspace)
    if not modules:
        return "# Module Map\n\n(No modules detected)\n"

    lines = ["# Module Map\n"]
    agents_dir = workspace / ".antigravity" / "agents"

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
    from antigravity_engine.hub.scanner import detect_modules

    ag_dir = workspace / ".antigravity"
    modules = detect_modules(workspace)

    # -- Collect per-module evidence --
    from antigravity_engine.hub.scanner import resolve_module_path

    # Read structure.md once
    structure = ""
    structure_file = ag_dir / "structure.md"
    if structure_file.is_file():
        try:
            structure = structure_file.read_text(encoding="utf-8")
        except OSError:
            pass

    module_evidence: list[str] = []
    for mod in modules:
        parts: list[str] = [f"### Module: {mod}"]

        # Source 1: module knowledge doc (best quality, from RefreshModuleAgent)
        mod_doc = ag_dir / "modules" / f"{mod}.md"
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
    conv_file = ag_dir / "conventions.md"
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

    registry_timeout = float(os.environ.get("AG_REGISTRY_TIMEOUT_SECONDS", "60"))
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
    from antigravity_engine.hub.scanner import (
        detect_modules,
        list_root_module_files,
        resolve_module_path,
    )

    ag_dir = workspace / ".antigravity"
    modules = detect_modules(workspace)
    if not modules:
        return ""

    structure_file = ag_dir / "structure.md"
    structure = ""
    if structure_file.is_file():
        try:
            structure = structure_file.read_text(encoding="utf-8")
        except OSError:
            pass

    lines: list[str] = ["# Module Registry\n"]
    modules_dir = ag_dir / "modules"
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
