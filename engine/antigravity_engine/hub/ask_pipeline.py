"""Ask pipeline — answer questions about the project.

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
from pathlib import Path

from antigravity_engine.hub._constants import SKIP_DIRS
from antigravity_engine.hub.contracts import (
    ClaimVerification,
    ModuleClaim,
    ModuleFactsDocument,
    ModuleRegistryEntry,
    RefreshStatus,
    VerificationResult,
    WorkerEvidence,
)
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from agents import Agent
    from agents.result import RunResultStreaming

logger = logging.getLogger(__name__)


def _env_flag_enabled(name: str, default: bool = True) -> bool:
    """Read a boolean environment flag with a small permissive parser."""
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() not in {"0", "false", "no", "off"}


def _get_head_sha(workspace: Path) -> str | None:
    """Return the current git HEAD SHA, or None outside a git repository."""
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


def _has_agent_docs(workspace: Path) -> bool:
    """Return whether refresh has produced at least one agent Markdown doc."""
    agents_dir = workspace / ".antigravity" / "agents"
    if not agents_dir.is_dir():
        return False
    return (
        any(path.is_file() and path.suffix == ".md" for path in agents_dir.iterdir())
        or any(path.is_dir() for path in agents_dir.iterdir() if not path.name.startswith("."))
    )


def _agent_refresh_plan_path(workspace: Path) -> Path:
    """Return the standard host LLM refresh plan path."""
    return workspace / ".antigravity" / "agent_refresh_plan.json"


def _project_knowledge_refresh_plan(workspace: Path) -> tuple[bool, bool, str]:
    """Decide whether project knowledge should be refreshed before ask.

    Returns:
        Tuple of ``(should_refresh, quick, reason)``.
    """
    ag_dir = workspace / ".antigravity"
    refresh_plan_exists = _agent_refresh_plan_path(workspace).is_file()

    if not (ag_dir / "status.json").is_file():
        return True, False, "missing .antigravity/status.json"
    if not (ag_dir / "map.md").is_file():
        return True, False, "missing .antigravity/map.md"
    if not _has_agent_docs(workspace):
        if refresh_plan_exists and not _host_llm_capability_available():
            return False, False, "host LLM capability is unavailable"
        return True, False, "missing .antigravity/agents module knowledge"

    current_sha = _get_head_sha(workspace)
    if current_sha:
        sha_file = ag_dir / ".last_refresh_sha"
        try:
            last_sha = sha_file.read_text(encoding="utf-8").strip()
        except OSError:
            last_sha = ""
        if current_sha != last_sha:
            return True, bool(last_sha), "git HEAD changed since last refresh"

    return False, False, "knowledge is current"


def _local_llm_configured() -> bool:
    """Return whether the local engine can resolve an LLM backend."""
    return False


def _host_llm_capability_available() -> bool:
    """Return whether the embedding host registered refresh LLM capability."""
    from antigravity_engine.hub.host_llm import has_host_llm_capability

    return has_host_llm_capability()


async def ensure_fresh_project_knowledge(workspace: Path) -> str | None:
    """Refresh the project knowledge base before answering when needed.

    Args:
        workspace: Project root directory.

    Returns:
        A short notice when refresh completed with degraded status, otherwise
        None. Raises only when refresh fails and there is no usable knowledge.
    """
    if not _env_flag_enabled("AG_AUTO_REFRESH_BEFORE_ASK", default=True):
        return None

    should_refresh, quick, reason = _project_knowledge_refresh_plan(workspace)
    if not should_refresh:
        return None
    if not _host_llm_capability_available() and _local_llm_configured():
        return None

    print(
        f"[0/4] Project knowledge is stale ({reason}); running {'quick' if quick else 'full'} refresh...",
        file=sys.stderr,
    )

    from antigravity_engine.hub.refresh_pipeline import refresh_pipeline

    try:
        status = await refresh_pipeline(workspace, quick=quick)
    except Exception as exc:
        if _structured_artifacts_available(workspace):
            return f"Automatic refresh failed ({exc}); answering from existing knowledge."
        raise

    if status.overall_status != "success":
        refresh_plan_path = _agent_refresh_plan_path(workspace)
        if refresh_plan_path.is_file():
            return (
                "Automatic refresh requires host LLM capability; "
                f"see {refresh_plan_path}."
            )
        return f"Automatic refresh completed with status `{status.overall_status}`."

    return None


def _build_capability_unavailable_answer(
    workspace: Path,
    question: str,
    notice: str | None = None,
) -> str:
    """Build a capability-unavailable response when answer synthesis lacks an LLM."""
    refresh_plan_path = _agent_refresh_plan_path(workspace)
    lines = [
        "No answer-synthesis LLM is available to the engine in this process.",
        "",
        f"Question: {question}",
    ]
    if notice:
        lines.extend(["", notice])

    if refresh_plan_path.is_file():
        try:
            payload = json.loads(refresh_plan_path.read_text(encoding="utf-8"))
        except Exception:
            payload = {}
        lines.extend(
            [
                "",
                "Host LLM capability is required:",
                f"- Refresh plan: `{refresh_plan_path}`.",
                "- The engine expects a registered host LLM capability for semantic refresh and answer synthesis.",
                "- Re-run refresh after the embedding host exposes that capability.",
            ]
        )
        required_outputs = payload.get("required_outputs", [])
        if isinstance(required_outputs, list) and required_outputs:
            lines.append("")
            lines.append("Required outputs:")
            for item in required_outputs[:5]:
                if isinstance(item, dict):
                    lines.append(f"- {item.get('path', '(unknown path)')}: {item.get('description', '')}")
    else:
        lines.extend(
            [
                "",
                "Run `ag-refresh --workspace <project>` first to generate scan artifacts and a host LLM refresh plan.",
            ]
        )

    return "\n".join(lines).strip()


async def _run_with_optional_stream(
    agent: "Agent",
    prompt: str,
    max_turns: int = 12,
    timeout: float | None = None,
    stream_enabled: bool = False,
    progress_label: str | None = None,
) -> str:
    """Execute agent with optional streaming support."""
    from agents import Runner

    if not stream_enabled:
        # Non-streaming: use existing pattern
        if timeout and timeout > 0:
            result = await asyncio.wait_for(
                Runner.run(agent, prompt, max_turns=max_turns),
                timeout=timeout,
            )
        else:
            result = await Runner.run(agent, prompt, max_turns=max_turns)
        return str(result.final_output)

    # Streaming mode
    stream_result = Runner.run_streamed(agent, prompt, max_turns=max_turns)

    # For timeout with streaming, wrap the event consumption
    try:
        if timeout and timeout > 0:
            return await asyncio.wait_for(
                _consume_stream_events(stream_result, progress_label),
                timeout=timeout,
            )
        else:
            return await _consume_stream_events(stream_result, progress_label)
    except TimeoutError:
        stream_result.cancel()
        raise


async def _consume_stream_events(
    stream_result: "RunResultStreaming",
    progress_label: str | None = None,
) -> str:
    """Consume streaming events and return final output."""
    from agents.item_helpers import ItemHelpers

    if progress_label:
        print(f"[stream] {progress_label}", file=sys.stderr, flush=True)

    async for event in stream_result.stream_events():
        # Skip raw response events (token-level - too verbose)
        if event.type == "raw_response_event":
            continue

        # Track agent changes
        elif event.type == "agent_updated_stream_event":
            print(
                f"[stream] → Agent: {event.new_agent.name}",
                file=sys.stderr,
                flush=True,
            )

        # Handle generated items
        elif event.type == "run_item_stream_event":
            item = event.item

            if item.type == "tool_call_item":
                print("[stream] ⚙ Calling tool...", file=sys.stderr, flush=True)

            elif item.type == "tool_call_output_item":
                output_preview = str(getattr(item, 'output', ''))[:100]
                print(
                    f"[stream] ⚙ Tool output: {output_preview}...",
                    file=sys.stderr,
                    flush=True,
                )

            elif item.type == "message_output_item":
                content = ItemHelpers.text_message_output(item)
                if content:
                    preview = content[:200] if len(content) > 200 else content
                    if len(content) > 200:
                        preview += "..."
                    print(
                        f"[stream] 📝 {preview}",
                        file=sys.stderr,
                        flush=True,
                    )

    return str(stream_result.final_output)


async def ask_pipeline(workspace: Path, question: str) -> str:
    """Answer a question about the project.

    Args:
        workspace: Project root directory.
        question: Natural language question.

    Returns:
        Answer string.

    Notes:
        MCP servers are only auto-connected when both ``MCP_ENABLED=true`` and
        ``AG_ALLOW_MCP=true`` are set in the runtime environment.
    """
    auto_refresh_notice = await ensure_fresh_project_knowledge(workspace)

    if not _host_llm_capability_available():
        return _build_capability_unavailable_answer(
            workspace=workspace,
            question=question,
            notice=auto_refresh_notice,
        )

    structured_enabled = os.environ.get("AG_ASK_FORCE_LEGACY", "").strip().lower() not in {
        "1",
        "true",
        "yes",
    }
    if structured_enabled and _structured_artifacts_available(workspace):
        print("[1/4] Loading structured module facts...", file=sys.stderr)
        structured_answer = await _ask_with_structured_facts(workspace, question)
        if structured_answer is not None:
            if auto_refresh_notice:
                return f"{structured_answer}\n\n{auto_refresh_notice}"
            return structured_answer
        print("[1/4] Structured facts were insufficient; falling back to legacy swarm.", file=sys.stderr)

    answer = await _ask_with_host_llm(workspace, question)
    if auto_refresh_notice:
        return f"{answer}\n\n{auto_refresh_notice}"
    return answer


async def _ask_with_host_llm(workspace: Path, question: str) -> str:
    """Ask through the embedding host LLM capability using middleware context."""
    from antigravity_engine.hub.host_llm import HostLlmRequest, call_host_llm

    context = _build_ask_context(workspace, question)
    prompt = f"""\
