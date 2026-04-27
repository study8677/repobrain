"""
Tests for MCP (Model Context Protocol) integration.

These tests verify:
- MCP configuration loading
- MCP client manager initialization
- Tool discovery and registration
- Error handling for missing dependencies
"""

import json
import os
import pytest
from pathlib import Path
from unittest.mock import MagicMock, patch, AsyncMock
from typing import Dict, Any

# Test configuration
from antigravity_engine.config import settings, MCPServerConfig


class TestMCPServerConfig:
    """Tests for MCPServerConfig model."""

    def test_default_values(self):
        """Test that MCPServerConfig has correct defaults."""
        config = MCPServerConfig(name="test-server")

        assert config.name == "test-server"
        assert config.transport == "stdio"
        assert config.command is None
        assert config.args == []
        assert config.url is None
        assert config.env == {}
        assert config.enabled is True

    def test_stdio_config(self):
        """Test stdio transport configuration."""
        config = MCPServerConfig(
            name="filesystem",
            transport="stdio",
            command="npx",
            args=["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
            enabled=True,
        )

        assert config.transport == "stdio"
        assert config.command == "npx"
        assert len(config.args) == 3

    def test_http_config(self):
        """Test HTTP transport configuration."""
        config = MCPServerConfig(
            name="custom-api",
            transport="http",
            url="http://localhost:8000/mcp",
            enabled=True,
        )

        assert config.transport == "http"
        assert config.url == "http://localhost:8000/mcp"


class TestMCPSettings:
    """Tests for MCP-related settings."""

    def test_mcp_settings_defaults(self):
        """Test that MCP settings have correct defaults."""
        assert hasattr(settings, "MCP_ENABLED")
        assert hasattr(settings, "MCP_SERVERS_CONFIG")
        assert hasattr(settings, "MCP_CONNECTION_TIMEOUT")
        assert hasattr(settings, "MCP_TOOL_PREFIX")

        # Default values
        assert settings.MCP_SERVERS_CONFIG == "mcp_servers.json"
        assert settings.MCP_CONNECTION_TIMEOUT == 30
        assert settings.MCP_TOOL_PREFIX == "mcp_"


class TestMCPConfigFile:
    """Tests for MCP configuration file."""

    # Resolve path relative to project root (engine/../mcp_servers.json)
    _CONFIG_PATH = Path(__file__).resolve().parent.parent.parent / "mcp_servers.json"

    @pytest.mark.skipif(
        not (Path(__file__).resolve().parent.parent.parent / "mcp_servers.json").exists(),
        reason="mcp_servers.json not present (CI runs from engine/)",
    )
    def test_config_file_exists(self):
        """Test that mcp_servers.json exists."""
        assert self._CONFIG_PATH.exists(), "mcp_servers.json should exist"

    @pytest.mark.skipif(
        not (Path(__file__).resolve().parent.parent.parent / "mcp_servers.json").exists(),
        reason="mcp_servers.json not present (CI runs from engine/)",
    )
    def test_config_file_valid_json(self):
        """Test that mcp_servers.json is valid JSON."""
        with open(self._CONFIG_PATH, "r") as f:
            data = json.load(f)

        assert "servers" in data
        assert isinstance(data["servers"], list)

    @pytest.mark.skipif(
        not (Path(__file__).resolve().parent.parent.parent / "mcp_servers.json").exists(),
        reason="mcp_servers.json not present (CI runs from engine/)",
    )
    def test_config_servers_have_required_fields(self):
        """Test that all servers in config have required fields."""
        with open(self._CONFIG_PATH, "r") as f:
            data = json.load(f)

        for server in data["servers"]:
            assert "name" in server, f"Server missing 'name': {server}"
            assert "transport" in server, f"Server missing 'transport': {server}"
            assert "enabled" in server, f"Server missing 'enabled': {server}"


class TestMCPClientManager:
    """Tests for MCPClientManager class."""

    def test_import_mcp_client(self):
        """Test that mcp_client module can be imported."""
        try:
            from antigravity_engine.mcp_client import MCPClientManager, MCPTool, MCPServerConnection

            assert MCPClientManager is not None
            assert MCPTool is not None
            assert MCPServerConnection is not None
        except ImportError as e:
            # Expected if mcp library is not installed
            assert "mcp" in str(e).lower() or "No module" in str(e)

    def test_mcp_tool_dataclass(self):
        """Test MCPTool dataclass."""
        from antigravity_engine.mcp_client import MCPTool

        tool = MCPTool(
            name="test_tool",
            description="A test tool",
            server_name="test-server",
            input_schema={"type": "object"},
            original_name="test_tool",
        )

        assert tool.name == "test_tool"
        assert tool.server_name == "test-server"
        assert tool.get_prefixed_name("mcp_") == "mcp_test-server_test_tool"

    def test_mcp_server_connection_dataclass(self):
        """Test MCPServerConnection dataclass."""
        from antigravity_engine.mcp_client import MCPServerConnection

        config = MCPServerConfig(name="test", transport="stdio", command="echo")
        connection = MCPServerConnection(config=config)

        assert connection.config.name == "test"
        assert connection.connected is False
        assert connection.tools == []
        assert connection.error is None


class TestMCPTools:
    """Tests for MCP tools helper functions."""

    def test_import_mcp_tools(self):
        """Test that mcp_tools module can be imported."""
        from antigravity_engine.tools.mcp_tools import (
            list_mcp_servers,
            list_mcp_tools,
            get_mcp_tool_help,
            mcp_health_check,
        )

        assert callable(list_mcp_servers)
        assert callable(list_mcp_tools)
        assert callable(get_mcp_tool_help)
        assert callable(mcp_health_check)

    def test_list_mcp_servers_no_manager(self):
        """Test list_mcp_servers when manager is not initialized."""
        from antigravity_engine.tools.mcp_tools import list_mcp_servers, _set_mcp_manager

        # Ensure no manager is set
        _set_mcp_manager(None)

        result = list_mcp_servers()
        assert "not initialized" in result.lower() or "disabled" in result.lower()

    def test_list_mcp_tools_no_manager(self):
        """Test list_mcp_tools when manager is not initialized."""
        from antigravity_engine.tools.mcp_tools import list_mcp_tools, _set_mcp_manager

        _set_mcp_manager(None)

        result = list_mcp_tools()
        assert "not initialized" in result.lower()

    def test_get_mcp_tool_help_no_manager(self):
        """Test get_mcp_tool_help when manager is not initialized."""
        from antigravity_engine.tools.mcp_tools import get_mcp_tool_help, _set_mcp_manager

        _set_mcp_manager(None)

        result = get_mcp_tool_help("some_tool")
        assert "not initialized" in result.lower()

    def test_mcp_health_check_no_manager(self):
        """Test mcp_health_check when manager is not initialized."""
        from antigravity_engine.tools.mcp_tools import mcp_health_check, _set_mcp_manager

        _set_mcp_manager(None)

        result = mcp_health_check()
        assert "not initialized" in result.lower()


class TestMCPToolsMocked:
    """Tests for MCP tools with mocked manager."""

    def test_list_mcp_servers_with_mock_manager(self):
        """Test list_mcp_servers with a mocked manager."""
        from antigravity_engine.tools.mcp_tools import list_mcp_servers, _set_mcp_manager

        # Create mock manager
        mock_manager = MagicMock()
        mock_manager.get_status.return_value = {
            "enabled": True,
            "initialized": True,
            "servers": {
                "github": {
                    "connected": True,
                    "transport": "stdio",
                    "tools_count": 5,
                    "error": None,
                },
                "database": {
                    "connected": False,
                    "transport": "http",
                    "tools_count": 0,
                    "error": "Connection refused",
                },
            },
        }

        _set_mcp_manager(mock_manager)

        result = list_mcp_servers()

        assert "github" in result
        assert "database" in result
        assert "Connected" in result or "✅" in result
        assert "Connection refused" in result

        # Cleanup
        _set_mcp_manager(None)

    def test_list_mcp_tools_with_mock_manager(self):
        """Test list_mcp_tools with mocked tools."""
        from antigravity_engine.tools.mcp_tools import list_mcp_tools, _set_mcp_manager
        from antigravity_engine.mcp_client import MCPTool

        mock_tool = MCPTool(
            name="create_issue",
            description="Create a GitHub issue",
            server_name="github",
            input_schema={},
            original_name="create_issue",
        )

        mock_manager = MagicMock()
        mock_manager.get_all_tools.return_value = [mock_tool]

        _set_mcp_manager(mock_manager)

        result = list_mcp_tools()

        assert "github" in result.lower()
        assert "create_issue" in result

        # Cleanup
        _set_mcp_manager(None)






class TestMCPClientManagerConfigLoading:
    """Tests for configuration loading in MCPClientManager."""

    def test_load_config_from_valid_file(self):
        """Test loading configuration from valid JSON file."""
        from antigravity_engine.mcp_client import MCPClientManager

        manager = MCPClientManager(config_path="mcp_servers.json")
        configs = manager._load_server_configs()

        # Should load configs (even if all are disabled by default)
        assert isinstance(configs, list)

    def test_load_config_from_nonexistent_file(self):
        """Test loading configuration from non-existent file."""
        from antigravity_engine.mcp_client import MCPClientManager

        manager = MCPClientManager(config_path="nonexistent.json")
        configs = manager._load_server_configs()

        assert configs == []

    def test_load_config_filters_disabled_servers(self):
        """Test that disabled servers are filtered out."""
        import tempfile
        from antigravity_engine.mcp_client import MCPClientManager

        # Create temp config with one enabled, one disabled
        config_data = {
            "servers": [
                {
                    "name": "enabled-server",
                    "transport": "stdio",
                    "command": "echo",
                    "enabled": True,
                },
                {
                    "name": "disabled-server",
                    "transport": "stdio",
                    "command": "echo",
                    "enabled": False,
                },
            ]
        }

        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            json.dump(config_data, f)
            temp_path = f.name

        try:
            manager = MCPClientManager(config_path=temp_path)
            configs = manager._load_server_configs()

            assert len(configs) == 1
            assert configs[0].name == "enabled-server"
        finally:
            os.unlink(temp_path)


class TestMCPToolWrapper:
    """Tests for MCP tool wrapper functionality."""

    def test_tool_wrapper_metadata(self):
        """Test that tool wrappers have correct metadata."""
        from antigravity_engine.mcp_client import MCPClientManager, MCPServerConnection, MCPTool

        config = MCPServerConfig(name="test", transport="stdio", command="echo")
        connection = MCPServerConnection(config=config, connected=True)

        tool = MCPTool(
            name="test_tool",
            description="A test tool for testing",
            server_name="test",
            input_schema={"type": "object", "properties": {"arg1": {"type": "string"}}},
            original_name="test_tool",
        )

        manager = MCPClientManager()
        wrapper = manager._create_tool_wrapper(connection, tool)

        assert wrapper.__name__ == "mcp_test_test_tool"
        assert "test tool" in wrapper.__doc__.lower()
        assert "test" in wrapper.__doc__  # Server name
        assert "MCP" in wrapper.__doc__


class TestMCPShutdown:
    """Tests for MCP client shutdown behavior."""

    @pytest.mark.asyncio
    async def test_shutdown_skips_missing_context_managers(self):
        """Shutdown should not warn when optional context managers are absent."""
        from antigravity_engine.mcp_client import MCPClientManager, MCPServerConnection

        manager = MCPClientManager()
        config = MCPServerConfig(name="test", transport="stdio", command="echo")
        manager.servers["test"] = MCPServerConnection(config=config)

        with patch("builtins.print") as mock_print:
            await manager.shutdown()

        printed = "\n".join(
            " ".join(str(arg) for arg in call.args) for call in mock_print.call_args_list
        )
        assert "Error disconnecting" not in printed
        assert manager.servers == {}
        assert manager._initialized is False
