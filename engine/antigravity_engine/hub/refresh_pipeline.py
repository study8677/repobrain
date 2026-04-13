"""Refresh pipeline — scan the project and generate knowledge artifacts.

Extracted from ``pipeline.py`` to separate the refresh and ask
workflows into dedicated modules.
"""
from __future__ import annotations

import asyncio
import ast
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
    ModuleClaim,
    ModuleFactsDocument,
    ModuleRegistryEntry,
    RefreshStatus,
)

logger = logging.getLogger(__name__)


async def refresh_pipeline(workspace: Path, quick: bool = False) -> RefreshStatus:
    """Scan project and update .antigravity/conventions.md.

    Args:
        workspace: Project root directory.
        quick: If True, only scan files changed since last refresh.

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
    model: str | None = None

    if not refresh_scan_only:
        from agents import set_tracing_disabled
        from antigravity_engine.config import get_settings
        from antigravity_engine.hub.agents import create_model

        set_tracing_disabled(True)
        settings = get_settings()
        model = create_model(settings)

    ag_dir = workspace / ".antigravity"
    ag_dir.mkdir(parents=True, exist_ok=True)
    sha_file = ag_dir / ".last_refresh_sha"
    refresh_status = RefreshStatus(
        refresh_run_id=datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ"),
        overall_status="success",
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

    if not refresh_scan_only:
        from antigravity_engine.hub.agents import build_refresh_agent

        prompt = _format_scan_report(report)

        agent = build_refresh_agent(model or "")
        try:
            from agents import Runner
        except ImportError:
            raise ImportError(
                "OpenAI Agent SDK not found. Install: pip install antigravity-engine"
            ) from None

        print("[2/3] Analyzing with multi-agent swarm...", file=sys.stderr)

        refresh_timeout = float(os.environ.get("AG_REFRESH_AGENT_TIMEOUT_SECONDS", "90"))
        try:
            if refresh_timeout > 0:
                result = await asyncio.wait_for(Runner.run(agent, prompt), timeout=refresh_timeout)
            else:
                result = await Runner.run(agent, prompt)
            conventions_content = result.final_output
            refresh_status.stages["conventions"] = "success"
        except Exception as exc:
            print(f"  ⚠ Conventions swarm failed: {exc}. Using fallback.", file=sys.stderr)
            conventions_content = _build_fallback_conventions(report)
            _mark_stage_failure(
                refresh_status,
                stage="conventions",
                reason=str(exc),
                partial=True,
            )
    else:
        print("[2/3] Scan-only mode enabled; skipping LLM analysis.", file=sys.stderr)
        conventions_content = _build_fallback_conventions(report)
        refresh_status.stages["conventions"] = "skipped"

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

    if not refresh_scan_only:
        print("[7/8] Module agents learning codebase...", file=sys.stderr)
        from antigravity_engine.hub.agents import (
            build_refresh_module_swarm_v2,
            build_refresh_git_agent,
        )
        from antigravity_engine.hub.scanner import detect_modules

        try:
            from agents import Runner
        except ImportError:
            raise ImportError(
                "OpenAI Agent SDK not found. Install: pip install antigravity-engine"
            ) from None

        module_entries = build_refresh_module_swarm_v2(model, workspace)
        expected_modules = detect_modules(workspace)
        module_timeout = float(os.environ.get("AG_MODULE_AGENT_TIMEOUT_SECONDS", "45"))
        mod_concurrency = int(os.environ.get("AG_REFRESH_CONCURRENCY", "8"))
        _mod_sem = asyncio.Semaphore(mod_concurrency)
        modules_dir = ag_dir / "modules"
        modules_dir.mkdir(parents=True, exist_ok=True)

        async def _run_module(entry: tuple) -> tuple[str, str]:
            """Run one module's group agents and persist structured artifacts.

            Args:
                entry: Tuple of module name and group agent entries.

            Returns:
                Module identifier and resulting health state.
            """
            async with _mod_sem:
                mod_name, group_entries = entry
                print(
                    f"  → RefreshModule_{mod_name} ({len(group_entries)} groups)...",
                    file=sys.stderr,
                )

                async def _run_sub(
                    group_name: str,
                    group,
                    sagent: object,
                ) -> tuple[str, GroupFactsDocument | None, str | None]:
                    """Run one group agent and parse/fallback its facts output.

                    Args:
                        group_name: Group identifier within the module.
                        group: Module grouping object with pre-loaded files.
                        sagent: Agent instance for the group.

                    Returns:
                        Tuple of group name, parsed/fallback facts document, and
                        optional failure reason.
                    """
                    try:
                        if module_timeout > 0:
                            res = await asyncio.wait_for(
                                Runner.run(
                                    sagent,
                                    "Extract structured claims with evidence.",
                                    max_turns=3,
                                ),
                                timeout=module_timeout,
                            )
                        else:
                            res = await Runner.run(
                                sagent,
                                "Extract structured claims with evidence.",
                                max_turns=3,
                            )
                        parsed = _parse_group_facts_output(
                            res.final_output,
                            module=mod_name,
                            group_name=group_name,
                        )
                        print(f"    ✓ {mod_name}/{group_name}", file=sys.stderr)
                        return group_name, parsed, None
                    except Exception as exc:
                        failure_reason = str(exc)
                        print(f"    ⚠ {mod_name}/{group_name} failed: {failure_reason}", file=sys.stderr)
                        fallback_doc = _build_group_facts_fallback(
                            module=mod_name,
                            group_name=group_name,
                            group=group,
                        )
                        return group_name, fallback_doc, failure_reason

                sub_results = await asyncio.gather(
                    *[_run_sub(gn, grp, sa) for gn, grp, sa in group_entries]
                )

                successes: list[GroupFactsDocument] = []
                for group_name, facts_doc, failure_reason in sub_results:
                    if facts_doc is None:
                        _mark_module_failure(
                            refresh_status,
                            module=mod_name,
                            group_name=group_name,
                            reason=failure_reason or "group returned no facts",
                            state="failed",
                        )
                        continue
                    successes.append(facts_doc)
                    if failure_reason:
                        _mark_module_failure(
                            refresh_status,
                            module=mod_name,
                            group_name=group_name,
                            reason=failure_reason,
                            state="partial",
                        )

                if not successes:
                    refresh_status.modules[mod_name] = "failed"
                    print(f"  ⚠ RefreshModule_{mod_name} produced no facts", file=sys.stderr)
                    return mod_name, "failed"

                merged = _merge_group_facts(module=mod_name, group_docs=successes)
                _write_module_artifacts(modules_dir=modules_dir, document=merged)
                module_state = "success"
                if any(reason is not None for _, _, reason in sub_results):
                    module_state = "partial"
                refresh_status.modules[mod_name] = module_state
                print(f"  ✓ RefreshModule_{mod_name} done ({module_state})", file=sys.stderr)
                return mod_name, module_state

        print(
            f"  ▶ Running {len(module_entries)} modules "
            f"(concurrency={mod_concurrency})...",
            file=sys.stderr,
        )
        module_results = await asyncio.gather(*[_run_module(e) for e in module_entries])
        seen_modules = {name for name, _ in module_results}
        for module_name in expected_modules:
            if module_name in seen_modules:
                continue
            refresh_status.modules[module_name] = "failed"
            _mark_module_failure(
                refresh_status,
                module=module_name,
                group_name=None,
                reason="module produced no group agents",
                state="failed",
            )

        refresh_status.stages["module_docs"] = _aggregate_states(
            list(refresh_status.modules.values()),
            skipped_state="skipped",
        )

        print("  → RefreshGitAgent analyzing git history...", file=sys.stderr)
        try:
            git_agent = build_refresh_git_agent(model, workspace)
            if module_timeout > 0:
                await asyncio.wait_for(
                    Runner.run(
                        git_agent,
                        "Analyze the project's git history and write your git insights document.",
                        max_turns=25,
                    ),
                    timeout=module_timeout,
                )
            else:
                await Runner.run(
                    git_agent,
                    "Analyze the project's git history and write your git insights document.",
                    max_turns=25,
                )
            refresh_status.stages["git_insights"] = "success"
        except Exception as exc:
            print(f"  ⚠ RefreshGitAgent failed: {exc}", file=sys.stderr)
            _mark_stage_failure(
                refresh_status,
                stage="git_insights",
                reason=str(exc),
                partial=True,
            )
    else:
        print("[7/8] Scan-only mode: module agents skipped.", file=sys.stderr)
        refresh_status.stages["module_docs"] = "skipped"
        refresh_status.stages["git_insights"] = "skipped"

    # -- Step 8: Generate module registry artifacts --
    if not refresh_scan_only:
        print("[8/8] Generating module registry...", file=sys.stderr)
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
            print("  ✓ module registry generated", file=sys.stderr)
            refresh_status.stages["module_registry"] = "success"
        except Exception as exc:
            print(f"  ⚠ Module registry generation failed: {exc}", file=sys.stderr)
            _mark_stage_failure(
                refresh_status,
                stage="module_registry",
                reason=str(exc),
                partial=False,
            )
    else:
        print("[8/8] Scan-only mode: module registry skipped.", file=sys.stderr)
        refresh_status.stages["module_registry"] = "skipped"

    current_sha = _get_head_sha(workspace)
    if current_sha:
        sha_file.write_text(current_sha, encoding="utf-8")

    refresh_status.overall_status = _aggregate_states(
        list(refresh_status.stages.values()) + list(refresh_status.modules.values()),
        skipped_state="success",
    )
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

    Args:
        source_file: Source file object from ``module_grouping``.

    Returns:
        Claims derived from top-level definitions and imports.
    """
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
    if registry_timeout > 0:
        result = await asyncio.wait_for(
            Runner.run(registry_agent, prompt),
            timeout=registry_timeout,
        )
    else:
        result = await Runner.run(registry_agent, prompt)

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