Answer the user's question about this project using only the supplied
Antigravity knowledge context. If the context is insufficient, say what
knowledge is missing and recommend running refresh through the host-agent
task flow. Cite file paths and line numbers when present.

Question: {question}

Knowledge context:
{context}
"""
    response = await call_host_llm(
        HostLlmRequest(
            task="answer_question",
            workspace=str(workspace.resolve()),
            prompt=prompt,
            schema={"type": "markdown"},
            context={"question": question, "knowledge_context": context},
            agent_instructions=(
                "Use a sub-agent for answer synthesis when available. If not, "
                "use the main agent LLM on the supplied prompt. Do not inspect "
                "project files outside the supplied knowledge context."
            ),
            acceptance_criteria=[
                "answer is grounded in supplied Antigravity context",
                "file paths and line references are preserved when available",
                "insufficient context is stated explicitly",
            ],
        )
    )
    answer = str(response.data.get("markdown") or response.data.get("content") or response.content).strip()
    return answer or "Host LLM capability returned an empty answer."


async def _ask_with_legacy_swarm(workspace: Path, question: str) -> str:
    """Run the legacy multi-agent ask workflow.

    Args:
        workspace: Project root directory.
        question: Natural language question about the project.

    Returns:
        Answer string from the reviewer swarm.
    """

    from antigravity_engine.config import get_settings
    from antigravity_engine.hub.agents import build_reviewer_agent, create_model

    settings = get_settings()
    model = create_model(settings)

    print("[1/3] Gathering project context...", file=sys.stderr)

    # Retrieval-assisted: gather code evidence and feed it to the LLM
    # as additional context rather than returning it directly.  Set
    # AG_ASK_RETRIEVAL_FIRST=2 to restore the old "return immediately" mode.
    retrieval_mode = os.environ.get("AG_ASK_RETRIEVAL_FIRST", "1").strip().lower()
    retrieval_evidence: str | None = None
    if retrieval_mode in {"1", "true", "yes", "2"}:
        retrieval_evidence = _build_retrieval_semantic_answer(workspace, question)
        if retrieval_evidence and retrieval_mode == "2":
            # Legacy mode: return retrieval result directly without LLM.
            print("[2/3] Retrieval-first answer hit; skipping LLM.", file=sys.stderr)
            return retrieval_evidence

    context = _build_ask_context(workspace, question)
    graph_skill_context = None
    if _is_structure_query(question):
        graph_skill_context = _build_graph_skill_context(workspace, question)

    prompt_parts = [f"Project context:\n{context}"]
    if retrieval_evidence:
        prompt_parts.append(f"Code evidence (from retrieval):\n{retrieval_evidence}")
    if graph_skill_context:
        prompt_parts.append(graph_skill_context)
    prompt_parts.append(f"Question: {question}")
    prompt = "\n\n".join(prompt_parts)

    mcp_tools: dict | None = None
    mcp_manager = None
    mcp_runtime_opt_in = os.environ.get("AG_ALLOW_MCP", "").strip().lower() in {
        "1",
        "true",
        "yes",
    }
    if settings.MCP_ENABLED and mcp_runtime_opt_in:
        print("[…] Connecting to MCP servers...", file=sys.stderr)
        try:
            from antigravity_engine.mcp_client import MCPClientManager

            mcp_manager = MCPClientManager()
            await mcp_manager.initialize()
            mcp_tools = mcp_manager.get_all_tools_as_callables()
            if mcp_tools:
                logger.info("MCP tools loaded: %s", list(mcp_tools.keys()))
            else:
                logger.info("MCP enabled but no tools discovered")
        except Exception as exc:
            logger.warning("MCP initialization failed: %s", exc)
            print(f"  ⚠ MCP init failed: {exc}", file=sys.stderr)
            mcp_manager = None
    elif settings.MCP_ENABLED:
        logger.info(
            "MCP is enabled in settings but AG_ALLOW_MCP is not set; skipping MCP server autoconnection"
        )

    agent = build_reviewer_agent(model, workspace=workspace, mcp_tools=mcp_tools)
    try:
        from agents import Runner
    except ImportError:
        raise ImportError(
            "OpenAI Agent SDK not found. Install: pip install antigravity-engine"
        ) from None

    print("[2/3] Analyzing with multi-agent swarm...", file=sys.stderr)

    ask_timeout = float(os.environ.get("AG_ASK_TIMEOUT_SECONDS", "45"))
    try:
        try:
            result_text = await _run_with_optional_stream(
                agent=agent,
                prompt=prompt,
                max_turns=12,
                timeout=ask_timeout if ask_timeout > 0 else None,
                stream_enabled=settings.STREAM_ENABLED,
                progress_label="Analyzing with multi-agent swarm...",
            )
        finally:
            if mcp_manager is not None:
                try:
                    await mcp_manager.shutdown()
                except Exception as exc:
                    logger.warning("MCP shutdown error: %s", exc)
    except TimeoutError:
        return _build_timeout_fallback_answer(workspace, question)

    print("[3/3] Synthesizing answer...", file=sys.stderr)

    return result_text


# ---------------------------------------------------------------------------
# Structured facts path
# ---------------------------------------------------------------------------

def _structured_artifacts_available(workspace: Path) -> bool:
    """Return whether structured refresh artifacts exist.

    Checks for the new agent.md-based format first (``map.md`` +
    ``agents/``), then falls back to the legacy JSON facts format.

    Args:
        workspace: Project root directory.

    Returns:
        True when routing and knowledge artifacts exist.
    """
    ag_dir = workspace / ".antigravity"

    # New format: map.md + agents/ directory
    agents_dir = ag_dir / "agents"
    if (ag_dir / "map.md").is_file() and agents_dir.is_dir():
        has_agents = (
            any(agents_dir.glob("*.md"))
            or any(d.is_dir() for d in agents_dir.iterdir() if not d.name.startswith("."))
        )
        if has_agents:
            return True

    # Legacy format: module_registry.json + modules/*.facts.json
    modules_dir = ag_dir / "modules"
    return (
        (ag_dir / "module_registry.json").is_file()
        and (ag_dir / "status.json").is_file()
        and modules_dir.is_dir()
        and any(modules_dir.glob("*.facts.json"))
    )


async def _ask_with_structured_facts(workspace: Path, question: str) -> str | None:
    """Answer a question using agent.md knowledge documents.

    Uses map.md to route the question to relevant modules, then reads
    their agent.md files and lets LLM(s) answer from that context.

    For single agent.md → one LLM call.
    For multiple agent.md → parallel LLM calls → synthesizer LLM.

    Falls back to legacy JSON facts if the new format is not available.

    Args:
        workspace: Project root directory.
        question: Natural language question.

    Returns:
        Answer string, or ``None`` if the agent.md path cannot answer.
    """
    ag_dir = workspace / ".antigravity"

    # Check for new agent.md format
    if (ag_dir / "map.md").is_file() and (ag_dir / "agents").is_dir():
        answer = await _ask_with_agent_md(workspace, question)
        if answer is not None:
            return answer

    # Fall back to legacy JSON facts path
    return await _ask_with_legacy_facts(workspace, question)


def _parse_router_output(output: str) -> tuple[list[str], bool]:
    """Parse the Router agent's structured output.

    Expected format::

        MODULES: module1, module2
        GRAPH: yes

    Falls back to treating each line as a module name if the format
    is not recognized (backward compatible with old Router output).

    Args:
        output: Raw Router agent output text.

    Returns:
        Tuple of (raw module name list, needs_graph boolean).
    """
    modules: list[str] = []
    needs_graph = False

    for line in output.splitlines():
        stripped = line.strip()
        upper = stripped.upper()

        if upper.startswith("MODULES:"):
            raw = stripped[len("MODULES:"):].strip()
            modules = [m.strip().strip("`*") for m in raw.split(",") if m.strip()]
        elif upper.startswith("GRAPH:"):
            val = stripped[len("GRAPH:"):].strip().lower()
            needs_graph = val in ("yes", "true", "1")

    # Fallback: if no MODULES: line found, treat each line as a module name
    if not modules:
        modules = [
            line.strip().strip("- *`#")
            for line in output.strip().splitlines()
            if line.strip() and not line.strip().upper().startswith("GRAPH:")
        ]

    return modules, needs_graph


def _query_graph_for_question(workspace: Path, question: str) -> str:
    """Query GitNexus code knowledge graph for structural information.

    Calls ``gitnexus query`` with the user's question to get call chains,
    dependency relationships, and symbol context. Silently returns empty
    string if GitNexus is not installed or not indexed.

    Args:
        workspace: Project root directory.
        question: Natural language question.

    Returns:
        Graph query results as formatted string, or empty string.
    """
    from antigravity_engine.hub.ask_tools import (
        _is_gitnexus_available,
        _run_gitnexus,
    )

    if not _is_gitnexus_available():
        return ""

    # Use gitnexus query for hybrid search (BM25 + semantic)
    result = _run_gitnexus(workspace.resolve(), ["query", question])
    if not result or "error" in result.lower()[:50]:
        return ""

    return result


def _match_to_known_modules(
    raw_names: list[str],
    known: set[str],
) -> list[str]:
    """Match LLM-output module names to known module identifiers.

    Tries exact match first, then case-insensitive, then substring
    containment. Deduplicates and preserves order.

    Args:
        raw_names: Raw module name strings from LLM output.
        known: Set of known module identifiers from agents/ directory.

    Returns:
        Matched module identifiers (up to 3).
    """
    matched: list[str] = []
    seen: set[str] = set()
    known_lower = {k.lower(): k for k in known}

    for raw in raw_names:
        if len(matched) >= 3:
            break
        # Clean: strip markdown artifacts, parenthetical notes, etc.
        clean = re.sub(r"\s*\(.*?\)\s*", "", raw).strip().strip("- *`#:.")
        if not clean:
            continue

        # 1. Exact match
        if clean in known and clean not in seen:
            matched.append(clean)
            seen.add(clean)
            continue

        # 2. Case-insensitive match
        lower = clean.lower()
        if lower in known_lower and known_lower[lower] not in seen:
            matched.append(known_lower[lower])
            seen.add(known_lower[lower])
            continue

        # 3. Substring: find known modules whose name is contained
        #    in the raw output or vice versa
        for k in sorted(known, key=len, reverse=True):
            if k in seen:
                continue
            if k.lower() in lower or lower in k.lower():
                matched.append(k)
                seen.add(k)
                break

    return matched


async def _ask_with_agent_md(workspace: Path, question: str) -> str | None:
    """Answer a question by routing through map.md → agent.md files.

    Args:
        workspace: Project root directory.
        question: Natural language question.

    Returns:
        Answer string, or ``None`` if insufficient.
    """
    ag_dir = workspace / ".antigravity"

    # Step 1: Read map.md and select modules
    try:
        map_content = (ag_dir / "map.md").read_text(encoding="utf-8")
    except OSError:
        return None

    return await _ask_with_agent_md_via_host(workspace, question, map_content)

    print("[2/4] Routing question via map.md...", file=sys.stderr)

    router_prompt = f"""\
