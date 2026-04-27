"""Tests for hub.module_grouping multi-language loading."""
from pathlib import Path

import pytest

from antigravity_engine.hub._constants import WORKSPACE_ROOT_MODULE_ID
from antigravity_engine.hub.module_grouping import load_module_files
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
