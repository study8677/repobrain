"""TypeScript and JavaScript semantic adapter for hub graphing and grouping."""
from __future__ import annotations

import posixpath
import re
from dataclasses import dataclass
from pathlib import Path

from antigravity_engine.hub.language_adapters.base import FileSemantics, SymbolDef


_IMPORT_FROM_RE = re.compile(
    r"\bimport\s+(?:type\s+)?(?:[^;'\"`]|\"[^\"]*\"|'[^']*'|`[^`]*`)*?"
    r"\s+from\s*['\"]([^'\"]+)['\"]",
    re.MULTILINE,
)
_IMPORT_SIDE_EFFECT_RE = re.compile(
    r"^\s*import\s*['\"]([^'\"]+)['\"]",
    re.MULTILINE,
)
_DYNAMIC_IMPORT_RE = re.compile(r"\bimport\s*\(\s*['\"]([^'\"]+)['\"]\s*\)")
_REQUIRE_RE = re.compile(r"\brequire\s*\(\s*['\"]([^'\"]+)['\"]\s*\)")
_EXPORT_FROM_RE = re.compile(
    r"\bexport\s+(?:type\s+)?(?:[^;'\"`]|\"[^\"]*\"|'[^']*'|`[^`]*`)*?"
    r"\s+from\s*['\"]([^'\"]+)['\"]",
    re.MULTILINE,
)
_IDENTIFIER_RE = r"[A-Za-z_$][A-Za-z0-9_$]*"
_TEST_FILE_RE = re.compile(r"\.(?:test|spec)\.(?:ts|tsx|js|jsx)$")
_MODULE_SUFFIXES = (".tsx", ".ts", ".jsx", ".js", ".mjs", ".cjs")
_LANGUAGE_BY_SUFFIX = {
    ".ts": "TypeScript",
    ".tsx": "TypeScript (React)",
    ".js": "JavaScript",
    ".jsx": "JavaScript (React)",
}


@dataclass(frozen=True)
class _ImportRef:
    """Normalized import reference plus whether it came from a relative spec."""

    raw: str
    normalized: str
    is_relative: bool


