"""Tests for shared hub semantics across Python, Go, and fallback adapters."""
from __future__ import annotations

import asyncio
import json
from pathlib import Path

from antigravity_engine.hub.knowledge_graph import build_knowledge_graph
from antigravity_engine.hub.module_grouping import group_files, load_module_files
from antigravity_engine.hub.refresh_pipeline import refresh_pipeline
from antigravity_engine.hub.scanner import full_scan
from antigravity_engine.hub.semantic_index import analyze_source_file


def test_python_semantic_graph_preserves_imports_and_definitions(tmp_path: Path) -> None:
    """Python files should still emit semantic import and definition edges."""
    demo_dir = tmp_path / "demo"
    demo_dir.mkdir()
    (demo_dir / "__init__.py").write_text("", encoding="utf-8")
    (demo_dir / "service.py").write_text(
        "import os\n"
        "from typing import Iterable\n\n"
        "class Worker:\n"
        "    pass\n\n"
        "def run(items: Iterable[str]) -> int:\n"
        "    return len(list(items))\n",
        encoding="utf-8",
    )

    graph = build_knowledge_graph(tmp_path, full_scan(tmp_path))
    edges = graph["edges"]

    assert {"from": "file:demo/service.py", "to": "module:os", "type": "imports"} in edges
    assert {
        "from": "file:demo/service.py",
        "to": "module:typing",
        "type": "imports",
    } in edges
    assert {
        "from": "file:demo/service.py",
        "to": "symbol:demo/service.py:Worker",
        "type": "defines",
    } in edges
    assert {
        "from": "file:demo/service.py",
        "to": "symbol:demo/service.py:run",
        "type": "defines",
    } in edges


def test_go_adapter_extracts_package_imports_symbols_entrypoints_and_tests(
    tmp_path: Path,
) -> None:
    """Go adapter should capture package/imports/symbols/entrypoints/test relations."""
    _write_go_workspace(tmp_path)

    main_semantics = analyze_source_file(tmp_path, tmp_path / "main.go")
    service_semantics = analyze_source_file(
        tmp_path,
        tmp_path / "internal" / "service" / "service.go",
    )
    test_semantics = analyze_source_file(
        tmp_path,
        tmp_path / "internal" / "service" / "service_test.go",
    )

    assert main_semantics.package_name == "main"
    assert main_semantics.package_identity == "example.com/app"
    assert main_semantics.imports == ["fmt", "example.com/app/internal/service"]
    assert main_semantics.entrypoints == ["init", "main"]

    service_symbols = {symbol.name: symbol.kind for symbol in service_semantics.symbols}
    assert service_semantics.package_name == "service"
    assert service_semantics.package_identity == "example.com/app/internal/service"
    assert service_symbols["Service"] == "struct"
    assert service_symbols["Runner"] == "interface"
    assert service_symbols["NewService"] == "function"
    assert service_symbols["Run"] == "method"
    assert "## Methods" in service_semantics.signature_summary
    assert "func (s *Service) Run() error" in service_semantics.signature_summary

    assert test_semantics.is_test_file is True
    assert test_semantics.test_targets == ["example.com/app/internal/service"]


def test_go_knowledge_graph_contains_semantic_edges(tmp_path: Path) -> None:
    """A Go workspace should contribute non-zero semantic graph edges."""
    _write_go_workspace(tmp_path)

    graph = build_knowledge_graph(tmp_path, full_scan(tmp_path))
    edges = graph["edges"]
    nodes = graph["nodes"]

    assert graph["summary"]["semantic_edges"] > 0
    assert {
        "from": "file:main.go",
        "to": "module:example.com/app",
        "type": "declares_package",
    } in edges
    assert {
        "from": "file:main.go",
        "to": "module:example.com/app/internal/service",
        "type": "imports",
    } in edges
    assert {
        "from": "file:internal/service/service.go",
        "to": "symbol:internal/service/service.go:Service.Run",
        "type": "defines",
    } in edges
    assert any(
        node.get("id") == "symbol:internal/service/service.go:Service.Run"
        and node.get("type") == "method"
        for node in nodes
    )


