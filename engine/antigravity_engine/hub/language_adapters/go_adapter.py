"""Go semantic adapter for hub knowledge graph and grouping."""
from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path

from antigravity_engine.hub.language_adapters.base import FileSemantics, SymbolDef


_PACKAGE_RE = re.compile(r"^\s*package\s+([A-Za-z_][A-Za-z0-9_]*)\s*$", re.MULTILINE)
_IMPORT_SINGLE_RE = re.compile(r'^\s*import\s+(?:[A-Za-z_][A-Za-z0-9_]*\s+)?(?:"([^"]+)")', re.MULTILINE)
_IMPORT_BLOCK_START_RE = re.compile(r"^\s*import\s*\(\s*$")
_FUNC_RE = re.compile(
    r"^func\s*(?:\((?P<receiver>[^)]+)\)\s*)?(?P<name>[A-Za-z_][A-Za-z0-9_]*)\s*\(",
)
_TYPE_RE = re.compile(
    r"^type\s+(?P<name>[A-Za-z_][A-Za-z0-9_]*)\s+(?P<kind>struct|interface)\b",
)
_TYPE_FALLBACK_RE = re.compile(r"^type\s+(?P<name>[A-Za-z_][A-Za-z0-9_]*)\b")


class GoLanguageAdapter:
    """Analyze Go files with a lightweight repo-friendly parser."""

    name = "go"
    supported_suffixes: frozenset[str] = frozenset({".go"})

    def analyze(
        self,
        workspace: Path,
        abs_path: Path,
        rel_path: str,
        content: str,
    ) -> FileSemantics:
        """Analyze a Go file into language-neutral semantics.

        Args:
            workspace: Workspace root directory.
            abs_path: Absolute file path.
            rel_path: Workspace-relative file path.
            content: Decoded file contents.

        Returns:
            Extracted Go file semantics.
        """
        package_name = self._package_name(content)
        package_identity = self._package_identity(workspace, abs_path, rel_path)
        imports = self._extract_imports(content)
        symbols = self._extract_symbols(content, package_name)
        entrypoints = [symbol.name for symbol in symbols if symbol.is_entrypoint]
        is_test_file = rel_path.endswith("_test.go")
        signature_summary = self._build_signature_summary(
            rel_path=rel_path,
            package_name=package_name,
            package_identity=package_identity,
            imports=imports,
            symbols=symbols,
            is_test_file=is_test_file,
        )

        provided_modules = [package_identity]
        rel_dir = Path(rel_path).parent.as_posix()
        if rel_dir and rel_dir != ".":
            provided_modules.append(rel_dir)

        return FileSemantics(
            rel_path=rel_path,
            language="Go",
            adapter_name=self.name,
            package_name=package_name,
            package_identity=package_identity,
            module_name=package_identity,
            provided_modules=self._dedupe(provided_modules),
            imports=imports,
            symbols=symbols,
            entrypoints=entrypoints,
            is_test_file=is_test_file,
            test_targets=[package_identity] if is_test_file else [],
            signature_summary=signature_summary,
        )

    def _package_name(self, content: str) -> str | None:
        """Extract the declared Go package name."""
        match = _PACKAGE_RE.search(content)
        return match.group(1) if match else None

    def _extract_imports(self, content: str) -> list[str]:
        """Extract imported package paths from single and block imports."""
        imports: list[str] = []
        lines = content.splitlines()
        in_block = False
        for line in lines:
            if in_block:
                stripped = line.strip()
                if stripped == ")":
                    in_block = False
                    continue
                if not stripped or stripped.startswith("//"):
                    continue
                match = re.search(r'"([^"]+)"', stripped)
                if match:
                    imports.append(match.group(1))
                continue

            block_match = _IMPORT_BLOCK_START_RE.match(line)
            if block_match:
                in_block = True
                continue

            single_match = _IMPORT_SINGLE_RE.match(line)
            if single_match:
                imports.append(single_match.group(1))

        return self._dedupe(imports)

    def _extract_symbols(
        self,
        content: str,
        package_name: str | None,
    ) -> list[SymbolDef]:
        """Extract top-level funcs, methods, and type declarations."""
        symbols: list[SymbolDef] = []
        lines = content.splitlines()

        for index, line in enumerate(lines):
            stripped = line.strip()
            if not stripped or stripped.startswith("//"):
                continue

            if not stripped.startswith(("func ", "type ")):
                continue

            declaration = self._collect_declaration(lines, index)
            if declaration.startswith("func "):
                func_match = _FUNC_RE.match(self._normalize_spaces(declaration))
                if not func_match:
                    continue
                receiver = func_match.group("receiver")
                name = func_match.group("name")
                receiver_type = self._receiver_type(receiver) if receiver else None
                is_entrypoint = name in {"main", "init"} and (
                    name == "init" or package_name == "main"
                )
                kind = "method" if receiver else "function"
                qualified_name = name if not receiver_type else f"{receiver_type}.{name}"
                symbols.append(
                    SymbolDef(
                        name=name,
                        kind=kind,
                        qualified_name=qualified_name,
                        line=index + 1,
                        signature=declaration.strip(),
                        receiver=receiver_type,
                        is_entrypoint=is_entrypoint,
                    )
                )
                continue

            type_match = _TYPE_RE.match(self._normalize_spaces(declaration))
            if type_match:
                symbols.append(
                    SymbolDef(
                        name=type_match.group("name"),
                        kind=type_match.group("kind"),
                        qualified_name=type_match.group("name"),
                        line=index + 1,
                        signature=declaration.strip(),
                    )
                )
                continue

            fallback_match = _TYPE_FALLBACK_RE.match(self._normalize_spaces(declaration))
            if fallback_match:
                symbols.append(
                    SymbolDef(
                        name=fallback_match.group("name"),
                        kind="type",
                        qualified_name=fallback_match.group("name"),
                        line=index + 1,
                        signature=declaration.strip(),
                    )
                )

        return symbols

    def _build_signature_summary(
        self,
        rel_path: str,
        package_name: str | None,
        package_identity: str,
        imports: list[str],
        symbols: list[SymbolDef],
        is_test_file: bool,
    ) -> str:
        """Build a Go-oriented signature summary for hub split context."""
        lines = [f"# Signatures from {rel_path}"]
        if package_name:
            lines.append(f"package {package_name}")
        lines.append(f"# package_identity: {package_identity}")
        if is_test_file:
            lines.append("# test_file: true")
        if imports:
            lines.append("")
            lines.append("## Imports")
            for imported in imports:
                lines.append(f'- "{imported}"')

        buckets = {
            "type": [],
            "struct": [],
            "interface": [],
            "function": [],
            "method": [],
        }
        entrypoints: list[str] = []
        for symbol in symbols:
            buckets.setdefault(symbol.kind, []).append(symbol.signature or symbol.name)
            if symbol.is_entrypoint:
                entrypoints.append(symbol.name)

        if entrypoints:
            lines.append("")
            lines.append("## Entrypoints")
            for entrypoint in entrypoints:
                lines.append(f"- {entrypoint}")

        for heading, key in (
            ("Structs", "struct"),
            ("Interfaces", "interface"),
            ("Types", "type"),
            ("Functions", "function"),
            ("Methods", "method"),
        ):
            values = buckets.get(key, [])
            if not values:
                continue
            lines.append("")
            lines.append(f"## {heading}")
            for value in values:
                lines.append(f"- {value}")

        return "\n".join(lines)

    def _collect_declaration(self, lines: list[str], start_index: int) -> str:
        """Collect a multi-line Go declaration until the signature closes."""
        collected: list[str] = []
        paren_depth = 0
        brace_depth = 0
        for index in range(start_index, len(lines)):
            line = lines[index].rstrip()
            collected.append(line)
            paren_depth += line.count("(") - line.count(")")
            brace_depth += line.count("{") - line.count("}")
            if brace_depth > 0 and paren_depth <= 0:
                break
            if paren_depth <= 0 and line.strip().endswith(")"):
                break
            if paren_depth <= 0 and line.strip().endswith("{"):
                break
        return "\n".join(collected)

    def _receiver_type(self, receiver: str) -> str:
        """Extract the receiver type name from a Go method receiver."""
        pieces = receiver.split()
        type_part = pieces[-1] if pieces else receiver
        normalized = type_part.lstrip("*")
        return normalized.split("[", 1)[0]

    def _package_identity(self, workspace: Path, abs_path: Path, rel_path: str) -> str:
        """Resolve the import-style package identity for a Go file."""
        module_path, module_root = self._find_go_module(workspace, abs_path)
        if module_root is not None:
            rel_dir = abs_path.parent.relative_to(module_root).as_posix()
        else:
            rel_dir = Path(rel_path).parent.as_posix()
        if rel_dir in {"", "."}:
            return module_path or f"go:{Path(rel_path).stem}"
        if module_path:
            return f"{module_path}/{rel_dir}"
        return f"go:{rel_dir}"

    @lru_cache(maxsize=64)
    def _find_go_module(self, workspace: Path, abs_path: Path) -> tuple[str | None, Path | None]:
        """Find the nearest Go module path and module root for a file."""
        current = abs_path.parent
        workspace_resolved = workspace.resolve()
        while True:
            go_mod = current / "go.mod"
            if go_mod.is_file():
                try:
                    for line in go_mod.read_text(encoding="utf-8").splitlines():
                        stripped = line.strip()
                        if stripped.startswith("module "):
                            return stripped.split(None, 1)[1].strip(), current
                except OSError:
                    return None, None
            if current == workspace_resolved or current.parent == current:
                return None, None
            current = current.parent

    def _normalize_spaces(self, text: str) -> str:
        """Normalize whitespace for declaration parsing."""
        return " ".join(text.split())

    def _dedupe(self, values: list[str]) -> list[str]:
        """Deduplicate strings while preserving order."""
        seen: set[str] = set()
        result: list[str] = []
        for value in values:
            if not value or value in seen:
                continue
            seen.add(value)
            result.append(value)
        return result
