"""Tests for hub.ask_tools — code exploration tools for the ask swarm."""
import subprocess
from pathlib import Path

from antigravity_engine.hub.ask_tools import create_ask_tools


def _make_tools(tmp_path: Path) -> dict:
    """Helper to create tools bound to a temp workspace."""
    return create_ask_tools(tmp_path)


# ---------------------------------------------------------------------------
# search_code
# ---------------------------------------------------------------------------


def test_search_code_finds_pattern(tmp_path: Path) -> None:
    (tmp_path / "app.py").write_text("def login(user, pw):\n    return True\n")
    tools = _make_tools(tmp_path)
    result = tools["search_code"]("login")
    assert "app.py" in result
    assert "login" in result


def test_search_code_no_results(tmp_path: Path) -> None:
    (tmp_path / "app.py").write_text("def hello(): pass\n")
    tools = _make_tools(tmp_path)
    result = tools["search_code"]("nonexistent_xyz")
    assert "No results" in result


def test_search_code_with_file_pattern(tmp_path: Path) -> None:
    (tmp_path / "app.py").write_text("login = True\n")
    (tmp_path / "app.js").write_text("const login = true;\n")
    tools = _make_tools(tmp_path)
    result = tools["search_code"]("login", file_pattern="*.py")
    assert "app.py" in result
    assert "app.js" not in result


def test_search_code_skips_node_modules(tmp_path: Path) -> None:
    nm = tmp_path / "node_modules" / "pkg"
    nm.mkdir(parents=True)
    (nm / "index.js").write_text("const secret = true;\n")
    (tmp_path / "main.js").write_text("const public = true;\n")
    tools = _make_tools(tmp_path)
    result = tools["search_code"]("secret")
    assert "No results" in result


def test_search_code_empty_query(tmp_path: Path) -> None:
    tools = _make_tools(tmp_path)
    result = tools["search_code"]("")
    assert "Error" in result


# ---------------------------------------------------------------------------
# read_file
# ---------------------------------------------------------------------------


def test_read_file_basic(tmp_path: Path) -> None:
    content = "\n".join(f"line {i}" for i in range(1, 21))
    (tmp_path / "demo.py").write_text(content)
    tools = _make_tools(tmp_path)
    result = tools["read_file"]("demo.py")
    assert "line 1" in result
    assert "demo.py" in result


def test_read_file_line_range(tmp_path: Path) -> None:
    content = "\n".join(f"line {i}" for i in range(1, 51))
    (tmp_path / "demo.py").write_text(content)
    tools = _make_tools(tmp_path)
    result = tools["read_file"]("demo.py", start_line=10, end_line=15)
    assert "line 10" in result
    assert "line 15" in result
    # Should NOT contain lines outside range in the numbered output
    assert "    1  line 1" not in result


def test_read_file_rejects_traversal(tmp_path: Path) -> None:
    tools = _make_tools(tmp_path)
    result = tools["read_file"]("../../etc/passwd")
    assert "Error" in result
    assert "outside" in result


def test_read_file_missing(tmp_path: Path) -> None:
    tools = _make_tools(tmp_path)
    result = tools["read_file"]("nonexistent.py")
    assert "Error" in result


# ---------------------------------------------------------------------------
# list_directory
# ---------------------------------------------------------------------------


def test_list_directory_basic(tmp_path: Path) -> None:
    (tmp_path / "src").mkdir()
    (tmp_path / "README.md").write_text("# Hi")
    (tmp_path / "app.py").write_text("x = 1")
    tools = _make_tools(tmp_path)
    result = tools["list_directory"](".")
    assert "src/" in result
    assert "README.md" in result
    assert "app.py" in result


def test_list_directory_skips_pycache(tmp_path: Path) -> None:
    (tmp_path / "__pycache__").mkdir()
    (tmp_path / "main.py").write_text("x = 1")
    tools = _make_tools(tmp_path)
    result = tools["list_directory"](".")
    assert "__pycache__" not in result
    assert "main.py" in result


def test_list_directory_rejects_traversal(tmp_path: Path) -> None:
    tools = _make_tools(tmp_path)
    result = tools["list_directory"]("../../")
    assert "Error" in result


# ---------------------------------------------------------------------------
# git_file_history
# ---------------------------------------------------------------------------


def test_git_file_history_no_git(tmp_path: Path) -> None:
    (tmp_path / "app.py").write_text("x = 1")
    tools = _make_tools(tmp_path)
    result = tools["git_file_history"]("app.py")
    assert "No git history" in result or "not available" in result.lower()


def test_git_file_history_with_repo(tmp_path: Path) -> None:
    subprocess.run(["git", "init"], cwd=str(tmp_path), capture_output=True, check=True)
    subprocess.run(
        ["git", "config", "user.email", "test@test.com"],
        cwd=str(tmp_path), capture_output=True, check=True,
    )
    subprocess.run(
        ["git", "config", "user.name", "Test"],
        cwd=str(tmp_path), capture_output=True, check=True,
    )
    (tmp_path / "app.py").write_text("v1")
    subprocess.run(["git", "add", "."], cwd=str(tmp_path), capture_output=True, check=True)
    subprocess.run(
        ["git", "commit", "-m", "initial version"],
        cwd=str(tmp_path), capture_output=True, check=True,
    )
    tools = _make_tools(tmp_path)
    result = tools["git_file_history"]("app.py")
    assert "initial version" in result


def test_search_code_records_retrieval_graph_artifacts(tmp_path: Path, monkeypatch) -> None:
    """Tool calls should persist retrieval graph artifacts for later reuse.

    The default AG_RETRIEVAL_MODE is ``compact`` which only writes JSONL
    stores.  We test both compact (JSONL) and full (.json artifact) modes.
    """
    (tmp_path / "app.py").write_text("def login(user, pw):\n    return True\n")

    # Test compact mode (default): JSONL stores are created
    tools = _make_tools(tmp_path)
    result = tools["search_code"]("login")

    assert "app.py" in result

    graph_dir = tmp_path / ".antigravity" / "graph"
    assert (graph_dir / "nodes.jsonl").exists()
    assert (graph_dir / "edges.jsonl").exists()

    nodes_text = (graph_dir / "nodes.jsonl").read_text(encoding="utf-8")
    assert "search_code" in nodes_text

    # Test full mode: .json artifacts are also created
    monkeypatch.setenv("AG_RETRIEVAL_MODE", "full")
    tools_full = _make_tools(tmp_path)
    tools_full["search_code"]("login")

    retrieval_dir = tmp_path / ".antigravity" / "retrieval_graphs"
    assert list(retrieval_dir.glob("*.json"))
