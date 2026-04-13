"""Shared semantic models and adapter protocol for hub language analysis."""
from __future__ import annotations

from pathlib import Path
from typing import Protocol

from pydantic import BaseModel, Field


class SymbolDef(BaseModel):
    """Language-neutral description of a symbol definition.

    Args:
        name: Short symbol name.
        kind: Symbol kind such as ``function`` or ``struct``.
        qualified_name: Qualified name when the language exposes one.
        line: 1-based definition line when known.
        signature: Compact declaration summary.
        receiver: Receiver or owning type for methods when applicable.
        bases: Base types or interfaces when known.
        is_entrypoint: Whether this symbol is an execution entrypoint.
    """

    name: str = Field(description="Short symbol name.")
    kind: str = Field(description="Language-neutral symbol kind.")
    qualified_name: str | None = Field(
        default=None,
        description="Qualified symbol name when available.",
    )
    line: int | None = Field(
        default=None,
        ge=1,
        description="1-based definition line when known.",
    )
    signature: str | None = Field(
        default=None,
        description="Compact declaration summary.",
    )
    receiver: str | None = Field(
        default=None,
        description="Owning type for a method when applicable.",
    )
    bases: list[str] = Field(
        default_factory=list,
        description="Base types or implemented interfaces when known.",
    )
    is_entrypoint: bool = Field(
        default=False,
        description="Whether this symbol is a known execution entrypoint.",
    )


class SignatureSummary(BaseModel):
    """Compact signature-oriented summary for hub splitting context.

    Args:
        rel_path: Workspace-relative file path.
        content: Summary content suitable for sibling-agent context.
    """

    rel_path: str = Field(description="Workspace-relative file path.")
    content: str = Field(description="Compact signature-oriented summary text.")


class SemanticEdge(BaseModel):
    """Language-neutral semantic relation for graph construction.

    Args:
        source: Source graph node identifier.
        target: Target graph node identifier.
        edge_type: Semantic relation type.
    """

    source: str = Field(description="Source graph node identifier.")
    target: str = Field(description="Target graph node identifier.")
    edge_type: str = Field(description="Semantic relation type.")


class FileSemantics(BaseModel):
    """Semantic summary for one source file.

    Args:
        rel_path: Workspace-relative file path.
        language: Human-readable language label.
        adapter_name: Adapter that produced the semantics.
        package_name: Language-level package/namespace label when known.
        package_identity: Shared dependency identity used for grouping.
        module_name: Primary per-file module identity when known.
        provided_modules: Import keys that this file/package satisfies.
        imports: Imported dependency identities.
        symbols: Top-level symbol definitions.
        entrypoints: Entry symbols detected for the file.
        is_test_file: Whether the file is a test file.
        test_targets: Package/module identities covered by the test.
        signature_summary: Compact signature-oriented text summary.
        parse_error: Non-fatal parse failure details when analysis degrades.
    """

    rel_path: str = Field(description="Workspace-relative file path.")
    language: str = Field(description="Human-readable language label.")
    adapter_name: str = Field(description="Adapter that produced the semantics.")
    package_name: str | None = Field(
        default=None,
        description="Language-level package/namespace name when known.",
    )
    package_identity: str | None = Field(
        default=None,
        description="Shared dependency identity used for grouping related files.",
    )
    module_name: str | None = Field(
        default=None,
        description="Primary per-file module identity when known.",
    )
    provided_modules: list[str] = Field(
        default_factory=list,
        description="Import keys that this file or package satisfies.",
    )
    imports: list[str] = Field(
        default_factory=list,
        description="Imported dependency identities.",
    )
    symbols: list[SymbolDef] = Field(
        default_factory=list,
        description="Top-level symbol definitions extracted from the file.",
    )
    entrypoints: list[str] = Field(
        default_factory=list,
        description="Entry symbols detected for the file.",
    )
    is_test_file: bool = Field(
        default=False,
        description="Whether the file is a test file.",
    )
    test_targets: list[str] = Field(
        default_factory=list,
        description="Package or module identities covered by the test.",
    )
    signature_summary: str = Field(
        default="",
        description="Compact signature-oriented summary text.",
    )
    parse_error: str | None = Field(
        default=None,
        description="Non-fatal parse failure details when analysis degrades.",
    )


class LanguageAdapter(Protocol):
    """Protocol implemented by semantic language adapters."""

    name: str
    supported_suffixes: frozenset[str]

    def analyze(
        self,
        workspace: Path,
        abs_path: Path,
        rel_path: str,
        content: str,
    ) -> FileSemantics:
        """Analyze one source file and return language-neutral semantics.

        Args:
            workspace: Workspace root directory.
            abs_path: Absolute file path.
            rel_path: Workspace-relative file path.
            content: Decoded file contents.

        Returns:
            Extracted file semantics. Adapters should degrade gracefully.
        """

