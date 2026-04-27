import json

from antigravity_engine.memory import MemoryManager


def test_context_window_without_overflow(tmp_path):
    memory_file = tmp_path / "memory.md"
    summary_file = tmp_path / "summary.md"
    manager = MemoryManager(
        memory_file=str(memory_file),
        summary_file=str(summary_file),
    )

    manager.add_entry("user", "Hello")
    manager.add_entry("assistant", "Hi there")

    window = manager.get_context_window("SYS", max_messages=5)

    assert window[0]["role"] == "system"
    assert window[0]["content"] == "SYS"
    assert window[1]["content"] == "Hello"
    assert window[2]["content"] == "Hi there"
    assert manager.summary == ""


def test_context_window_with_summary_buffer(tmp_path):
    memory_file = tmp_path / "memory.md"
    summary_file = tmp_path / "summary.md"
    manager = MemoryManager(
        memory_file=str(memory_file),
        summary_file=str(summary_file),
    )

    for i in range(4):
        manager.add_entry("user", f"msg {i}")

    def summarizer(old_msgs, prev_summary):
        joined = "; ".join(msg["content"] for msg in old_msgs)
        return f"{prev_summary}|{joined}".strip("|")

    window = manager.get_context_window("SYS", max_messages=2, summarizer=summarizer)

    assert window[0]["role"] == "system"
    assert window[1]["content"].startswith("Previous Summary: ")
    assert len(window) == 4  # system prompt + summary + 2 recent messages
    assert manager.summary == "msg 0; msg 1"
    assert window[-1]["content"] == "msg 3"


def test_context_window_skips_empty_summary_message(tmp_path):
    memory_file = tmp_path / "memory.json"
    manager = MemoryManager(memory_file=str(memory_file))

    for i in range(3):
        manager.add_entry("user", f"msg {i}")

    def summarizer(_old_msgs, _prev_summary):
        return ""

    window = manager.get_context_window("SYS", max_messages=1, summarizer=summarizer)

    assert window[0]["role"] == "system"
    assert window[0]["content"] == "SYS"
    assert len(window) == 2  # system prompt + 1 recent message
    assert manager.summary == ""


def test_loads_legacy_memory_format(tmp_path):
    legacy_file = tmp_path / "legacy.json"
    summary_file = tmp_path / "summary.md"
    legacy_payload = [{"role": "user", "content": "legacy hi", "metadata": {}}]
    with open(legacy_file, "w", encoding="utf-8") as f:
        json.dump(legacy_payload, f)

    manager = MemoryManager(
        memory_file=str(legacy_file),
        summary_file=str(summary_file),
    )

    assert manager.summary == ""
    assert manager.get_history() == []
