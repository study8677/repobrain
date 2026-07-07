from antigravity_engine.tools.memory_tools import read_memory_md, search_memory_md


def test_read_memory_md(tmp_path):
    memory_file = tmp_path / "agent_memory.md"
    memory_file.write_text(
        "# Agent Memory Log\n\nMicrosandbox enabled.\n",
        encoding="utf-8",
    )

    result = read_memory_md(max_chars=1000, memory_file=str(memory_file))
    assert "Microsandbox enabled." in result


def test_search_memory_md(tmp_path):
    memory_file = tmp_path / "agent_memory.md"
    memory_file.write_text(
        "# Agent Memory Log\n\nMicrosandbox enabled.\nDocker removed.\n",
        encoding="utf-8",
    )

    result = search_memory_md(
        query="microsandbox",
        max_results=5,
        memory_file=str(memory_file),
    )
    assert "microsandbox" in result.lower()


def test_search_memory_md_falls_back_when_rg_cannot_run(tmp_path, monkeypatch):
    memory_file = tmp_path / "agent_memory.md"
    memory_file.write_text(
        "# Agent Memory Log\n\nMicrosandbox enabled.\nDocker removed.\n",
        encoding="utf-8",
    )

    def raise_permission_error(*args, **kwargs):
        raise PermissionError("rg is not executable")

    monkeypatch.setattr(
        "antigravity_engine.tools.memory_tools.subprocess.run",
        raise_permission_error,
    )

    result = search_memory_md(
        query="docker",
        max_results=5,
        memory_file=str(memory_file),
    )

    assert "Docker removed." in result


def test_search_memory_md_empty_query(tmp_path):
    memory_file = tmp_path / "agent_memory.md"
    memory_file.write_text("any", encoding="utf-8")

    result = search_memory_md(
        query="",
        max_results=5,
        memory_file=str(memory_file),
    )
    assert "cannot be empty" in result.lower()
