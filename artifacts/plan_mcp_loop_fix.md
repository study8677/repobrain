# Plan: MCP client loop handling

## Goal
Adjust MCPClientManagerSync loop management to avoid calling `run_until_complete` on a running loop, while preserving behavior for non-running loops and documenting the rationale.

## Steps
1. Inspect `src/mcp_client.py` to understand current `_get_loop`, `initialize`, and `shutdown` behavior.
2. Update loop selection logic to create a new event loop (and optionally a helper thread) when the current loop is already running.
3. Add comments explaining the need to avoid reusing a running loop to prevent `RuntimeError` regressions.
4. Validate changes with focused inspection and optional tests if applicable.

## Notes
- Keep changes minimal and aligned with existing style.
- Preserve existing behavior for non-running event loops.
