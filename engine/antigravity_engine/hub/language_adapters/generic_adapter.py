"""Graceful fallback semantic adapter for unsupported languages."""
from __future__ import annotations

from pathlib import Path

from antigravity_engine.hub._constants import LANG_MAP
from antigravity_engine.hub.language_adapters.base import FileSemantics


class GenericLanguageAdapter:
    """Best-effort semantic adapter used when no specific parser exists."""

    name = "generic"
    supported_suffixes: frozenset[str] = frozenset()

    def analyze(
        self,
        workspace: Path,
        abs_path: Path,
        rel_path: str,
        content: str,
    ) -> FileSemantics:
        """Return graceful fallback semantics for unsupported languages.

        Args:
            workspace: Workspace root directory.
            abs_path: Absolute file path.
            rel_path: Workspace-relative file path.
            content: Decoded file contents.

        Returns:
            Minimal file semantics that never raise.
        """
        del workspace
        language = LANG_MAP.get(abs_path.suffix.lower(), "Unknown")
        rel_no_ext = rel_path.rsplit(".", 1)[0]
        package_identity = rel_no_ext.replace("/", ".").replace("\\", ".")
        signature_summary = self._build_signature_summary(rel_path, language, content)

        return FileSemantics(
            rel_path=rel_path,
            language=language,
            adapter_name=self.name,
            package_name=None,
            package_identity=package_identity,
            module_name=package_identity,
            provided_modules=[],
            imports=[],
            symbols=[],
            entrypoints=[],
            is_test_file=self._is_test_file(abs_path.name),
            test_targets=[],
            signature_summary=signature_summary,
        )

    def _build_signature_summary(
        self,
        rel_path: str,
        language: str,
        content: str,
    ) -> str:
        """Build a compact fallback summary from the first non-empty lines."""
        lines = [line.rstrip() for line in content.splitlines() if line.strip()]
        preview = "\n".join(lines[:20])
        header = f"# Summary from {rel_path}\n# language: {language}\n"
        return f"{header}\n{preview}".strip()

    def _is_test_file(self, filename: str) -> bool:
        """Detect likely test files for unsupported languages."""
        lower = filename.lower()
        return (
            lower.startswith("test_")
            or lower.endswith("_test")
            or ".test." in lower
            or ".spec." in lower
        )

