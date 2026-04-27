from antigravity_engine.memory import MemoryManager


def test_markdown_memory_files_written(tmp_path):
    memory_file = tmp_path / "memory" / "agent_memory.md"
    summary_file = tmp_path / "memory" / "agent_summary.md"

    manager = MemoryManager(
        memory_file=str(memory_file),
        summary_file=str(summary_file),
    )
    manager.add_entry("user", "hello markdown memory")

    assert memory_file.exists()
    assert summary_file.exists()
    text = memory_file.read_text(encoding="utf-8")
    assert "### Entry 1 | role=user" in text
    assert "hello markdown memory" in text


def test_summary_checkpoint_avoids_resummarizing_same_history(tmp_path):
    manager = MemoryManager(
        memory_file=str(tmp_path / "agent_memory.md"),
        summary_file=str(tmp_path / "agent_summary.md"),
    )

    for i in range(5):
        manager.add_entry("user", f"msg {i}")

    call_counter = {"count": 0}

    def summarizer(old_messages, previous_summary):
        call_counter["count"] += 1
        joined = "; ".join(msg["content"] for msg in old_messages)
        return f"{previous_summary}|{joined}".strip("|")

    manager.get_context_window("SYS", max_messages=2, summarizer=summarizer)
    manager.get_context_window("SYS", max_messages=2, summarizer=summarizer)

    assert call_counter["count"] == 1
    assert manager.summary_checkpoint == 3
    assert "msg 0; msg 1; msg 2" in manager.summary


def test_markdown_memory_retrieval_context(tmp_path):
    manager = MemoryManager(
        memory_file=str(tmp_path / "agent_memory.md"),
        summary_file=str(tmp_path / "agent_summary.md"),
    )

    manager.add_entry("assistant", "Microsandbox was enabled for runtime isolation.")
    manager.add_entry("assistant", "Docker sandbox runtime has been removed.")
    manager.add_entry("user", "Need guidance for enterprise architecture.")

    context = manager.build_retrieval_context("microsandbox runtime", limit=2)
    assert "microsandbox" in context.lower()