def test_go_module_grouping_uses_semantic_package_and_import_signals(
    tmp_path: Path,
) -> None:
    """Go grouping should keep package peers and imported packages together."""
    (tmp_path / "go.mod").write_text("module example.com/app\n\ngo 1.22\n", encoding="utf-8")
    _write_text(
        tmp_path / "internal" / "service" / "handler.go",
        (
            "package service\n\n"
            'import "example.com/app/internal/repo"\n\n'
            "type Handler struct{}\n\n"
            "func NewHandler() *Handler { return &Handler{} }\n\n"
            + ("// semantic padding\n" * 220)
        ),
    )
    _write_text(
        tmp_path / "internal" / "service" / "types.go",
        (
            "package service\n\n"
            "type Config struct{}\n\n"
            "func DefaultConfig() Config { return Config{} }\n\n"
            + ("// semantic padding\n" * 220)
        ),
    )
    _write_text(
        tmp_path / "internal" / "repo" / "store.go",
        (
            "package repo\n\n"
            "type Store struct{}\n\n"
            "func NewStore() *Store { return &Store{} }\n\n"
            + ("// semantic padding\n" * 220)
        ),
    )
    _write_text(
        tmp_path / "internal" / "logger" / "logger.go",
        "package logger\n\nfunc Log() {}\n",
    )

    files = load_module_files(tmp_path / "internal", tmp_path)
    groups = group_files(files, tmp_path, token_budget=3400)
    group_paths = [sorted(source_file.rel_path for source_file in group.files) for group in groups]

    assert any(
        {
            "internal/service/handler.go",
            "internal/service/types.go",
            "internal/repo/store.go",
        }.issubset(set(paths))
        for paths in group_paths
    )


def test_mixed_language_workspace_builds_stable_semantic_graph(tmp_path: Path) -> None:
    """Mixed Python and Go workspaces should produce stable graph output."""
    (tmp_path / "app.py").write_text(
        "from service import run\n\n\ndef main() -> None:\n    run()\n",
        encoding="utf-8",
    )
    _write_go_workspace(tmp_path, include_python=False)

    graph = build_knowledge_graph(tmp_path, full_scan(tmp_path))

    assert "Python" in graph["summary"]["languages"]
    assert "Go" in graph["summary"]["languages"]
    assert graph["summary"]["semantic_edges"] > 0
    assert any(node.get("id") == "module:service" for node in graph["nodes"])
    assert any(
        node.get("id") == "module:example.com/app/internal/service"
        for node in graph["nodes"]
    )


def test_unsupported_language_semantics_degrade_gracefully(tmp_path: Path) -> None:
    """Unsupported languages should load and group without semantic crashes."""
    source_dir = tmp_path / "src"
    source_dir.mkdir()
    source_path = source_dir / "Main.scala"
    source_path.write_text(
        "object Main {\n  def run(): Unit = println(\"hi\")\n}\n",
        encoding="utf-8",
    )

    semantics = analyze_source_file(tmp_path, source_path)
    files = load_module_files(source_dir, tmp_path)
    groups = group_files(files, tmp_path, token_budget=10)

    assert semantics.language == "Unknown"
    assert semantics.signature_summary.startswith("# Summary from src/Main.scala")
    assert len(files) == 1
    assert len(groups) == 1
    assert groups[0].files[0].rel_path == "src/Main.scala"


def test_realistic_go_refresh_pipeline_emits_semantic_diagnostics(
    tmp_path: Path,
    monkeypatch,
) -> None:
    """Realistic Go layouts should emit stable diagnostics through refresh_pipeline."""
    _write_realistic_go_refresh_workspace(tmp_path)
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_BASE_URL", raising=False)
    monkeypatch.setenv("AG_REFRESH_SCAN_ONLY", "1")

    status = asyncio.run(refresh_pipeline(tmp_path, quick=False))
    graph = json.loads((tmp_path / ".antigravity" / "knowledge_graph.json").read_text(encoding="utf-8"))

    assert status.overall_status == "success"
    assert graph["schema"] == "antigravity-knowledge-graph-v2"
    assert graph["summary"]["semantic_files"] == 6
    assert graph["summary"]["semantic_files_by_language"] == {"Go": 6}
    assert graph["summary"]["semantic_adapters"] == {"go": 6}
    assert graph["summary"]["semantic_edges_by_type"] == {
        "declares_package": 6,
        "defines": 12,
        "entrypoint": 2,
        "imports": 7,
        "tests": 1,
    }
    assert graph["diagnostics"]["generic_fallback_files"] == []
    assert any(
        node.get("id") == "file:internal/service/service.go"
        and node.get("semantic_adapter") == "go"
        and node.get("semantic_package_identity") == "example.com/realgo/internal/service"
        for node in graph["nodes"]
    )


