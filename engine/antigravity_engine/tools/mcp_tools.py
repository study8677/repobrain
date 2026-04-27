"""
MCP Tools Integration Module.

Provides utility functions and tools for interacting with MCP servers
from within the Antigravity agent ecosystem.

These tools allow the agent to:
- List connected MCP servers and their status
- Dynamically discover available MCP tools
- Get help and documentation for MCP tools
"""

import json
from typing import Any, Dict, List, Optional

from antigravity_engine.config import settings


def list_mcp_servers() -> str:
    """List all configured MCP servers and their connection status.

    This tool provides information about which MCP servers are configured,
    whether they are connected, and how many tools each server exposes.

    Returns:
        A formatted string with server status information.

    Example:
        >>> list_mcp_servers()
        "MCP Servers Status:
         1. github (stdio) - Connected ✓ - 15 tools
         2. database (http) - Disconnected ✗ - Error: Connection refused"
    """
    try:
        from antigravity_engine.mcp_client import MCPClientManager

        # Try to get the global manager instance
        # This will be set by the agent during initialization
        manager = _get_mcp_manager()

        if manager is None:
            return "MCP integration is not initialized. Enable it in settings."

        status = manager.get_status()

        if not status.get("enabled"):
            return (
                "MCP integration is disabled. Set MCP_ENABLED=true in your .env file."
            )

        if not status.get("servers"):
            return "No MCP servers configured. Add servers to mcp_servers.json"

        lines = ["📡 MCP Servers Status:\n"]

        for i, (name, info) in enumerate(status["servers"].items(), 1):
            status_icon = "✅" if info["connected"] else "❌"
            status_text = "Connected" if info["connected"] else "Disconnected"

            line = f"  {i}. {name} ({info['transport']}) - {status_text} {status_icon}"

            if info["connected"]:
                line += f" - {info['tools_count']} tools"
            elif info.get("error"):
                line += f"\n     Error: {info['error']}"

            lines.append(line)

        return "\n".join(lines)

    except ImportError:
        return "MCP library not installed. Run: pip install 'mcp[cli]'"
    except Exception as e:
        return f"Error getting MCP status: {e}"


def list_mcp_tools(server_name: Optional[str] = None) -> str:
    """List all available tools from MCP servers.

    Args:
        server_name: Optional. Filter tools by server name.
                    If not provided, lists tools from all servers.

    Returns:
        A formatted string with available MCP tools and their descriptions.

    Example:
        >>> list_mcp_tools()
        "Available MCP Tools:

         [github] 5 tools:
           - mcp_github_create_issue: Create a new GitHub issue
           - mcp_github_list_repos: List repositories

         [database] 3 tools:
           - mcp_database_query: Execute SQL query"
    """
    try:
        manager = _get_mcp_manager()

        if manager is None:
            return "MCP integration is not initialized."

        tools = manager.get_all_tools()

        if not tools:
            return "No MCP tools available. Check server connections."

        # Group tools by server
        tools_by_server: Dict[str, List[Any]] = {}
        for tool in tools:
            if server_name and tool.server_name != server_name:
                continue

            if tool.server_name not in tools_by_server:
                tools_by_server[tool.server_name] = []
            tools_by_server[tool.server_name].append(tool)

        if not tools_by_server:
            return f"No tools found for server: {server_name}"

        lines = ["🔧 Available MCP Tools:\n"]

        for srv_name, srv_tools in tools_by_server.items():
            lines.append(f"\n[{srv_name}] {len(srv_tools)} tool(s):")

            for tool in srv_tools:
                prefixed_name = tool.get_prefixed_name(settings.MCP_TOOL_PREFIX)
                desc = (
                    tool.description[:60] + "..."
                    if len(tool.description) > 60
                    else tool.description
                )
                lines.append(f"  • {prefixed_name}")
                lines.append(f"    {desc}")

        return "\n".join(lines)

    except Exception as e:
        return f"Error listing MCP tools: {e}"


def get_mcp_tool_help(tool_name: str) -> str:
    """Get detailed help for a specific MCP tool.

    Args:
        tool_name: The name of the MCP tool (with or without prefix)

    Returns:
        Detailed documentation for the tool including input schema.

    Example:
        >>> get_mcp_tool_help("mcp_github_create_issue")
        "Tool: mcp_github_create_issue
         Server: github
         Description: Create a new GitHub issue

         Input Schema:
         {
           'title': {'type': 'string', 'required': true},
           'body': {'type': 'string', 'required': false}
         }"
    """
    try:
        manager = _get_mcp_manager()

        if manager is None:
            return "MCP integration is not initialized."

        # Normalize tool name
        search_name = tool_name
        if not search_name.startswith(settings.MCP_TOOL_PREFIX):
            search_name = settings.MCP_TOOL_PREFIX + search_name

        tools = manager.get_all_tools()

        for tool in tools:
            prefixed_name = tool.get_prefixed_name(settings.MCP_TOOL_PREFIX)

            if prefixed_name == search_name or tool.original_name == tool_name:
                lines = [
                    f"📖 Tool: {prefixed_name}",
                    f"   Server: {tool.server_name}",
                    f"   Original Name: {tool.original_name}",
                    "",
                    "Description:",
                    f"   {tool.description}",
                    "",
                    "Input Schema:",
                ]

                if tool.input_schema:
                    schema_str = json.dumps(tool.input_schema, indent=2)
                    for line in schema_str.split("\n"):
                        lines.append(f"   {line}")
                else:
                    lines.append("   No schema defined")

                return "\n".join(lines)

        return (
            f"Tool not found: {tool_name}\nUse list_mcp_tools() to see available tools."
        )

    except Exception as e:
        return f"Error getting tool help: {e}"


def mcp_health_check() -> str:
    """Perform a health check on all MCP connections.

    Tests the connectivity to all configured MCP servers and returns
    a summary of their status.

    Returns:
        Health check results for all MCP servers.
    """
    try:
        manager = _get_mcp_manager()

        if manager is None:
            return "❌ MCP integration is not initialized."

        status = manager.get_status()

        if not status.get("enabled"):
            return "⚠️ MCP integration is disabled."

        servers = status.get("servers", {})

        if not servers:
            return "⚠️ No MCP servers configured."

        connected = sum(1 for s in servers.values() if s["connected"])
        total = len(servers)

        lines = [
            f"🏥 MCP Health Check",
            f"   Status: {connected}/{total} servers connected",
            "",
        ]

        for name, info in servers.items():
            if info["connected"]:
                lines.append(f"   ✅ {name}: Healthy ({info['tools_count']} tools)")
            else:
                error = info.get("error", "Unknown error")
                lines.append(f"   ❌ {name}: Unhealthy - {error}")

        return "\n".join(lines)

    except Exception as e:
        return f"Error during health check: {e}"


# Global MCP manager instance (set by the agent during initialization)
_global_mcp_manager = None


def _set_mcp_manager(manager) -> None:
    """Set the global MCP manager instance (called by agent)."""
    global _global_mcp_manager
    _global_mcp_manager = manager


def _get_mcp_manager():
    """Get the global MCP manager instance."""
    return _global_mcp_manager