You are a routing agent for a codebase Q&A system.

Given the question and module map below, do TWO things:

1. Select 1-3 modules most relevant to this question.
2. Decide whether this question needs **structural graph analysis** — i.e.,
   call chains, dependency graphs, import relationships, impact analysis,
   cross-module data flow, or symbol lookup. If the question is about
   WHAT code does or WHY it's designed that way, graph is NOT needed.
   If it's about WHO calls WHOM, dependencies, or tracing execution flow,
   graph IS needed.

Output format (strict):
MODULES: module1, module2
GRAPH: yes

Or:
MODULES: module1
GRAPH: no

Question: {question}

Module Map:
{map_content}
"""
    router_agent = Agent(
        name="QuickRouter",
        instructions="Output ONLY in the exact format: MODULES: ... and GRAPH: yes/no. No other text.",
        model=model,
    )
    ask_timeout = float(os.environ.get("AG_ASK_TIMEOUT_SECONDS", "45"))
    try:
        router_output = await _run_with_optional_stream(
            agent=router_agent,
            prompt=router_prompt,
            max_turns=1,
            timeout=ask_timeout if ask_timeout > 0 else None,
            stream_enabled=settings.STREAM_ENABLED,
            progress_label="Routing question via map.md...",
        )
    except Exception:
        return None

    # Parse Router output: MODULES + GRAPH decision
    raw_modules, needs_graph = _parse_router_output(router_output)

    # Collect known module names from agents/ directory
    agents_dir = ag_dir / "agents"
    known_modules: set[str] = set()
    if agents_dir.is_dir():
        for item in agents_dir.iterdir():
            if item.is_file() and item.suffix == ".md":
                known_modules.add(item.stem)
            elif item.is_dir() and not item.name.startswith("."):
                known_modules.add(item.name)

    selected_modules = _match_to_known_modules(raw_modules, known_modules)
    if not selected_modules:
        return None

    print(
        f"[2/4] Selected modules: {', '.join(selected_modules)} | graph: {'yes' if needs_graph else 'no'}",
        file=sys.stderr,
    )

    # Step 2: Read agent.md for selected modules
    module_knowledge: list[tuple[str, str]] = []
    for mod_name in selected_modules:
        # Try single file
        single_md = agents_dir / f"{mod_name}.md"
        if single_md.is_file():
            try:
                content = single_md.read_text(encoding="utf-8")
                module_knowledge.append((mod_name, content))
            except OSError:
                continue
        # Try multi-group directory
        elif (agents_dir / mod_name).is_dir():
            for md_file in sorted((agents_dir / mod_name).glob("*.md")):
                try:
                    content = md_file.read_text(encoding="utf-8")
                    module_knowledge.append((f"{mod_name}/{md_file.stem}", content))
                except OSError:
                    continue

    if not module_knowledge:
        return None

    # Step 2.5: Query GitNexus graph if Router decided it's needed
    graph_context = ""
    if needs_graph:
        graph_context = _query_graph_for_question(workspace, question)
        if graph_context:
            print(f"[2.5/4] Graph enrichment: {len(graph_context)} chars", file=sys.stderr)

    # Step 3: Answer from agent.md content (+ optional graph context)
    print(f"[3/4] Reading {len(module_knowledge)} agent docs...", file=sys.stderr)
    ask_api_concurrency = int(os.environ.get("AG_API_CONCURRENCY", "5"))
    _ask_api_sem = asyncio.Semaphore(ask_api_concurrency)

    # Build graph section for prompts (empty string if no graph data)
    graph_section = ""
    if graph_context:
        graph_section = f"""