def test_mixed_language_refresh_pipeline_normalizes_nested_go_modules(
    tmp_path: Path,
    monkeypatch,
) -> None:
    """Mixed-language refresh should normalize nested Go module identities correctly."""
    _write_mixed_language_refresh_workspace(tmp_path)
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_BASE_URL", raising=False)
    monkeypatch.setenv("AG_REFRESH_SCAN_ONLY", "1")

    status = asyncio.run(refresh_pipeline(tmp_path, quick=False))
    graph = json.loads((tmp_path / ".antigravity" / "knowledge_graph.json").read_text(encoding="utf-8"))
    node_ids = {node["id"] for node in graph["nodes"] if isinstance(node, dict)}
    import_edges = [edge for edge in graph["edges"] if isinstance(edge, dict) and edge.get("type") == "imports"]

    assert status.overall_status == "success"
    assert graph["summary"]["semantic_files_by_language"] == {"Go": 2, "Python": 3}
    assert "module:example.com/mixed/goapp/internal/worker" in node_ids
    assert "module:example.com/mixed/goapp/goapp/internal/worker" not in node_ids
    assert {
        "from": "file:goapp/cmd/app/main.go",
        "to": "module:example.com/mixed/goapp/internal/worker",
        "type": "imports",
    } in import_edges

    files = load_module_files(tmp_path / "goapp", tmp_path)
    groups = group_files(files, tmp_path, token_budget=4000)
    assert len(groups) == 1
    assert sorted(source_file.rel_path for source_file in groups[0].files) == [
        "goapp/cmd/app/main.go",
        "goapp/internal/worker/worker.go",
    ]


def test_generic_fallback_files_appear_in_graph_diagnostics(tmp_path: Path) -> None:
    """Graph diagnostics should expose files that fell back to the generic adapter."""
    src_dir = tmp_path / "src"
    src_dir.mkdir()
    (src_dir / "Main.scala").write_text(
        "object Main {\n  def run(): Unit = println(\"hi\")\n}\n",
        encoding="utf-8",
    )

    graph = build_knowledge_graph(tmp_path, full_scan(tmp_path))

    assert graph["summary"]["generic_fallback_file_count"] == 1
    assert graph["diagnostics"]["generic_fallback_files"] == ["src/Main.scala"]
    assert any(
        node.get("id") == "file:src/Main.scala"
        and node.get("semantic_adapter") == "generic"
        and node.get("generic_fallback") is True
        for node in graph["nodes"]
    )


def _write_go_workspace(tmp_path: Path, *, include_python: bool = True) -> None:
    """Create a small Go workspace fixture for semantic analysis."""
    (tmp_path / "go.mod").write_text("module example.com/app\n\ngo 1.22\n", encoding="utf-8")
    _write_text(
        tmp_path / "main.go",
        (
            "package main\n\n"
            "import (\n"
            '    "fmt"\n'
            '    "example.com/app/internal/service"\n'
            ")\n\n"
            "func init() {}\n\n"
            "func main() {\n"
            "    fmt.Println(service.NewService())\n"
            "}\n"
        ),
    )
    _write_text(
        tmp_path / "internal" / "service" / "service.go",
        (
            "package service\n\n"
            "type Service struct{}\n\n"
            "type Runner interface {\n"
            "    Run() error\n"
            "}\n\n"
            "func NewService() *Service { return &Service{} }\n\n"
            "func (s *Service) Run() error { return nil }\n"
        ),
    )
    _write_text(
        tmp_path / "internal" / "service" / "service_test.go",
        (
            "package service_test\n\n"
            'import "testing"\n\n'
            "func TestRun(t *testing.T) {}\n"
        ),
    )
    if include_python:
        (tmp_path / "placeholder.py").write_text("def keep_python() -> None:\n    pass\n", encoding="utf-8")


