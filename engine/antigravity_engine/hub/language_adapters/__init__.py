"""Language adapter registry for shared semantic analysis."""
from __future__ import annotations

from pathlib import Path

from antigravity_engine.hub.language_adapters.base import (
    FileSemantics,
    LanguageAdapter,
    SemanticEdge,
    SignatureSummary,
    SymbolDef,
)
from antigravity_engine.hub.language_adapters.generic_adapter import GenericLanguageAdapter
from antigravity_engine.hub.language_adapters.go_adapter import GoLanguageAdapter
from antigravity_engine.hub.language_adapters.python_adapter import PythonLanguageAdapter


_GENERIC_ADAPTER = GenericLanguageAdapter()
_ADAPTERS: tuple[LanguageAdapter, ...] = (
    PythonLanguageAdapter(),
    GoLanguageAdapter(),
)
_ADAPTER_BY_SUFFIX = {
    suffix: adapter
    for adapter in _ADAPTERS
    for suffix in adapter.supported_suffixes
}


def get_language_adapter(path: Path) -> LanguageAdapter:
    """Return the registered adapter for a source file path.

    Args:
        path: Source file path.

    Returns:
        Registered adapter for the file suffix, or the generic fallback.
    """
    return _ADAPTER_BY_SUFFIX.get(path.suffix.lower(), _GENERIC_ADAPTER)


__all__ = [
    "FileSemantics",
    "LanguageAdapter",
    "SemanticEdge",
    "SignatureSummary",
    "SymbolDef",
    "get_language_adapter",
]