Structural relationships (from code knowledge graph — precise call/import/dependency data):
{graph_context[:30_000]}

IMPORTANT: The "module knowledge" describes WHAT the code does (semantic understanding).
The "structural relationships" show WHO calls/imports WHOM (precise graph data).
Combine both sources for a complete answer. Prefer graph data for structural questions."""

    if len(module_knowledge) == 1:
        # Single agent.md → one LLM call
        mod_name, knowledge = module_knowledge[0]
        answer_prompt = f"""\
Answer this question using the module knowledge below.
Be specific — cite file paths, function names, line numbers.
If the knowledge doesn't cover the question, say so.

Question: {question}

Module: {mod_name}
Knowledge:
{knowledge[:80_000]}
{graph_section}
"""
        answer_agent = Agent(
            name="AnswerAgent",
            instructions="Answer concisely with specific code references. No preamble.",
            model=model,
        )
        try:
            answer = await _run_with_optional_stream(
                agent=answer_agent,
                prompt=answer_prompt,
                max_turns=1,
                timeout=ask_timeout if ask_timeout > 0 else None,
                stream_enabled=settings.STREAM_ENABLED,
                progress_label="Generating answer from agent.md...",
            )
            print("[4/4] Answer synthesized.", file=sys.stderr)
            return answer
        except Exception:
            return None
    else:
        # Multiple agent.md → parallel LLM calls (with concurrency limit) → synthesizer
        async def _answer_from_doc(
            mod_name: str, knowledge: str
        ) -> tuple[str, str | None]:
            """Answer from a single module's knowledge document.

            Note: streaming is disabled for parallel calls to avoid output interleaving.
            """
            prompt = f"""\
Answer this question using ONLY the module knowledge below.
Be specific — cite file paths, function names.
If irrelevant to the question, respond with "(not relevant)".

Question: {question}

Module: {mod_name}
Knowledge:
{knowledge[:60_000]}
{graph_section}
"""
            agent = Agent(
                name=f"Reader_{mod_name}",
                instructions="Answer concisely. Say '(not relevant)' if the knowledge doesn't help.",
                model=model,
            )
            try:
                async with _ask_api_sem:
                    answer = await _run_with_optional_stream(
                        agent=agent,
                        prompt=prompt,
                        max_turns=1,
                        timeout=ask_timeout if ask_timeout > 0 else None,
                        stream_enabled=False,
                        progress_label=None,
                    )
                return mod_name, answer
            except Exception:
                return mod_name, None

        partial_answers = await asyncio.gather(
            *[_answer_from_doc(name, knowledge) for name, knowledge in module_knowledge]
        )

        # Filter out failures and irrelevant answers
        valid_answers = [
            (name, ans) for name, ans in partial_answers
            if ans and "(not relevant)" not in ans.lower()
        ]

        if not valid_answers:
            return None

        if len(valid_answers) == 1:
            print("[4/4] Answer synthesized.", file=sys.stderr)
            return valid_answers[0][1]

        # Synthesize multiple answers
        synth_parts = "\n\n---\n\n".join(
            f"**From {name}:**\n{ans}" for name, ans in valid_answers
        )
        synth_prompt = f"""\
Synthesize these partial answers into one coherent response.
Keep all specific references (file paths, function names, line numbers).
Be concise.

Question: {question}

Partial answers:
{synth_parts}
"""
        synth_agent = Agent(
            name="Synthesizer",
            instructions="Combine the answers into one coherent response. Keep all specifics.",
            model=model,
        )
        try:
            answer = await _run_with_optional_stream(
                agent=synth_agent,
                prompt=synth_prompt,
                max_turns=1,
                timeout=ask_timeout if ask_timeout > 0 else None,
                stream_enabled=settings.STREAM_ENABLED,
                progress_label="Synthesizing answers from multiple modules...",
            )
            print("[4/4] Answer synthesized from multiple modules.", file=sys.stderr)
            return answer
        except Exception:
            # Return the first valid answer as fallback
            return valid_answers[0][1]


async def _ask_with_agent_md_via_host(workspace: Path, question: str, map_content: str) -> str | None:
    """Answer from generated agent.md docs through host LLM capability."""
    from antigravity_engine.hub.host_llm import HostLlmRequest, call_host_llm

    agents_dir = workspace / ".antigravity" / "agents"
    if not agents_dir.is_dir():
        return None
    module_docs: list[str] = []
    for item in sorted(agents_dir.iterdir()):
        if item.is_file() and item.suffix == ".md":
            try:
                module_docs.append(f"## {item.stem}\n{item.read_text(encoding='utf-8')[:50_000]}")
            except OSError:
                continue
        elif item.is_dir() and not item.name.startswith("."):
            for md_file in sorted(item.glob("*.md")):
                try:
                    module_docs.append(
                        f"## {item.name}/{md_file.stem}\n{md_file.read_text(encoding='utf-8')[:40_000]}"
                    )
                except OSError:
                    continue
        if len(module_docs) >= 6:
            break
    if not module_docs:
        return None

    module_docs_text = "\n\n---\n\n".join(module_docs)
    prompt = f"""\
Answer the user's question using the Antigravity module map and module
knowledge documents below. Route mentally from the map, then answer from the
relevant module docs. Cite file paths, line numbers, and function/class names
when present. If the docs do not contain enough information, say so.

Question: {question}

Module map:
{map_content[:30_000]}