class TypeScriptLanguageAdapter:
    """Analyze TS/JS files with a lightweight deterministic parser."""

    name = "typescript"
    supported_suffixes: frozenset[str] = frozenset({".ts", ".tsx", ".js", ".jsx"})

    def analyze(
        self,
        workspace: Path,
        abs_path: Path,
        rel_path: str,
        content: str,
    ) -> FileSemantics:
        """Analyze a TypeScript or JavaScript file into shared semantics.

        Args:
            workspace: Workspace root directory.
            abs_path: Absolute file path.
            rel_path: Workspace-relative path.
            content: Decoded file contents.

        Returns:
            Extracted TS/JS semantics for graph construction and grouping.
        """
        del workspace
        language = _LANGUAGE_BY_SUFFIX.get(abs_path.suffix.lower(), "JavaScript")
        module_name = self._module_name(rel_path)
        package_name = self._package_name(rel_path)
        provided_modules = self._provided_modules(module_name)
        import_refs = self._extract_import_refs(content, rel_path)
        imports = self._dedupe([ref.normalized for ref in import_refs])
        symbols = self._extract_symbols(content)
        entrypoints = [symbol.name for symbol in symbols if symbol.is_entrypoint]
        is_test_file = self._is_test_file(rel_path)
        test_targets = self._test_targets(rel_path, import_refs) if is_test_file else []
        signature_summary = self._build_signature_summary(
            rel_path=rel_path,
            module_name=module_name,
            package_name=package_name,
            imports=imports,
            symbols=symbols,
            is_test_file=is_test_file,
        )

        return FileSemantics(
            rel_path=rel_path,
            language=language,
            adapter_name=self.name,
            package_name=package_name,
            package_identity=module_name,
            module_name=module_name,
            provided_modules=provided_modules,
            imports=imports,
            symbols=symbols,
            entrypoints=entrypoints,
            is_test_file=is_test_file,
            test_targets=test_targets,
            signature_summary=signature_summary,
        )

    def _extract_import_refs(self, content: str, rel_path: str) -> list[_ImportRef]:
        """Extract ES module, dynamic import, require, and re-export specs."""
        searchable = self._strip_comments(content)
        code_mask = self._mask_non_code(content)
        matches: list[tuple[int, str]] = []
        for pattern in (
            _IMPORT_FROM_RE,
            _IMPORT_SIDE_EFFECT_RE,
            _DYNAMIC_IMPORT_RE,
            _REQUIRE_RE,
            _EXPORT_FROM_RE,
        ):
            for match in pattern.finditer(searchable):
                if not self._match_starts_in_code(code_mask, match.start()):
                    continue
                matches.append((match.start(), match.group(1)))

        refs: list[_ImportRef] = []
        for _, raw in sorted(matches, key=lambda item: item[0]):
            normalized = self._normalize_import(raw, rel_path)
            refs.append(
                _ImportRef(
                    raw=raw,
                    normalized=normalized,
                    is_relative=raw.startswith("."),
                )
            )
        return self._dedupe_import_refs(refs)

    def _extract_symbols(self, content: str) -> list[SymbolDef]:
        """Extract top-level TS/JS declarations without a full parser."""
        symbols: list[SymbolDef] = []
        lines = content.splitlines()
        masked_lines = self._mask_non_code(content).splitlines()
        brace_depth = 0
        has_main_guard = self._has_main_guard(content)

        for index, masked_line in enumerate(masked_lines):
            original = lines[index] if index < len(lines) else ""
            stripped = original.strip()
            depth_before = brace_depth

            if depth_before == 0 and stripped and not stripped.startswith(("//", "*")):
                declaration = self._collect_declaration(lines, index)
                symbol = self._parse_top_level_symbol(
                    declaration=declaration,
                    line=index + 1,
                    has_main_guard=has_main_guard,
                )
                if symbol is not None:
                    symbols.extend(symbol)

            brace_depth = max(
                0,
                brace_depth + masked_line.count("{") - masked_line.count("}"),
            )

        return symbols

    def _parse_top_level_symbol(
        self,
        *,
        declaration: str,
        line: int,
        has_main_guard: bool,
    ) -> list[SymbolDef] | None:
        """Parse a single top-level declaration into zero or more symbols."""
        signature = declaration.strip()
        normalized = self._normalize_spaces(signature)
        if not normalized:
            return None

        subject, exported = self._strip_modifiers(normalized)

        if subject.startswith("const enum "):
            enum_match = re.match(rf"const\s+enum\s+(?P<name>{_IDENTIFIER_RE})\b", subject)
            if enum_match:
                return [
                    SymbolDef(
                        name=enum_match.group("name"),
                        kind="enum",
                        qualified_name=enum_match.group("name"),
                        line=line,
                        signature=signature,
                    )
                ]

        function_match = re.match(
            rf"(?:async\s+)?function\s+(?P<name>{_IDENTIFIER_RE})\s*(?:<|\()",
            subject,
        )
        if function_match:
            name = function_match.group("name")
            is_entrypoint = name == "main" and has_main_guard
            return [
                SymbolDef(
                    name=name,
                    kind="function",
                    qualified_name=name,
                    line=line,
                    signature=signature,
                    is_entrypoint=is_entrypoint,
                )
            ]

        class_match = re.match(
            rf"class\s+(?P<name>{_IDENTIFIER_RE})(?:\s*<[^>]+>)?"
            r"(?:\s+extends\s+(?P<bases>[^{]+))?",
            subject,
        )
        if class_match:
            name = class_match.group("name")
            return [
                SymbolDef(
                    name=name,
                    kind="class",
                    qualified_name=name,
                    line=line,
                    signature=signature,
                    bases=self._parse_bases(class_match.group("bases")),
                )
            ]

        interface_match = re.match(
            rf"interface\s+(?P<name>{_IDENTIFIER_RE})(?:\s*<[^>]+>)?"
            r"(?:\s+extends\s+(?P<bases>[^{]+))?",
            subject,
        )
        if interface_match:
            name = interface_match.group("name")
            return [
                SymbolDef(
                    name=name,
                    kind="interface",
                    qualified_name=name,
                    line=line,
                    signature=signature,
                    bases=self._parse_bases(interface_match.group("bases")),
                )
            ]

        type_match = re.match(rf"type\s+(?P<name>{_IDENTIFIER_RE})\b", subject)
        if type_match:
            name = type_match.group("name")
            return [
                SymbolDef(
                    name=name,
                    kind="type",
                    qualified_name=name,
                    line=line,
                    signature=signature,
                )
            ]

        enum_match = re.match(rf"enum\s+(?P<name>{_IDENTIFIER_RE})\b", subject)
        if enum_match:
            name = enum_match.group("name")
            return [
                SymbolDef(
                    name=name,
                    kind="enum",
                    qualified_name=name,
                    line=line,
                    signature=signature,
                )
            ]

        if not exported:
            return None

        variable_match = re.match(
            rf"(?P<decl>const|let|var)\s+(?P<body>.+)",
            subject,
        )
        if not variable_match:
            return None

        kind = "constant" if variable_match.group("decl") == "const" else "variable"
        return [
            SymbolDef(
                name=name,
                kind=kind,
                qualified_name=name,
                line=line,
                signature=signature,
            )
            for name in self._extract_variable_names(variable_match.group("body"))
        ]

    def _build_signature_summary(
        self,
        *,
        rel_path: str,
        module_name: str,
        package_name: str | None,
        imports: list[str],
        symbols: list[SymbolDef],
        is_test_file: bool,
    ) -> str:
        """Build a compact TS/JS signature summary for hub splitting context."""
        lines = [f"# Signatures from {rel_path}"]
        lines.append(f"# module_name: {module_name}")
        if package_name:
            lines.append(f"# package: {package_name}")
        if is_test_file:
            lines.append("# test_file: true")

        if imports:
            lines.append("")
            lines.append("## Imports")
            for imported in imports:
                lines.append(f'- "{imported}"')

        buckets = {
            "interface": [],
            "type": [],
            "enum": [],
            "class": [],
            "function": [],
            "constant": [],
            "variable": [],
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
            ("Interfaces", "interface"),
            ("Types", "type"),
            ("Enums", "enum"),
            ("Classes", "class"),
            ("Functions", "function"),
            ("Constants", "constant"),
            ("Variables", "variable"),
        ):
            values = buckets.get(key, [])
            if not values:
                continue
            lines.append("")
            lines.append(f"## {heading}")
            for value in values:
                lines.append(f"- {value}")

        return "\n".join(lines)

    def _module_name(self, rel_path: str) -> str:
        """Convert a source path into a stable extensionless module identity."""
        normalized = rel_path.replace("\\", "/")
        return self._strip_module_suffix(normalized)

    def _package_name(self, rel_path: str) -> str | None:
        """Return the parent directory as the package/grouping label."""
        parent = posixpath.dirname(rel_path.replace("\\", "/"))
        return parent or None

    def _provided_modules(self, module_name: str) -> list[str]:
        """Build import keys this file can satisfy for local TS/JS imports."""
        provided = [module_name]
        if module_name.startswith("src/"):
            provided.append(module_name[4:])
        if module_name.endswith("/index"):
            parent = module_name[:-6]
            if parent:
                provided.append(parent)
                if parent.startswith("src/"):
                    provided.append(parent[4:])
        return self._dedupe(provided)

    def _normalize_import(self, raw: str, rel_path: str) -> str:
        """Normalize relative imports to extensionless repo module identities."""
        if not raw.startswith("."):
            return raw
        base_dir = posixpath.dirname(rel_path.replace("\\", "/"))
        normalized = posixpath.normpath(posixpath.join(base_dir, raw))
        if normalized == ".":
            normalized = posixpath.basename(base_dir)
        return self._strip_module_suffix(normalized)

    def _is_test_file(self, rel_path: str) -> bool:
        """Detect Jest/Vitest-style test files and __tests__ directories."""
        normalized = rel_path.replace("\\", "/").lower()
        parts = normalized.split("/")
        return "__tests__" in parts or _TEST_FILE_RE.search(posixpath.basename(normalized)) is not None

    def _test_targets(self, rel_path: str, import_refs: list[_ImportRef]) -> list[str]:
        """Infer test target modules from colocated names and relative imports."""
        targets: list[str] = []
        guessed = self._guess_test_target(rel_path)
        if guessed:
            targets.append(guessed)
        targets.extend(ref.normalized for ref in import_refs if ref.is_relative)
        return self._dedupe(targets)

    def _guess_test_target(self, rel_path: str) -> str | None:
        """Guess the implementation module covered by a TS/JS test file."""
        normalized = rel_path.replace("\\", "/")
        dirname = posixpath.dirname(normalized)
        basename = posixpath.basename(normalized)
        match = re.match(
            r"(?P<name>.+)\.(?:test|spec)\.(?:ts|tsx|js|jsx)$",
            basename,
            re.IGNORECASE,
        )
        if "__tests__" in normalized.split("/"):
            parts = normalized.split("/")
            test_index = parts.index("__tests__")
            target_dir = "/".join(parts[:test_index])
            raw_name = match.group("name") if match else self._strip_module_suffix(basename)
            return posixpath.normpath(posixpath.join(target_dir, raw_name))
        if match:
            return posixpath.normpath(posixpath.join(dirname, match.group("name")))
        return None

    def _collect_declaration(self, lines: list[str], start_index: int) -> str:
        """Collect a compact declaration header from the current line."""
        collected: list[str] = []
        paren_depth = 0
        for index in range(start_index, min(start_index + 12, len(lines))):
            line = lines[index].rstrip()
            collected.append(line)
            masked = self._mask_non_code(line)
            paren_depth += masked.count("(") - masked.count(")")
            stripped = line.strip()
            if index == start_index and stripped.endswith(";"):
                break
            if paren_depth <= 0 and ("{" in masked or ";" in masked):
                break
        return "\n".join(collected)

    def _strip_modifiers(self, normalized: str) -> tuple[str, bool]:
        """Remove leading TS declaration modifiers while preserving export state."""
        subject = normalized
        exported = False
        while True:
            if subject.startswith("export "):
                exported = True
                subject = subject[7:].lstrip()
                continue
            for modifier in ("default ", "declare ", "abstract "):
                if subject.startswith(modifier):
                    subject = subject[len(modifier):].lstrip()
                    break
            else:
                return subject, exported

    def _extract_variable_names(self, body: str) -> list[str]:
        """Extract simple identifier names from an exported variable declaration."""
        names: list[str] = []
        for piece in self._split_top_level_commas(body):
            match = re.match(rf"\s*(?P<name>{_IDENTIFIER_RE})\b", piece)
            if match:
                names.append(match.group("name"))
        return self._dedupe(names)

    def _split_top_level_commas(self, body: str) -> list[str]:
        """Split a variable declaration body on commas outside brackets."""
        pieces: list[str] = []
        start = 0
        depth = 0
        for index, char in enumerate(body):
            if char in "([{<":
                depth += 1
            elif char in ")]}>":
                depth = max(0, depth - 1)
            elif char == "," and depth == 0:
                pieces.append(body[start:index])
                start = index + 1
        pieces.append(body[start:])
        return pieces

    def _parse_bases(self, raw_bases: str | None) -> list[str]:
        """Parse class/interface base clauses into compact names."""
        if not raw_bases:
            return []
        cleaned = raw_bases.strip().rstrip("{").strip()
        return [
            item.strip()
            for item in self._split_top_level_commas(cleaned)
            if item.strip()
        ]

    def _has_main_guard(self, content: str) -> bool:
        """Detect common JS/TS script entrypoint guards."""
        return (
            "require.main === module" in content
            or "require.main == module" in content
            or "import.meta.main" in content
        )

    def _strip_module_suffix(self, value: str) -> str:
        """Remove JS/TS module file suffixes from a path-like value."""
        for suffix in _MODULE_SUFFIXES:
            if value.endswith(suffix):
                return value[: -len(suffix)]
        return value

    def _match_starts_in_code(self, masked_content: str, start: int) -> bool:
        """Return whether a regex import match starts outside strings/comments."""
        return start < len(masked_content) and not masked_content[start].isspace()

    def _strip_comments(self, content: str) -> str:
        """Remove line and block comments while preserving string literals."""
        result: list[str] = []
        index = 0
        length = len(content)
        quote: str | None = None
        while index < length:
            char = content[index]
            next_char = content[index + 1] if index + 1 < length else ""
            if quote:
                result.append(char)
                if char == "\\" and index + 1 < length:
                    result.append(content[index + 1])
                    index += 2
                    continue
                if char == quote:
                    quote = None
                index += 1
                continue

            if char in {"'", '"', "`"}:
                quote = char
                result.append(char)
                index += 1
                continue
            if char == "/" and next_char == "/":
                while index < length and content[index] != "\n":
                    result.append(" ")
                    index += 1
                continue
            if char == "/" and next_char == "*":
                result.extend((" ", " "))
                index += 2
                while index < length - 1:
                    if content[index] == "*" and content[index + 1] == "/":
                        result.extend((" ", " "))
                        index += 2
                        break
                    result.append("\n" if content[index] == "\n" else " ")
                    index += 1
                continue
            result.append(char)
            index += 1
        return "".join(result)

    def _mask_non_code(self, content: str) -> str:
        """Mask strings and comments for brace/paren depth accounting."""
        stripped = self._strip_comments(content)
        result: list[str] = []
        index = 0
        length = len(stripped)
        quote: str | None = None
        while index < length:
            char = stripped[index]
            if quote:
                result.append("\n" if char == "\n" else " ")
                if char == "\\" and index + 1 < length:
                    result.append("\n" if stripped[index + 1] == "\n" else " ")
                    index += 2
                    continue
                if char == quote:
                    quote = None
                index += 1
                continue
            if char in {"'", '"', "`"}:
                quote = char
                result.append(" ")
                index += 1
                continue
            result.append(char)
            index += 1
        return "".join(result)

    def _normalize_spaces(self, text: str) -> str:
        """Normalize declaration whitespace for regex matching."""
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

    def _dedupe_import_refs(self, refs: list[_ImportRef]) -> list[_ImportRef]:
        """Deduplicate import refs by normalized module while preserving order."""
        seen: set[str] = set()
        result: list[_ImportRef] = []
        for ref in refs:
            if not ref.normalized or ref.normalized in seen:
                continue
            seen.add(ref.normalized)
            result.append(ref)
        return result
