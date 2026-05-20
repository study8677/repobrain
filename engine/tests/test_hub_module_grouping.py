"""Tests for hub.module_grouping multi-language loading."""
from pathlib import Path

import pytest

from antigravity_engine.hub._constants import WORKSPACE_ROOT_MODULE_ID
from antigravity_engine.hub.module_grouping import group_files, load_module_files
from antigravity_engine.hub.scanner import detect_modules, resolve_module_path


@pytest.mark.parametrize(
    ("rel_path", "source"),
    [
        ("cmd/main.go", "package main\nfunc main() {}\n"),
        ("src/lib.rs", "pub fn run() {}\n"),
        ("src/Main.java", "class Main {}\n"),
        ("src/Main.kt", "fun main() {}\n"),
    ],
)
def test_load_module_files_supports_detected_non_python_modules(
    tmp_path: Path,
    rel_path: str,
    source: str,
) -> None:
    """Detected non-Python modules should produce analyzable source files."""
    target = tmp_path / rel_path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(source, encoding="utf-8")

    modules = detect_modules(tmp_path)

    assert modules
    module_path = resolve_module_path(tmp_path, modules[0])
    loaded = load_module_files(module_path, tmp_path)

    assert len(loaded) == 1
    assert loaded[0].rel_path == rel_path


def test_load_module_files_limits_workspace_root_to_direct_files(tmp_path: Path) -> None:
    """Workspace-root module loading should not recurse into child directories."""
    (tmp_path / "main.go").write_text("package main\nfunc main() {}\n", encoding="utf-8")
    nested_dir = tmp_path / "internal"
    nested_dir.mkdir()
    (nested_dir / "service.go").write_text(
        "package internal\nfunc Service() {}\n",
        encoding="utf-8",
    )

    modules = detect_modules(tmp_path)

    assert modules == ["internal", WORKSPACE_ROOT_MODULE_ID]
    loaded = load_module_files(resolve_module_path(tmp_path, WORKSPACE_ROOT_MODULE_ID), tmp_path)

    assert [item.rel_path for item in loaded] == ["main.go"]


def test_typescript_grouping_uses_local_import_edges(tmp_path: Path) -> None:
    """Related TS/JS files should group together through semantic import keys."""
    _write_text(
        tmp_path / "src" / "feature" / "service.ts",
        (
            'import { getUser } from "./repo";\n'
            'import { User } from "./types";\n\n'
            "export function loadUser(id: string): User {\n"
            "    return getUser(id);\n"
            "}\n\n"
            + ("// semantic padding\n" * 220)
        ),
    )
    _write_text(
        tmp_path / "src" / "feature" / "repo.ts",
        (
            'import type { User } from "./types";\n\n'
            "export class UserRepo {}\n\n"
            "export function getUser(id: string): User {\n"
            "    return { id };\n"
            "}\n\n"
            + ("// semantic padding\n" * 220)
        ),
    )
    _write_text(
        tmp_path / "src" / "feature" / "types.ts",
        (
            "export interface User {\n"
            "    id: string;\n"
            "}\n\n"
            + ("// semantic padding\n" * 220)
        ),
    )
    _write_text(
        tmp_path / "src" / "other" / "logger.ts",
        "export function log(value: string): void { console.log(value); }\n",
    )
    _write_text(
        tmp_path / "src" / "feature" / "__tests__" / "service.test.ts",
        (
            'import { loadUser } from "../service";\n\n'
            "test('loads user', () => loadUser('1'));\n"
        ),
    )

    files = load_module_files(tmp_path / "src", tmp_path)
    groups = group_files(files, tmp_path, token_budget=3400)
    group_paths = [sorted(source_file.rel_path for source_file in group.files) for group in groups]

    assert any(
        {
            "src/feature/service.ts",
            "src/feature/repo.ts",
            "src/feature/types.ts",
        }.issubset(set(paths))
        for paths in group_paths
    )
    assert any(
        paths == ["src/feature/__tests__/service.test.ts"]
        for paths in group_paths
    )


def _write_text(path: Path, content: str) -> None:
    """Write a text fixture file, creating parent directories as needed."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
