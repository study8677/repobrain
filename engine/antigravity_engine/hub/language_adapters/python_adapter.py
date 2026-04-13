"""Python semantic adapter for hub knowledge graph and grouping."""
from __future__ import annotations

import ast
from pathlib import Path

from antigravity_engine.hub.language_adapters.base import FileSemantics, SymbolDef


class PythonLanguageAdapter:
    """Analyze Python files into language-neutral semantic records."""

    name = "python"
    supported_suffixes: frozenset[str] = frozenset({".py"})

    def analyze(
        self,
        workspace: Path,
        abs_path: Path,
        rel_path: str,
        content: str,
    ) -> FileSemantics:
        """Analyze a Python file using the stdlib AST parser.

        Args:
            workspace: Workspace root directory.
            abs_path: Absolute file path.
            rel_path: Workspace-relative file path.
            content: Decoded file contents.

        Returns:
            Extracted Python file semantics.
        """
        del workspace, abs_path
        module_name = self._module_name(rel_path)
        package_name = (
            module_name[:-9]
            if module_name.endswith(".__init__")
            else module_name.rpartition(".")[0] or module_name
        )
        provided_modules = self._provided_modules(module_name, rel_path)
        is_test_file = self._is_test_file(rel_path)

        try:
            tree = ast.parse(content, filename=rel_path)
        except SyntaxError as exc:
            return FileSemantics(
                rel_path=rel_path,
                language="Python",
                adapter_name=self.name,
                package_name=package_name,
                package_identity=module_name,
                module_name=module_name,
                provided_modules=provided_modules,
                imports=[],
                symbols=[],
                entrypoints=[],
                is_test_file=is_test_file,
                test_targets=[module_name] if is_test_file else [],
                signature_summary=self._fallback_signature_summary(rel_path, content),
                parse_error=str(exc),
            )

        imports: list[str] = []
        symbols: list[SymbolDef] = []
        entrypoints: list[str] = []
        source_lines = content.splitlines()

        for node in ast.iter_child_nodes(tree):
            if isinstance(node, ast.ImportFrom) and node.module:
                imports.append(node.module)
            elif isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(alias.name)
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                is_entrypoint = node.name == "main" and self._has_main_guard(tree)
                if is_entrypoint:
                    entrypoints.append(node.name)
                symbols.append(
                    SymbolDef(
                        name=node.name,
                        kind="function",
                        qualified_name=node.name,
                        line=getattr(node, "lineno", None),
                        signature=self._line_at(source_lines, getattr(node, "lineno", 1)),
                        is_entrypoint=is_entrypoint,
                    )
                )
            elif isinstance(node, ast.ClassDef):
                bases: list[str] = []
                if hasattr(ast, "unparse"):
                    bases = [ast.unparse(base) for base in node.bases]
                symbols.append(
                    SymbolDef(
                        name=node.name,
                        kind="class",
                        qualified_name=node.name,
                        line=getattr(node, "lineno", None),
                        signature=self._line_at(source_lines, getattr(node, "lineno", 1)),
                        bases=bases,
                    )
                )

        signature_summary = self._build_signature_summary(rel_path, content, tree)
        return FileSemantics(
            rel_path=rel_path,
            language="Python",
            adapter_name=self.name,
            package_name=package_name,
            package_identity=module_name,
            module_name=module_name,
            provided_modules=provided_modules,
            imports=self._dedupe(imports),
            symbols=symbols,
            entrypoints=self._dedupe(entrypoints),
            is_test_file=is_test_file,
            test_targets=[module_name] if is_test_file else [],
            signature_summary=signature_summary,
        )

    def _module_name(self, rel_path: str) -> str:
        """Convert a Python path into its import-style module name."""
        rel_no_ext = rel_path[:-3]
        return rel_no_ext.replace("/", ".").replace("\\", ".")

    def _provided_modules(self, module_name: str, rel_path: str) -> list[str]:
        """Build module aliases preserved from the legacy Python grouping logic."""
        provided = [module_name, Path(rel_path).stem]
        if module_name.endswith(".__init__"):
            provided.append(module_name[:-9])
        if module_name.startswith("src."):
            provided.append(module_name[4:])
        return self._dedupe(provided)

    def _is_test_file(self, rel_path: str) -> bool:
        """Detect Python test files."""
        lower = rel_path.lower()
        name = Path(rel_path).stem.lower()
        return (
            name.startswith("test_")
            or name.endswith("_test")
            or "/tests/" in f"/{lower}/"
            or "/test/" in f"/{lower}/"
        )

    def _has_main_guard(self, tree: ast.Module) -> bool:
        """Detect a ``if __name__ == '__main__'`` execution guard."""
        for node in ast.iter_child_nodes(tree):
            if not isinstance(node, ast.If):
                continue
            test = node.test
            if not isinstance(test, ast.Compare):
                continue
            if len(test.ops) != 1 or len(test.comparators) != 1:
                continue
            left = test.left
            right = test.comparators[0]
            if not isinstance(left, ast.Name) or left.id != "__name__":
                continue
            if isinstance(right, ast.Constant) and right.value == "__main__":
                return True
        return False

    def _build_signature_summary(
        self,
        rel_path: str,
        content: str,
        tree: ast.Module,
    ) -> str:
        """Build a compact signature summary preserving prior Python behavior."""
        lines: list[str] = [f"# Signatures from {rel_path}\n"]
        source_lines = content.splitlines()

        for node in ast.iter_child_nodes(tree):
            if isinstance(node, ast.ClassDef):
                lines.append(self._line_at(source_lines, getattr(node, "lineno", 1)) or f"class {node.name}:")
                doc = ast.get_docstring(node)
                if doc:
                    lines.append(f'    """{doc.splitlines()[0].strip()}"""')
                for item in ast.iter_child_nodes(node):
                    if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        method_sig = self._line_at(source_lines, getattr(item, "lineno", 1))
                        if method_sig:
                            lines.append(f"    {method_sig.strip()}")
                lines.append("")
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                func_sig = self._line_at(source_lines, getattr(node, "lineno", 1))
                if func_sig:
                    lines.append(func_sig)
                doc = ast.get_docstring(node)
                if doc:
                    lines.append(f'    """{doc.splitlines()[0].strip()}"""')
                lines.append("")

        summary = "\n".join(lines).strip()
        return summary or self._fallback_signature_summary(rel_path, content)

    def _fallback_signature_summary(self, rel_path: str, content: str) -> str:
        """Return a compact fallback summary when AST parsing fails."""
        lines = content.splitlines()[:100]
        return f"# Signatures from {rel_path}\n\n" + "\n".join(lines)

    def _line_at(self, lines: list[str], line_no: int) -> str:
        """Return a line by 1-based number or an empty string."""
        if 1 <= line_no <= len(lines):
            return lines[line_no - 1]
        return ""

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
