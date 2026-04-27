# Plan: Markdown Memory Upgrade (2026-03-02)

## Objective
Migrate agent memory from JSON-primary storage to Markdown-primary storage while preserving compression and improving retrieval behavior.

## Scope
1. Update `MemoryManager` to use Markdown files as default storage.
2. Keep backward compatibility for legacy JSON memory files.
3. Evolve compression with summary checkpoints to avoid repeated summarization drift.
4. Add memory tools for model-driven memory reading/search.
5. Inject retrieved memory snippets into each agent round before reasoning.
6. Add/adjust tests for markdown memory workflow.

## Deliverables
- `src/memory.py` refactor (MD storage + checkpointed summary)
- `src/config.py` defaults for MD memory paths
- `src/agent.py` retrieval injection per round
- `src/tools/memory_tools.py` (read/search tools)
- `tests/test_memory_markdown.py` new tests
- Updated test expectations if needed

## Validation
- Run targeted tests for memory and agent behavior.
- Run full `pytest` suite if no blockers.

## Risks
- Markdown parsing robustness for multi-line content.
- Backward compatibility with existing JSON files.
- Prompt growth if retrieval snippets are not bounded.
