import json
import re
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

from antigravity_engine.config import settings


ENTRY_PATTERN = re.compile(
    r"^### Entry (?P<index>\d+) \| role=(?P<role>[^\n|]+) \| ts=(?P<timestamp>[^\n]+)\n"
    r"metadata: (?P<metadata>[^\n]*)\n"
    r"````text\n(?P<content>.*?)\n````\n?",
    re.MULTILINE | re.DOTALL,
)
SUMMARY_CHECKPOINT_PATTERN = re.compile(
    r"^summary_checkpoint:\s*(?P<checkpoint>\d+)\s*$",
    re.MULTILINE,
)
SUMMARY_BLOCK_PATTERN = re.compile(
    r"## Summary\n````text\n(?P<summary>.*?)\n````",
    re.DOTALL,
)


class MemoryManager:
    """Markdown-first memory manager for agent conversations.

    Storage strategy:
    - Markdown files (`memory/agent_memory.md` + `memory/agent_summary.md`)
    """

    def __init__(
        self,
        memory_file: Optional[str] = None,
        summary_file: Optional[str] = None,
    ) -> None:
        """
        Initialize memory storage.

        Args:
            memory_file: Optional memory file path override.
            summary_file: Optional summary file path override.
        """
        target_memory_file = memory_file or settings.MEMORY_FILE
        target_summary_file = summary_file or settings.MEMORY_SUMMARY_FILE

        self.memory_file = settings.resolve_path(target_memory_file)
        self.summary_file = settings.resolve_path(target_summary_file)
        self.summary: str = ""
        self.summary_checkpoint: int = 0
        self._memory: List[Dict[str, Any]] = []
        self._load_memory()

    def _parse_markdown_entries(self, content: str) -> List[Dict[str, Any]]:
        """Parse markdown entry blocks into structured history.

        Args:
            content: Raw markdown memory content.

        Returns:
            Parsed message entries.
        """
        entries: List[Dict[str, Any]] = []
        for match in ENTRY_PATTERN.finditer(content):
            raw_metadata = (match.group("metadata") or "").strip()
            metadata: Dict[str, Any] = {}
            if raw_metadata:
                try:
                    parsed_metadata = json.loads(raw_metadata)
                    if isinstance(parsed_metadata, dict):
                        metadata = parsed_metadata
                except json.JSONDecodeError:
                    metadata = {"raw": raw_metadata}

            entries.append(
                {
                    "role": match.group("role").strip(),
                    "content": match.group("content"),
                    "metadata": metadata,
                    "timestamp": match.group("timestamp").strip(),
                }
            )
        return entries

    def _load_markdown_memory(self) -> None:
        """Load raw history from markdown storage."""
        self._memory = []
        if not self.memory_file.exists():
            return

        raw_content = self.memory_file.read_text(encoding="utf-8")
        self._memory = self._parse_markdown_entries(raw_content)

    def _load_markdown_summary(self) -> None:
        """Load summary/checkpoint state from markdown summary file."""
        self.summary = ""
        self.summary_checkpoint = 0

        if not self.summary_file.exists():
            return

        content = self.summary_file.read_text(encoding="utf-8")

        checkpoint_match = SUMMARY_CHECKPOINT_PATTERN.search(content)
        if checkpoint_match:
            checkpoint_str = checkpoint_match.group("checkpoint")
            self.summary_checkpoint = (
                int(checkpoint_str) if checkpoint_str.isdigit() else 0
            )

        summary_match = SUMMARY_BLOCK_PATTERN.search(content)
        if summary_match:
            self.summary = summary_match.group("summary").strip()

    def _load_memory(self) -> None:
        """Load memory state from storage."""
        self._load_markdown_memory()
        self._load_markdown_summary()

    def _render_markdown_memory(self) -> str:
        """Render history as markdown content."""
        lines: List[str] = [
            "# Agent Memory Log",
            "",
            "Append-only conversational memory for the agent runtime.",
            "",
            "## Entries",
            "",
        ]

        if not self._memory:
            lines.extend(["_No entries yet._", ""])
            return "\n".join(lines)

        for index, entry in enumerate(self._memory, 1):
            role = str(entry.get("role", "unknown"))
            timestamp = str(entry.get("timestamp") or datetime.now(timezone.utc).isoformat())
            metadata = (
                entry.get("metadata")
                if isinstance(entry.get("metadata"), dict)
                else {}
            )
            metadata_json = json.dumps(metadata, ensure_ascii=False, sort_keys=True)
            content = str(entry.get("content", ""))

            # Keep a stable timestamp once generated.
            if not entry.get("timestamp"):
                entry["timestamp"] = timestamp

            lines.extend(
                [
                    f"### Entry {index} | role={role} | ts={timestamp}",
                    f"metadata: {metadata_json}",
                    "````text",
                    content,
                    "````",
                    "",
                ]
            )

        return "\n".join(lines)

    def _save_markdown_memory(self) -> None:
        """Persist raw memory entries to markdown file."""
        self.memory_file.parent.mkdir(parents=True, exist_ok=True)
        self.memory_file.write_text(self._render_markdown_memory(), encoding="utf-8")

    def _render_markdown_summary(self) -> str:
        """Render summary/checkpoint state as markdown."""
        summary_text = self.summary or ""
        lines = [
            "# Agent Memory Summary",
            "",
            f"summary_checkpoint: {self.summary_checkpoint}",
            "",
            "## Summary",
            "````text",
            summary_text,
            "````",
            "",
        ]
        return "\n".join(lines)

    def _save_markdown_summary(self) -> None:
        """Persist summary/checkpoint state to markdown file."""
        self.summary_file.parent.mkdir(parents=True, exist_ok=True)
        self.summary_file.write_text(self._render_markdown_summary(), encoding="utf-8")

    def _save_summary_state(self) -> None:
        """Persist summary/checkpoint without rewriting raw markdown history."""
        self._save_markdown_summary()

    def save_memory(self) -> None:
        """Save full memory state to storage."""
        self._save_markdown_memory()
        self._save_markdown_summary()

    def add_entry(
        self,
        role: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Add a new interaction entry and persist.

        Args:
            role: Message role (for example user/assistant/tool/system).
            content: Message content body.
            metadata: Optional structured metadata.
        """
        entry: Dict[str, Any] = {
            "role": role,
            "content": content,
            "metadata": metadata or {},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self._memory.append(entry)
        self.save_memory()

    def get_history(self) -> List[Dict[str, Any]]:
        """Return full conversation history."""
        return self._memory

    def search_history(self, query: str, limit: int = 6) -> List[Dict[str, Any]]:
        """Search memory entries using lightweight keyword scoring.

        Args:
            query: Query text to match.
            limit: Maximum number of entries to return.

        Returns:
            A relevance-ranked list of matched entries.
        """
        cleaned_query = (query or "").strip().lower()
        if not cleaned_query or limit < 1:
            return []

        tokens = [token for token in re.findall(r"[a-zA-Z0-9_]+", cleaned_query) if len(token) >= 2]
        if not tokens:
            tokens = [cleaned_query]

        scored_entries: List[tuple[int, int, Dict[str, Any]]] = []
        for index, entry in enumerate(self._memory):
            content = str(entry.get("content", ""))
            content_lower = content.lower()
            score = sum(content_lower.count(token) for token in tokens)
            if score > 0:
                scored_entries.append((score, index, entry))

        scored_entries.sort(key=lambda item: (item[0], item[1]), reverse=True)
        return [dict(item[2]) for item in scored_entries[:limit]]

    def build_retrieval_context(
        self,
        query: str,
        limit: int = 6,
        max_chars: int = 1600,
    ) -> str:
        """Build a compact memory context block for prompt injection.

        Args:
            query: User task/query used for retrieval.
            limit: Number of candidate entries.
            max_chars: Maximum rendered character budget.

        Returns:
            Formatted retrieval context text.
        """
        matches = self.search_history(query=query, limit=limit)
        if not matches:
            return "No relevant prior memory snippets found."

        lines: List[str] = []
        for item in matches:
            role = str(item.get("role", "unknown"))
            timestamp = str(item.get("timestamp", "n/a"))
            content = str(item.get("content", "")).strip().replace("\n", " ")
            if len(content) > 220:
                content = content[:217] + "..."
            lines.append(f"- [{role} | {timestamp}] {content}")

        block = "\n".join(lines)
        if len(block) <= max_chars:
            return block
        return block[: max_chars - 20].rstrip() + "\n... (truncated)"

    def _default_summarizer(
        self,
        old_messages: List[Dict[str, Any]],
        previous_summary: str,
    ) -> str:
        """Fallback summarization that compacts old messages.

        Args:
            old_messages: Messages selected for summarization.
            previous_summary: Previous summary text.

        Returns:
            Updated summary text.
        """
        lines: List[str] = []
        if previous_summary:
            lines.append(previous_summary.strip())
        for message in old_messages:
            role = message.get("role", "unknown")
            content = message.get("content", "")
            lines.append(f"{role}: {content}")
        return "\n".join(lines).strip()

    def get_context_window(
        self,
        system_prompt: str,
        max_messages: int,
        summarizer: Optional[Callable[[List[Dict[str, Any]], str], str]] = None,
    ) -> List[Dict[str, str]]:
        """Build context window with checkpointed summary compression.

        Args:
            system_prompt: System prompt to prepend.
            max_messages: Count of recent messages to keep verbatim.
            summarizer: Optional custom summarizer.

        Returns:
            Prompt-ready message list.

        Raises:
            ValueError: If inputs are invalid or summarizer output is invalid.
            TypeError: If summarizer signature is invalid.
        """
        if not system_prompt:
            raise ValueError("system_prompt is required to build the context window.")
        if max_messages < 1:
            raise ValueError("max_messages must be at least 1.")

        history = self.get_history()
        system_message: Dict[str, str] = {"role": "system", "content": system_prompt}

        if len(history) <= max_messages:
            return [system_message, *history]

        summarizer_fn = summarizer or self._default_summarizer
        cutoff_index = len(history) - max_messages
        start_index = min(max(self.summary_checkpoint, 0), cutoff_index)
        messages_to_summarize = [dict(msg) for msg in history[start_index:cutoff_index]]
        recent_history = [dict(msg) for msg in history[cutoff_index:]]

        if messages_to_summarize:
            try:
                new_summary = summarizer_fn(messages_to_summarize, self.summary)
            except TypeError as exc:
                raise TypeError(
                    "Summarizer must accept two arguments: (old_messages, previous_summary)."
                ) from exc

            if not isinstance(new_summary, str):
                raise ValueError("Summarizer must return a string.")

            previous_summary = self.summary
            previous_checkpoint = self.summary_checkpoint
            self.summary = new_summary.strip()
            self.summary_checkpoint = cutoff_index

            if (
                self.summary != previous_summary
                or self.summary_checkpoint != previous_checkpoint
            ):
                self._save_summary_state()

        summary_message = None
        if self.summary:
            summary_message = {
                "role": "system",
                "content": f"Previous Summary: {self.summary}"
            }

        if summary_message:
            return [system_message, summary_message, *recent_history]
        return [system_message, *recent_history]

    def clear_memory(self) -> None:
        """Clear history and summary state."""
        self._memory = []
        self.summary = ""
        self.summary_checkpoint = 0
        self.save_memory()
