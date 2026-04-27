"""Hub pipelines — refresh and ask.

This module is a backward-compatible re-export shim.  The actual
implementations now live in:

- :mod:`antigravity_engine.hub.refresh_pipeline`
- :mod:`antigravity_engine.hub.ask_pipeline`

All public symbols are re-exported so that existing ``from
antigravity_engine.hub.pipeline import ...`` statements continue
to work without changes.
"""
from __future__ import annotations

# Re-export everything from the split modules.
from antigravity_engine.hub.refresh_pipeline import (  # noqa: F401
    refresh_pipeline,
    prepare_refresh_project,
    submit_refresh_result,
    finalize_refresh_project,
    _format_scan_report,
    _get_head_sha,
    _build_non_code_indexes,
    _build_scan_payload,
    _build_fallback_conventions,
)

from antigravity_engine.hub.ask_pipeline import (  # noqa: F401
    ask_pipeline,
    ensure_fresh_project_knowledge,
    _project_knowledge_refresh_plan,
    _read_context_file,
    _build_ask_context,
    _is_structure_query,
    _build_graph_skill_context,
    _build_retrieval_semantic_answer,
    _build_timeout_fallback_answer,
    _iter_python_files,
    _iter_shell_files,
    _extract_identifiers,
    _find_function_defs,
    _find_call_sites,
    _find_shell_function_defs,
    _find_shell_call_sites,
    _extract_blueprints_from_app,
)

from antigravity_engine.hub.host_llm import (  # noqa: F401
    HostLlmRequest,
    HostLlmResponse,
    HostLlmUnavailable,
    set_host_llm_capability,
    has_host_llm_capability,
)