Module knowledge:
{module_docs_text}
"""
    response = await call_host_llm(
        HostLlmRequest(
            task="answer_question",
            workspace=str(workspace.resolve()),
            prompt=prompt,
            schema={"type": "markdown"},
            context={"question": question, "module_doc_count": len(module_docs)},
            agent_instructions=(
                "Use a sub-agent for answer synthesis when available; otherwise "
                "use the main agent LLM. Do not inspect project files directly."
            ),
            acceptance_criteria=[
                "answer relies on supplied map and module docs",
                "specific references are preserved",
                "missing knowledge is stated explicitly",
            ],
        )
    )
    return str(response.data.get("markdown") or response.data.get("content") or response.content).strip() or None


async def _ask_with_legacy_facts(workspace: Path, question: str) -> str | None:
    """Answer a question from legacy JSON module facts when available.

    This is the original structured facts path preserved for backward
    compatibility with pre-existing ``modules/*.facts.json`` artifacts.

    Args:
        workspace: Project root directory.
        question: Natural language question.

    Returns:
        Structured answer string, or ``None`` to fall back to swarm.
    """
    ag_dir = workspace / ".antigravity"
    modules_dir = ag_dir / "modules"
    if not (
        (ag_dir / "module_registry.json").is_file()
        and (ag_dir / "status.json").is_file()
        and modules_dir.is_dir()
        and any(modules_dir.glob("*.facts.json"))
    ):
        return None

    registry_entries = _load_registry_entries(workspace)
    refresh_status = _load_refresh_status(workspace)
    candidates = _select_candidate_modules(question, registry_entries)
    if not candidates:
        return None

    print(
        f"[2/4] Pre-routing to structured modules: {', '.join(entry.module for entry in candidates)}",
        file=sys.stderr,
    )

    documents: dict[str, ModuleFactsDocument] = {}
    worker_outputs: list[WorkerEvidence] = []
    verification_reports: list[VerificationResult] = []

    for entry in candidates:
        document = _load_module_facts(workspace, entry.module)
        if document is None:
            continue
        worker_output = _build_worker_evidence(question, entry, document, refresh_status)
        if not worker_output.claims_used:
            continue
        verification = _verify_worker_evidence(
            workspace=workspace,
            question=question,
            document=document,
            worker_output=worker_output,
        )
        documents[entry.module] = document
        worker_outputs.append(worker_output)
        verification_reports.append(verification)

    if not verification_reports:
        return None

    print("[3/4] Verifying structured claims...", file=sys.stderr)
    answer = _synthesize_structured_answer(
        question=question,
        entries=candidates,
        documents=documents,
        worker_outputs=worker_outputs,
        verification_reports=verification_reports,
    )
    if answer is None:
        return None

    print("[4/4] Returning evidence-backed structured answer.", file=sys.stderr)
    return answer


def _load_registry_entries(workspace: Path) -> list[ModuleRegistryEntry]:
    """Load machine-readable module registry entries.

    Args:
        workspace: Project root directory.

    Returns:
        Parsed registry entries.
    """
    registry_path = workspace / ".antigravity" / "module_registry.json"
    payload = json.loads(registry_path.read_text(encoding="utf-8"))
    return [ModuleRegistryEntry.model_validate(item) for item in payload]


def _load_refresh_status(workspace: Path) -> RefreshStatus:
    """Load refresh health status from ``.antigravity/status.json``.

    Args:
        workspace: Project root directory.

    Returns:
        Parsed refresh status document.
    """
    status_path = workspace / ".antigravity" / "status.json"
    return RefreshStatus.model_validate_json(status_path.read_text(encoding="utf-8"))


def _load_module_facts(
    workspace: Path,
    module: str,
) -> ModuleFactsDocument | None:
    """Load facts for a single module.

    Args:
        workspace: Project root directory.
        module: Module identifier.

    Returns:
        Parsed facts document, or ``None`` when missing or invalid.
    """
    facts_path = workspace / ".antigravity" / "modules" / f"{module}.facts.json"
    if not facts_path.is_file():
        return None
    try:
        return ModuleFactsDocument.model_validate_json(
            facts_path.read_text(encoding="utf-8")
        )
    except Exception:
        return None


def _select_candidate_modules(
    question: str,
    registry_entries: list[ModuleRegistryEntry],
) -> list[ModuleRegistryEntry]:
    """Select the top candidate modules for a question.

    Args:
        question: Natural language question.
        registry_entries: Machine-readable module registry entries.

    Returns:
        Up to three candidate modules ordered by score.
    """
    question_tokens = _question_tokens(question)
    scored: list[tuple[int, ModuleRegistryEntry]] = []
    for entry in registry_entries:
        score = _score_registry_entry(question_tokens, question.lower(), entry)
        if score <= 0:
            continue
        scored.append((score, entry))

    scored.sort(
        key=lambda item: (
            -item[0],
            item[1].status != "success",
            item[1].module,
        )
    )
    return [entry for _, entry in scored[:3]]


def _question_tokens(question: str) -> list[str]:
    """Tokenize a user question for routing and claim matching.

    Args:
        question: Natural language question.

    Returns:
        Lowercase tokens with lightweight normalization.
    """
    tokens = re.findall(r"[a-zA-Z0-9_]{2,}", question.lower())
    return [token for token in tokens if token not in {"the", "and", "for", "how", "what"}]


def _score_registry_entry(
    question_tokens: list[str],
    question_lower: str,
    entry: ModuleRegistryEntry,
) -> int:
    """Score a registry entry against the current question.

    Args:
        question_tokens: Tokenized question terms.
        question_lower: Raw question lowercased.
        entry: Candidate module registry entry.

    Returns:
        Integer match score.
    """
    score = 0
    routing_tokens = set(entry.keywords)
    routing_tokens.update(_question_tokens(entry.summary))
    for path in entry.top_paths:
        routing_tokens.update(_question_tokens(path.replace("/", " ").replace(".", " ")))

    for token in question_tokens:
        if token in routing_tokens:
            score += 3
        if token in entry.module.lower():
            score += 5
        if any(token in path.lower() for path in entry.top_paths):
            score += 4

    if entry.module.lower() in question_lower:
        score += 8
    return score


def _build_worker_evidence(
    question: str,
    entry: ModuleRegistryEntry,
    document: ModuleFactsDocument,
    refresh_status: RefreshStatus,
) -> WorkerEvidence:
    """Select module claims to answer a question.

    Args:
        question: Natural language question.
        entry: Selected module registry entry.
        document: Module facts document.
        refresh_status: Global refresh status.

    Returns:
        Structured worker evidence payload.
    """
    selected_claims = _select_claims_for_question(question, document)
    claim_ids = [claim.claim_id for claim in selected_claims]
    draft_lines = [claim.statement for claim in selected_claims[:3]]
    module_state = refresh_status.modules.get(entry.module, entry.status)
    return WorkerEvidence(
        module=entry.module,
        draft_answer=" ".join(draft_lines),
        claims_used=claim_ids,
        verification_required=module_state != "success",
    )


def _select_claims_for_question(
    question: str,
    document: ModuleFactsDocument,
) -> list[ModuleClaim]:
    """Pick the most relevant claims for a question.

    Args:
        question: Natural language question.
        document: Module facts document.

    Returns:
        Ordered list of relevant claims.
    """
    question_tokens = set(_question_tokens(question))
    scored: list[tuple[int, ModuleClaim]] = []
    for claim in document.claims:
        score = _score_claim(question_tokens, claim)
        if score <= 0:
            continue
        scored.append((score, claim))

    if not scored:
        fallback = sorted(
            document.claims,
            key=lambda claim: (
                {"high": 0, "medium": 1, "low": 2}.get(claim.importance, 3),
                claim.claim_id,
            ),
        )
        return fallback[:3]

    scored.sort(key=lambda item: (-item[0], item[1].claim_id))
    return [claim for _, claim in scored[:5]]


def _score_claim(question_tokens: set[str], claim: ModuleClaim) -> int:
    """Score one claim for relevance to the question.

    Args:
        question_tokens: Tokenized question terms.
        claim: Candidate module claim.

    Returns:
        Integer relevance score.
    """
    claim_tokens = set(_question_tokens(claim.statement))
    claim_tokens.update(_question_tokens(claim.claim_type.replace("_", " ")))
    for rel_path in claim.source_files:
        claim_tokens.update(_question_tokens(rel_path.replace("/", " ").replace(".", " ")))
    overlap = len(question_tokens & claim_tokens)
    score = overlap * 4
    if claim.importance == "high":
        score += 3
    elif claim.importance == "medium":
        score += 2
    else:
        score += 1
    return score


def _verify_worker_evidence(
    workspace: Path,
    question: str,
    document: ModuleFactsDocument,
    worker_output: WorkerEvidence,
) -> VerificationResult:
    """Verify the worker's selected claims against source evidence.

    Args:
        workspace: Project root directory.
        question: Original user question.
        document: Module facts document.
        worker_output: Structured worker evidence payload.

    Returns:
        Verification report for the selected claims.
    """
    claim_lookup = {claim.claim_id: claim for claim in document.claims}
    verifications: list[ClaimVerification] = []

    for claim_id in worker_output.claims_used[:5]:
        claim = claim_lookup.get(claim_id)
        if claim is None:
            verifications.append(
                ClaimVerification(
                    claim_id=claim_id,
                    state="unverified",
                    notes="Claim was referenced by the worker but not found in module facts.",
                )
            )
            continue

        evidence_results: list[str] = []
        inspected_evidence: list = []
        for evidence in claim.evidence[:2]:
            inspected_evidence.append(evidence)
            file_path = workspace / evidence.file
            if not file_path.is_file():
                evidence_results.append("missing")
                continue
            try:
                lines = file_path.read_text(encoding="utf-8", errors="replace").splitlines()
            except OSError:
                evidence_results.append("missing")
                continue

            snippet = "\n".join(
                lines[evidence.start_line - 1 : min(len(lines), evidence.end_line)]
            ).strip()
            if snippet and evidence.excerpt and snippet == evidence.excerpt.strip():
                evidence_results.append("verified")
            elif snippet:
                evidence_results.append("partial")
            else:
                evidence_results.append("missing")

        if "verified" in evidence_results:
            state = "verified"
            notes = "Evidence excerpt still matches the referenced source lines."
        elif "partial" in evidence_results:
            state = "partially_verified"
            notes = "Source lines were found, but the stored excerpt no longer matches exactly."
        else:
            state = "unverified"
            notes = "Referenced evidence could not be confirmed from current source files."

        verifications.append(
            ClaimVerification(
                claim_id=claim.claim_id,
                state=state,
                notes=notes,
                evidence=inspected_evidence,
            )
        )

    return VerificationResult(
        question=question,
        module=worker_output.module,
        claims=verifications,
        verification_required=worker_output.verification_required,
    )


def _synthesize_structured_answer(
    question: str,
    entries: list[ModuleRegistryEntry],
    documents: dict[str, ModuleFactsDocument],
    worker_outputs: list[WorkerEvidence],
    verification_reports: list[VerificationResult],
) -> str | None:
    """Compose a final answer from verified structured facts.

    Args:
        question: Original user question.
        entries: Routed registry entries.
        documents: Loaded module facts documents by module id.
        worker_outputs: Worker claim selections.
        verification_reports: Verification reports for the selections.

    Returns:
        Final answer string, or ``None`` if no supported claims remain.
    """
    entry_lookup = {entry.module: entry for entry in entries}
    doc_lookup = documents
    verification_lookup = {report.module: report for report in verification_reports}
    worker_lookup = {worker.module: worker for worker in worker_outputs}

    lines: list[str] = []
    verified_count = 0
    partial_count = 0

    for module, report in verification_lookup.items():
        document = doc_lookup.get(module)
        if document is None:
            continue
        claim_lookup = {claim.claim_id: claim for claim in document.claims}
        entry = entry_lookup[module]
        worker_output = worker_lookup[module]
        module_lines: list[str] = []

        if entry.status != "success":
            module_lines.append(f"`{module}` module knowledge is incomplete ({entry.status}).")

        for claim_verification in report.claims:
            claim = claim_lookup.get(claim_verification.claim_id)
            if claim is None:
                continue
            citation = _format_claim_citation(claim_verification)
            if claim_verification.state == "verified":
                verified_count += 1
                module_lines.append(f"- {claim.statement}{citation}")
            elif claim_verification.state == "partially_verified":
                partial_count += 1
                module_lines.append(f"- Possibly: {claim.statement}{citation}")

        if not module_lines and worker_output.draft_answer:
            module_lines.append(worker_output.draft_answer)

        if module_lines:
            lines.append(f"Module `{module}`:")
            lines.extend(module_lines)

    if verified_count == 0 and partial_count == 0:
        return None

    summary = [
        f"Question: {question}",
        "",
        *lines,
        "",
        f"Verification summary: {verified_count} verified, {partial_count} partially verified.",
    ]
    return "\n".join(summary).strip()


def _format_claim_citation(claim_verification: ClaimVerification) -> str:
    """Format the first evidence span for inline answer citations.

    Args:
        claim_verification: Verification result for one claim.

    Returns:
        Short citation string, or an empty string when no evidence exists.
    """
    if not claim_verification.evidence:
        return ""
    evidence = claim_verification.evidence[0]
    return f" ({evidence.file}:{evidence.start_line}-{evidence.end_line})"


# ---------------------------------------------------------------------------
# Context builders
# ---------------------------------------------------------------------------

def _read_context_file(path: Path, label: str) -> str | None:
    """Read a context file and wrap it with a label for prompt injection."""
    if not path.exists() or not path.is_file():
        return None

    try:
        content = path.read_text(encoding="utf-8").strip()
    except OSError:
        return None

    if not content:
        return None

    return f"--- {label} ---\n{content}"


def _build_ask_context(workspace: Path, question: str = "") -> str:
    """Collect project context for Q&A with structure-first priority.

    The ordering has been adjusted so that the most universally useful
    sources (structure map, conventions, knowledge graph) come first,
    while niche indexes (media, data) are loaded only when budget
    remains.  When a *question* is provided, a lightweight keyword
    filter boosts sources whose labels overlap with the query.

    Args:
        workspace: Project root directory.
        question: Optional user question for relevance filtering.

    Returns:
        Concatenated context string.
    """
    context_parts: list[str] = []
    max_chars = int(os.environ.get("AG_ASK_CONTEXT_MAX_CHARS", "30000"))

    # Sources ordered by general usefulness (structure > conventions > graph > docs > data > media)
    prioritized_sources = [
        (
            workspace / ".antigravity" / "structure.md",
            ".antigravity/structure.md",
        ),
        (
            workspace / ".antigravity" / "conventions.md",
            ".antigravity/conventions.md",
        ),
        (
            workspace / ".antigravity" / "knowledge_graph.md",
            ".antigravity/knowledge_graph.md",
        ),
        (workspace / ".antigravity" / "rules.md", ".antigravity/rules.md"),
        (
            workspace / ".antigravity" / "decisions" / "log.md",
            ".antigravity/decisions/log.md",
        ),
        (workspace / "CONTEXT.md", "CONTEXT.md"),
        (workspace / "AGENTS.md", "AGENTS.md"),
        (
            workspace / ".antigravity" / "document_index.md",
            ".antigravity/document_index.md",
        ),
        (
            workspace / ".antigravity" / "data_overview.md",
            ".antigravity/data_overview.md",
        ),
        (
            workspace / ".antigravity" / "media_manifest.md",
            ".antigravity/media_manifest.md",
        ),
    ]

    # Lightweight keyword relevance: if the question mentions "media", "data",
    # "document", etc., boost matching sources to the front.
    if question:
        q_lower = question.lower()
        boost_keywords = {
            "media": "media_manifest",
            "image": "media_manifest",
            "video": "media_manifest",
            "data": "data_overview",
            "csv": "data_overview",
            "json": "data_overview",
            "document": "document_index",
            "doc": "document_index",
            "readme": "document_index",
        }
        boosted: set[str] = set()
        for kw, label_fragment in boost_keywords.items():
            if kw in q_lower:
                boosted.add(label_fragment)
        if boosted:
            top: list[tuple[Path, str]] = []
            rest: list[tuple[Path, str]] = []
            for entry in prioritized_sources:
                if any(b in entry[1] for b in boosted):
                    top.append(entry)
                else:
                    rest.append(entry)
            prioritized_sources = top + rest

    for path, label in prioritized_sources:
        rendered = _read_context_file(path, label)
        if rendered:
            if sum(len(p) for p in context_parts) + len(rendered) > max_chars:
                break
            context_parts.append(rendered)

    memory_dir = workspace / ".antigravity" / "memory"
    if memory_dir.exists():
        for memory_file in sorted(memory_dir.glob("*.md")):
            rendered = _read_context_file(
                memory_file,
                f".antigravity/memory/{memory_file.name}",
            )
            if rendered:
                if sum(len(p) for p in context_parts) + len(rendered) > max_chars:
                    break
                context_parts.append(rendered)

    return "\n\n".join(context_parts) if context_parts else "(no context available)"


def _is_structure_query(question: str) -> bool:
    """Heuristic for topology/structure/dependency style questions."""
    q = question.lower()
    keywords = {
        "依赖", "关系", "调用", "结构", "拓扑", "子图", "知识图谱", "谁调用", "路径",
        "dependency", "dependencies", "relation", "relations", "calls", "called by",
        "graph", "topology", "structure", "ownership", "impact",
    }
    return any(k in q for k in keywords)


def _build_graph_skill_context(workspace: Path, question: str) -> str | None:
    """Invoke Graph Skill and convert output to prompt-ready context block."""
    from antigravity_engine.skills.loader import load_skills

    tools: dict = {}
    load_skills(tools)
    query_graph = tools.get("query_graph")
    if not callable(query_graph):
        return None

    try:
        result = query_graph(question, max_hops=2, workspace=str(workspace))
    except Exception:  # noqa: BLE001
        return None

    max_chars = int(os.environ.get("AG_GRAPH_CONTEXT_MAX_CHARS", "8000"))
    max_chars = max(1000, max_chars)

    if isinstance(result, dict):
        payload = json.dumps(result, ensure_ascii=False, indent=2)
        if len(payload) > max_chars:
            payload = payload[:max_chars] + "\n... [truncated by AG_GRAPH_CONTEXT_MAX_CHARS]"
        return "--- graph_skill_context ---\n" + payload
    return f"--- graph_skill_context ---\n{result}"


# ---------------------------------------------------------------------------
# Retrieval / code-search helpers
# ---------------------------------------------------------------------------

def _iter_python_files(workspace: Path) -> list[Path]:
    """Collect python files under workspace with lightweight skip rules."""
    skip_dirs = SKIP_DIRS | {"data", "logs"}
    files: list[Path] = []
    for dirpath, dirnames, filenames in os.walk(workspace):
        dirnames[:] = [d for d in dirnames if d not in skip_dirs and not d.startswith(".")]
        for fname in filenames:
            if fname.endswith(".py"):
                files.append(Path(dirpath) / fname)
    return files


def _iter_shell_files(workspace: Path) -> list[Path]:
    """Collect shell script files under workspace with lightweight skip rules."""
    skip_dirs = SKIP_DIRS | {"data", "logs"}
    files: list[Path] = []
    for dirpath, dirnames, filenames in os.walk(workspace):
        dirnames[:] = [d for d in dirnames if d not in skip_dirs and not d.startswith(".")]
        for fname in filenames:
            p = Path(dirpath) / fname
            if fname.endswith(".sh"):
                files.append(p)
                continue
            if fname in {"Dockerfile", "Makefile"}:
                continue
            try:
                if p.is_file() and p.read_text(encoding="utf-8", errors="ignore").startswith("#!/usr/bin/env bash"):
                    files.append(p)
            except Exception:
                continue
    return files


def _extract_identifiers(question: str) -> list[str]:
    """Extract candidate symbol identifiers from user question."""
    ids = re.findall(r"\b[A-Za-z_][A-Za-z0-9_]{2,}\b", question)
    seen: set[str] = set()
    out: list[str] = []
    for item in ids:
        if item not in seen:
            seen.add(item)
            out.append(item)
    return out


def _find_function_defs(workspace: Path, identifiers: list[str]) -> list[dict[str, object]]:
    """Find function definitions matching identifiers.

    Results are prioritized: matches in files whose stem contains an
    identifier are ranked first (the actual module, not a wrapper).

    .. deprecated::
        Legacy function using AST parsing. The new ask pipeline uses
        LLM-based analysis via ``agents/*.md`` instead.
    """
    import ast as _ast  # lazy import for legacy path

    targets = {x.lower() for x in identifiers}
    matches: list[dict[str, object]] = []
    for fpath in _iter_python_files(workspace):
        try:
            source = fpath.read_text(encoding="utf-8", errors="replace")
            tree = _ast.parse(source)
            lines = source.splitlines()
        except Exception:
            continue

        rel = str(fpath.relative_to(workspace))
        stem = fpath.stem.lower()
        # Boost: file stem contains one of the target identifiers
        file_match = any(t in stem for t in targets)

        for node in _ast.walk(tree):
            if isinstance(node, (_ast.FunctionDef, _ast.AsyncFunctionDef)):
                name = node.name
                if targets and name.lower() not in targets:
                    continue
                start = int(getattr(node, "lineno", 1))
                end = int(getattr(node, "end_lineno", start))
                snippet = "\n".join(lines[start - 1 : min(end, start + 20)])
                matches.append(
                    {
                        "name": name,
                        "file": rel,
                        "start": start,
                        "end": end,
                        "snippet": snippet,
                        "_file_match": file_match,
                    }
                )

    # Sort: file-name matches first, then by path length (shorter = less nested)
    matches.sort(key=lambda m: (not m.get("_file_match", False), len(str(m.get("file", "")))))
    # Clean internal key before returning
    for m in matches:
        m.pop("_file_match", None)
    return matches[:6]


def _find_call_sites(workspace: Path, func_name: str, limit: int = 12) -> list[str]:
    """Find call sites for a function name."""
    pattern = re.compile(rf"\b{re.escape(func_name)}\s*\(")
    calls: list[str] = []
    for fpath in _iter_python_files(workspace):
        try:
            rel = fpath.relative_to(workspace)
            lines = fpath.read_text(encoding="utf-8", errors="replace").splitlines()
        except Exception:
            continue
        for i, line in enumerate(lines, start=1):
            if pattern.search(line) and not line.lstrip().startswith("def "):
                calls.append(f"{rel}:{i}: {line.strip()}")
                if len(calls) >= limit:
                    return calls
    return calls


def _find_shell_function_defs(workspace: Path, identifiers: list[str]) -> list[dict[str, object]]:
    """Find shell function definitions matching identifiers."""
    targets = {x.lower() for x in identifiers}
    matches: list[dict[str, object]] = []
    def_pattern = re.compile(r"^\s*(?:function\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\(\)\s*\{")

    for fpath in _iter_shell_files(workspace):
        try:
            rel = fpath.relative_to(workspace)
            lines = fpath.read_text(encoding="utf-8", errors="replace").splitlines()
        except Exception:
            continue

        i = 0
        while i < len(lines):
            line = lines[i]
            m = def_pattern.match(line)
            if not m:
                i += 1
                continue

            name = m.group(1)
            if targets and name.lower() not in targets:
                i += 1
                continue

            start = i + 1
            brace_balance = line.count("{") - line.count("}")
            j = i + 1
            while j < len(lines) and brace_balance > 0:
                brace_balance += lines[j].count("{") - lines[j].count("}")
                j += 1
            end = j if j > start else start
            snippet = "\n".join(lines[start - 1 : min(end, start + 25)])
            matches.append(
                {
                    "name": name,
                    "file": str(rel),
                    "start": start,
                    "end": end,
                    "snippet": snippet,
                }
            )
            i = j
            if len(matches) >= 6:
                return matches
    return matches


def _find_shell_call_sites(workspace: Path, func_name: str, limit: int = 12) -> list[str]:
    """Find shell call sites for a function name."""
    call_pattern = re.compile(rf"\b{re.escape(func_name)}\b")
    def_pattern = re.compile(r"^\s*(?:function\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\(\)\s*\{")
    calls: list[str] = []
    for fpath in _iter_shell_files(workspace):
        try:
            rel = fpath.relative_to(workspace)
            lines = fpath.read_text(encoding="utf-8", errors="replace").splitlines()
        except Exception:
            continue
        for i, line in enumerate(lines, start=1):
            if not call_pattern.search(line):
                continue
            if def_pattern.match(line):
                continue
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            calls.append(f"{rel}:{i}: {stripped}")
            if len(calls) >= limit:
                return calls
    return calls


def _extract_blueprints_from_app(workspace: Path) -> list[str]:
    """Extract blueprint modules from backend app factory registration."""
    app_path = workspace / "backend" / "app.py"
    if not app_path.is_file():
        return []
    try:
        text = app_path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return []
    mods = re.findall(r'"backend\.blueprints\.([a-zA-Z0-9_]+)"', text)
    return mods


def _build_retrieval_semantic_answer(workspace: Path, question: str) -> str | None:
    """Build a semantic answer from retrieval artifacts and code evidence."""
    q = question.strip()
    if not q:
        return None

    lines: list[str] = []
    scan_report = workspace / ".antigravity" / "scan_report.json"
    if scan_report.is_file():
        try:
            payload = json.loads(scan_report.read_text(encoding="utf-8"))
            lines.append(
                "[retrieval] "
                f"files={payload.get('file_count', 0)}, "
                f"elapsed={payload.get('scan_elapsed_seconds', 0.0)}s"
            )
        except Exception:
            pass

    if ("blueprint" in q.lower()) or ("模块" in q and "注册" in q):
        bps = _extract_blueprints_from_app(workspace)
        if bps:
            lines.append("后端注册的 blueprint 模块:")
            lines.extend([f"- {m}" for m in bps])
            lines.append("证据: backend/app.py")
            return "\n".join(lines)

    identifiers = _extract_identifiers(q)
    if not identifiers and ("函数" not in q and "调用" not in q and "function" not in q.lower()):
        return None

    py_defs = _find_function_defs(workspace, identifiers)
    sh_defs = _find_shell_function_defs(workspace, identifiers)
    if not py_defs and not sh_defs:
        return None

    lines.append("基于检索到的函数实现与调用关系:")
    for item in py_defs[:3]:
        name = str(item["name"])
        file = str(item["file"])
        start = int(item["start"])
        lines.append(f"- 函数 {name} 定义于 {file}:{start}")
        snippet = str(item.get("snippet", "")).strip()
        if snippet:
            lines.append("```python")
            lines.append(snippet)
            lines.append("```")
        calls = _find_call_sites(workspace, name, limit=8)
        if calls:
            lines.append("  相关调用:")
            lines.extend([f"  - {c}" for c in calls])

    for item in sh_defs[:3]:
        name = str(item["name"])
        file = str(item["file"])
        start = int(item["start"])
        lines.append(f"- Shell 函数 {name} 定义于 {file}:{start}")
        snippet = str(item.get("snippet", "")).strip()
        if snippet:
            lines.append("```bash")
            lines.append(snippet)
            lines.append("```")
        calls = _find_shell_call_sites(workspace, name, limit=8)
        if calls:
            lines.append("  相关调用:")
            lines.extend([f"  - {c}" for c in calls])

    return "\n".join(lines)


def _build_timeout_fallback_answer(workspace: Path, question: str) -> str:
    """Return relevant knowledge snippets when ask agent times out."""
    ag_dir = workspace / ".antigravity"
    q_lower = question.lower()
    keywords = [w for w in re.split(r"\W+", q_lower) if len(w) > 2]

    lines: list[str] = [
        "LLM answering timed out. Here are the most relevant knowledge snippets:\n",
        f"**Question:** {question}\n",
    ]

    # -- Extract relevant sections from conventions.md --
    conventions = ag_dir / "conventions.md"
    if conventions.exists():
        try:
            text = conventions.read_text(encoding="utf-8")
            relevant = _extract_relevant_sections(text, keywords, max_chars=6000)
            if relevant:
                lines.append("## Project Conventions (relevant excerpts)\n")
                lines.append(relevant)
                lines.append("")
        except Exception:
            pass

    # -- Extract relevant sections from structure.md --
    structure = ag_dir / "structure.md"
    if structure.exists():
        try:
            text = structure.read_text(encoding="utf-8")
            relevant = _extract_relevant_sections(text, keywords, max_chars=8000)
            if relevant:
                lines.append("## Code Structure (relevant excerpts)\n")
                lines.append(relevant)
                lines.append("")
        except Exception:
            pass

    # -- Extract from knowledge_graph.md --
    kg = ag_dir / "knowledge_graph.md"
    if kg.exists():
        try:
            text = kg.read_text(encoding="utf-8")
            relevant = _extract_relevant_sections(text, keywords, max_chars=3000)
            if relevant:
                lines.append("## Knowledge Graph (relevant excerpts)\n")
                lines.append(relevant)
                lines.append("")
        except Exception:
            pass

    # -- Fallback: scan report summary --
    scan_report = ag_dir / "scan_report.json"
    if scan_report.exists() and len(lines) <= 4:
        try:
            payload = json.loads(scan_report.read_text(encoding="utf-8"))
            file_count = int(payload.get("file_count", 0)) if isinstance(payload, dict) else 0
            lines.append(f"*(Project has {file_count} files. Try rephrasing with a more specific question.)*")
        except Exception:
            pass

    if len(lines) <= 4:
        lines.append("No relevant knowledge found. Try running `ag refresh` to rebuild the knowledge base.")

    return "\n".join(lines)


def _extract_relevant_sections(text: str, keywords: list[str], max_chars: int = 6000) -> str:
    """Extract sections from markdown text that match keywords."""
    if not keywords:
        return text[:max_chars]

    sections = re.split(r"(?=^#{1,3}\s)", text, flags=re.MULTILINE)
    scored: list[tuple[int, str]] = []
    for section in sections:
        section_lower = section.lower()
        score = sum(1 for kw in keywords if kw in section_lower)
        if score > 0:
            scored.append((score, section.strip()))

    scored.sort(key=lambda x: x[0], reverse=True)

    result: list[str] = []
    total = 0
    for _score, section in scored:
        if total + len(section) > max_chars:
            remaining = max_chars - total
            if remaining > 200:
                result.append(section[:remaining] + "\n...")
            break
        result.append(section)
        total += len(section)

    return "\n\n".join(result)
