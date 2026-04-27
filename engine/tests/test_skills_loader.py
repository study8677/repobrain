"""Tests for antigravity_engine.skills.loader."""
import textwrap
from pathlib import Path
from unittest.mock import patch

from antigravity_engine.skills.loader import load_skills


def test_empty_directory_returns_empty_string(tmp_path: Path):
    """An empty skills directory produces no docs and no tools."""
    tools: dict = {}
    with patch("antigravity_engine.skills.loader.Path") as MockPath:
        # Make __file__.parent point to the empty tmp directory
        MockPath.return_value.parent = tmp_path
        MockPath.__file__ = tmp_path / "loader.py"

    # Directly test: create an empty dir to simulate skills_dir
    empty_dir = tmp_path / "skills"
    empty_dir.mkdir()

    with patch.object(Path, "__new__", return_value=empty_dir):
        # Instead, let's test by manipulating the function's view
        pass

    # Simpler approach: call with a patched __file__
    import antigravity_engine.skills.loader as loader_mod

    original_file = loader_mod.__file__
    try:
        loader_mod.__file__ = str(tmp_path / "loader.py")
        # tmp_path has no subdirectories with tools.py → empty result
        result = load_skills(tools)
        assert result == ""
        assert len(tools) == 0
    finally:
        loader_mod.__file__ = original_file


def test_skill_with_tools_registers_functions(tmp_path: Path):
    """A skill with tools.py has its public functions registered."""
    # Create a skill directory structure
    skill_dir = tmp_path / "my_skill"
    skill_dir.mkdir()

    tools_py = skill_dir / "tools.py"
    tools_py.write_text(
        textwrap.dedent("""\
        def hello(name: str) -> str:
            \"\"\"Say hello.\"\"\"
            return f"Hello {name}"

        def _private():
            pass
        """),
        encoding="utf-8",
    )

    import antigravity_engine.skills.loader as loader_mod

    original_file = loader_mod.__file__
    try:
        loader_mod.__file__ = str(tmp_path / "loader.py")
        tools: dict = {}
        result = load_skills(tools)
        assert "hello" in tools
        assert "_private" not in tools
    finally:
        loader_mod.__file__ = original_file


def test_skill_with_doc_returns_content(tmp_path: Path):
    """A skill with SKILL.md returns its documentation."""
    skill_dir = tmp_path / "doc_skill"
    skill_dir.mkdir()

    (skill_dir / "SKILL.md").write_text("# My Skill\nDoes things.", encoding="utf-8")

    import antigravity_engine.skills.loader as loader_mod

    original_file = loader_mod.__file__
    try:
        loader_mod.__file__ = str(tmp_path / "loader.py")
        tools: dict = {}
        result = load_skills(tools)
        assert "My Skill" in result
        assert "doc_skill" in result
    finally:
        loader_mod.__file__ = original_file


def test_bad_module_does_not_crash(tmp_path: Path):
    """A skill with a broken tools.py logs error but doesn't crash."""
    skill_dir = tmp_path / "broken_skill"
    skill_dir.mkdir()

    (skill_dir / "tools.py").write_text("raise RuntimeError('boom')", encoding="utf-8")

    import antigravity_engine.skills.loader as loader_mod

    original_file = loader_mod.__file__
    try:
        loader_mod.__file__ = str(tmp_path / "loader.py")
        tools: dict = {}
        # Should not raise
        result = load_skills(tools)
        assert len(tools) == 0
    finally:
        loader_mod.__file__ = original_file


def test_load_skills_caches_per_directory(tmp_path: Path):
    """Repeated loads from the same directory should reuse cached results."""
    skill_dir = tmp_path / "cached_skill"
    skill_dir.mkdir()
    (skill_dir / "SKILL.md").write_text("# Cached Skill\nFirst version.", encoding="utf-8")
    (skill_dir / "tools.py").write_text(
        textwrap.dedent("""\
        def cached_tool() -> str:
            \"\"\"Return a stable value.\"\"\"
            return "ok"
        """),
        encoding="utf-8",
    )

    import antigravity_engine.skills.loader as loader_mod

    original_file = loader_mod.__file__
    try:
        loader_mod.__file__ = str(tmp_path / "loader.py")
        loader_mod._SKILLS_CACHE.clear()

        first_tools: dict = {}
        first_docs = load_skills(first_tools)

        (skill_dir / "SKILL.md").write_text("# Cached Skill\nSecond version.", encoding="utf-8")
        second_tools: dict = {}
        second_docs = load_skills(second_tools)

        assert first_docs == second_docs
        assert "cached_tool" in second_tools
        assert "Second version." not in second_docs
    finally:
        loader_mod.__file__ = original_file
        loader_mod._SKILLS_CACHE.clear()
