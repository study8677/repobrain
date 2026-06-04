"""Regression tests for fallback-knowledge detection on the ask path.

When a module's LLM analysis fails during refresh, ``_build_agent_md_fallback``
writes a bare file listing instead of real knowledge. The ask path must detect
these degraded docs so they are never silently presented as factual, grounded
answers. These tests pin that contract.
"""

from __future__ import annotations

import types

from antigravity_engine.hub._constants import (
    AGENT_MD_FALLBACK_MARKER,
    AGENT_MD_FALLBACK_SENTINEL,
)
from antigravity_engine.hub.ask_pipeline import (
    _is_fallback_doc,
    _prepend_degradation_banner,
)
from antigravity_engine.hub.refresh_pipeline import _build_agent_md_fallback


def _stub_group() -> types.SimpleNamespace:
    source_file = types.SimpleNamespace(
        content="line1\nline2\n", rel_path="pkg/mod.py", language="Python"
    )
    return types.SimpleNamespace(files=[source_file])


def test_fallback_doc_is_marked_and_detected() -> None:
    md = _build_agent_md_fallback("modA", "g0", _stub_group())
    assert AGENT_MD_FALLBACK_MARKER in md
    assert AGENT_MD_FALLBACK_SENTINEL in md
    assert _is_fallback_doc(md) is True


def test_real_doc_not_detected_as_fallback() -> None:
    real = "# Module: auth\n\nHandles authentication via JWT, see `auth.py:42`.\n"
    assert _is_fallback_doc(real) is False


def test_legacy_sentinel_only_doc_is_detected() -> None:
    # Fallback docs generated before the marker existed still carry the sentinel.
    legacy = f"# Module: x\n\n{AGENT_MD_FALLBACK_SENTINEL}\n"
    assert _is_fallback_doc(legacy) is True


def test_degradation_banner_only_when_degraded() -> None:
    assert _prepend_degradation_banner("answer", []) == "answer"
    assert _prepend_degradation_banner(None, ["m"]) is None
    out = _prepend_degradation_banner("answer", ["modA"])
    assert out is not None
    assert out.startswith(">")
    assert "modA" in out
    assert out.endswith("answer")