def _write_realistic_go_refresh_workspace(tmp_path: Path) -> None:
    """Create a realistic Go workspace fixture for refresh validation."""
    (tmp_path / "go.mod").write_text("module example.com/realgo\n\ngo 1.22\n", encoding="utf-8")
    _write_text(
        tmp_path / "cmd" / "api" / "main.go",
        (
            "package main\n\n"
            "import (\n"
            '    "log"\n'
            '    "example.com/realgo/internal/httpserver"\n'
            '    "example.com/realgo/pkg/version"\n'
            ")\n\n"
            "func init() {}\n\n"
            "func main() {\n"
            "    log.Println(version.String())\n"
            "    httpserver.Start()\n"
            "}\n"
        ),
    )
    _write_text(
        tmp_path / "internal" / "httpserver" / "server.go",
        (
            "package httpserver\n\n"
            "import (\n"
            '    "example.com/realgo/internal/service"\n'
            ")\n\n"
            "func Start() error {\n"
            "    svc := service.NewService()\n"
            "    return svc.Run()\n"
            "}\n"
        ),
    )
    _write_text(
        tmp_path / "internal" / "service" / "service.go",
        (
            "package service\n\n"
            'import "example.com/realgo/internal/repo"\n\n'
            "type Service struct {\n"
            "    store *repo.Store\n"
            "}\n\n"
            "type Runner interface {\n"
            "    Run() error\n"
            "}\n\n"
            "func NewService() *Service {\n"
            "    return &Service{store: repo.NewStore()}\n"
            "}\n\n"
            "func (s *Service) Run() error {\n"
            "    return s.store.Ping()\n"
            "}\n"
        ),
    )
    _write_text(
        tmp_path / "internal" / "service" / "service_test.go",
        (
            "package service_test\n\n"
            "import (\n"
            '    "testing"\n'
            '    "example.com/realgo/internal/service"\n'
            ")\n\n"
            "func TestNewService(t *testing.T) {\n"
            "    if service.NewService() == nil {\n"
            "        t.Fatal(\"expected service\")\n"
            "    }\n"
            "}\n"
        ),
    )
    _write_text(
        tmp_path / "internal" / "repo" / "store.go",
        (
            "package repo\n\n"
            "type Store struct{}\n\n"
            "func NewStore() *Store { return &Store{} }\n\n"
            "func (s *Store) Ping() error { return nil }\n"
        ),
    )
    _write_text(
        tmp_path / "pkg" / "version" / "version.go",
        'package version\n\nfunc String() string { return "dev" }\n',
    )


def _write_mixed_language_refresh_workspace(tmp_path: Path) -> None:
    """Create a mixed Python and nested-Go workspace fixture."""
    (tmp_path / "pyapp").mkdir(parents=True, exist_ok=True)
    (tmp_path / "goapp").mkdir(parents=True, exist_ok=True)
    (tmp_path / "goapp" / "go.mod").write_text(
        "module example.com/mixed/goapp\n\ngo 1.22\n",
        encoding="utf-8",
    )
    (tmp_path / "pyapp" / "__init__.py").write_text("", encoding="utf-8")
    (tmp_path / "pyapp" / "helpers.py").write_text(
        'def helper() -> str:\n    return "ok"\n',
        encoding="utf-8",
    )
    (tmp_path / "pyapp" / "service.py").write_text(
        "from pyapp.helpers import helper\n\n"
        "class Service:\n"
        "    pass\n\n"
        "def run() -> str:\n"
        "    return helper()\n",
        encoding="utf-8",
    )
    _write_text(
        tmp_path / "goapp" / "cmd" / "app" / "main.go",
        (
            "package main\n\n"
            'import "example.com/mixed/goapp/internal/worker"\n\n'
            "func main() { worker.Run() }\n"
        ),
    )
    _write_text(
        tmp_path / "goapp" / "internal" / "worker" / "worker.go",
        "package worker\n\nfunc Run() error { return nil }\n",
    )


def _write_text(path: Path, content: str) -> None:
    """Write a text fixture file, creating parent directories as needed."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
