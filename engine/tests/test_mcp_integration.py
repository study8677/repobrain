"""Tests for MCP consumer integration into Hub agents."""
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch



def test_build_ask_swarm_without_mcp(tmp_path: Path) -> None:
    """build_ask_swarm works normally when mcp_tools is None."""
    from antigravity_engine.hub.agents import build_ask_swarm

    # Create a minimal module structure
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "main.py").write_text("x = 1")

    agent = build_ask_swarm("test-model", workspace=tmp_path, mcp_tools=None)
    assert agent.name == "Router"
    # Verify no crash — backward compatible


def test_build_ask_swarm_with_mcp_tools(tmp_path: Path) -> None:
    """build_ask_swarm injects MCP tools into all worker agents."""
    from antigravity_engine.hub.agents import build_ask_swarm

    # Create a minimal module structure
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "main.py").write_text("x = 1")

    # Simulate MCP tools — sync callables with proper annotations
    def mcp_github_search(query: str) -> str:
        """Search GitHub issues."""
        return f"results for {query}"

    def mcp_brave_search(query: str) -> str:
        """Search the web."""
        return f"web results for {query}"

    mcp_tools = {
        "mcp_github_search": mcp_github_search,
        "mcp_brave_search": mcp_brave_search,
    }

    agent = build_ask_swarm("test-model", workspace=tmp_path, mcp_tools=mcp_tools)
    assert agent.name == "Router"

    # Router should mention MCP in its instructions
    assert "MCP tools available" in agent.instructions

    # Each worker should have the MCP tools added
    for worker in agent.handoffs:
        # Workers get local tools + MCP tools — check MCP tools are present
        tool_names = [t.name for t in worker.tools]
        assert "mcp_github_search" in tool_names, (
            f"{worker.name} missing mcp_github_search, has: {tool_names}"
        )
        assert "mcp_brave_search" in tool_names, (
            f"{worker.name} missing mcp_brave_search, has: {tool_names}"
        )


def test_build_ask_swarm_mcp_in_instructions(tmp_path: Path) -> None:
    """MCP tool names appear in ModuleAgent instructions."""
    from antigravity_engine.hub.agents import build_ask_swarm

    (tmp_path / "api").mkdir()
    (tmp_path / "api" / "server.py").write_text("app = Flask(__name__)")

    def mcp_db_query(sql: str) -> str:
        """Run a SQL query."""
        return sql

    agent = build_ask_swarm(
        "test-model",
        workspace=tmp_path,
        mcp_tools={"mcp_db_query": mcp_db_query},
    )

    # Find the Module_api worker
    module_workers = [w for w in agent.handoffs if w.name.startswith("Module_api")]
    assert len(module_workers) == 1

    worker = module_workers[0]
    assert "mcp_db_query" in worker.instructions
    assert "MCP (Model Context Protocol) tools" in worker.instructions


def test_build_ask_swarm_empty_mcp_tools(tmp_path: Path) -> None:
    """Empty mcp_tools dict behaves same as None — no MCP section."""
    from antigravity_engine.hub.agents import build_ask_swarm

    (tmp_path / "lib").mkdir()
    (tmp_path / "lib" / "utils.py").write_text("pass")

    agent = build_ask_swarm("test-model", workspace=tmp_path, mcp_tools={})
    assert "MCP tools available" not in agent.instructions


def test_ask_pipeline_mcp_disabled(tmp_path: Path, monkeypatch) -> None:
    """ask_pipeline uses host capability and does not require MCP autoconnection."""
    from antigravity_engine.config import reset_settings
    from antigravity_engine.hub.host_llm import set_host_llm_capability

    reset_settings()
    monkeypatch.setenv("MCP_ENABLED", "false")
    monkeypatch.setenv("WORKSPACE_PATH", str(tmp_path))

    (tmp_path / ".antigravity").mkdir()
    (tmp_path / ".antigravity" / "status.json").write_text("{}", encoding="utf-8")
    (tmp_path / ".antigravity" / "conventions.md").write_text("test context", encoding="utf-8")
    (tmp_path / ".antigravity" / "map.md").write_text("# Module Map\n", encoding="utf-8")
    (tmp_path / ".antigravity" / "agents").mkdir()
    (tmp_path / ".antigravity" / "agents" / "src.md").write_text("test context", encoding="utf-8")

    def fake_host_llm(request):
        assert request.task == "answer_question"
        return {"content": "test answer"}

    set_host_llm_capability(fake_host_llm)
    try:
        from antigravity_engine.hub.pipeline import ask_pipeline

        import asyncio

        result = asyncio.run(ask_pipeline(tmp_path, "test question"))
    finally:
        set_host_llm_capability(None)

    assert result == "test answer"


def test_ask_pipeline_mcp_enabled_without_runtime_opt_in(tmp_path: Path, monkeypatch) -> None:
    """MCP must not autoconnect unless AG_ALLOW_MCP is set in process env."""
    from antigravity_engine.config import reset_settings
    from antigravity_engine.hub.host_llm import set_host_llm_capability

    reset_settings()
    monkeypatch.setenv("MCP_ENABLED", "true")
    monkeypatch.delenv("AG_ALLOW_MCP", raising=False)
    monkeypatch.setenv("WORKSPACE_PATH", str(tmp_path))

    (tmp_path / ".antigravity").mkdir()
    (tmp_path / ".antigravity" / "status.json").write_text("{}", encoding="utf-8")
    (tmp_path / ".antigravity" / "conventions.md").write_text("test context", encoding="utf-8")
    (tmp_path / ".antigravity" / "map.md").write_text("# Module Map\n", encoding="utf-8")
    (tmp_path / ".antigravity" / "agents").mkdir()
    (tmp_path / ".antigravity" / "agents" / "src.md").write_text("test context", encoding="utf-8")

    def fake_host_llm(request):
        assert request.task == "answer_question"
        return {"content": "test answer"}

    set_host_llm_capability(fake_host_llm)
    try:
        with patch(
            "antigravity_engine.mcp_client.MCPClientManager.initialize",
            new_callable=AsyncMock,
        ) as mock_mcp_init:
            from antigravity_engine.hub.pipeline import ask_pipeline

            import asyncio

            result = asyncio.run(ask_pipeline(tmp_path, "test question"))

            mock_mcp_init.assert_not_called()
    finally:
        set_host_llm_capability(None)

    assert result == "test answer"
