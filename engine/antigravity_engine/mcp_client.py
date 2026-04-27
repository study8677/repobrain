"""
MCP (Model Context Protocol) Client Manager.

Provides a unified interface for connecting to multiple MCP servers
and exposing their tools as callable functions for the Antigravity agent.

This module implements:
- Multi-server connection management
- Tool discovery and registration
- Transparent tool invocation across different transports (stdio, http, sse)
- Error handling and reconnection logic
"""

import asyncio
import json
import os
from typing import Any, Awaitable, Callable, Dict, List, Optional, Tuple
from dataclasses import dataclass, field

from antigravity_engine.config import settings, MCPServerConfig


@dataclass
class MCPTool:
    """Represents a tool discovered from an MCP server."""

    name: str
    description: str
    server_name: str
    input_schema: Dict[str, Any]
    original_name: str  # Name as defined in MCP server

    def get_prefixed_name(self, prefix: str = "") -> str:
        """Get the tool name with optional prefix."""
        if prefix:
            return f"{prefix}{self.server_name}_{self.original_name}"
        return f"{self.server_name}_{self.original_name}"


@dataclass
class MCPServerConnection:
    """Represents an active connection to an MCP server."""

    config: MCPServerConfig
    session: Any = None  # ClientSession when connected
    read_stream: Any = None
    write_stream: Any = None
    tools: List[MCPTool] = field(default_factory=list)
    connected: bool = False
    error: Optional[str] = None
    _client_cm: Any = None  # Client context manager for cleanup


class MCPClientManager:
    """
    Manages connections to multiple MCP servers and provides a unified
    interface for tool discovery and invocation.

    This class handles:
    - Loading server configurations from JSON file
    - Establishing and maintaining connections to MCP servers
    - Discovering available tools from each server
    - Creating callable wrappers for MCP tools
    - Error handling and graceful degradation

    Example usage:
        manager = MCPClientManager()
        await manager.initialize()
        tools = manager.get_all_tools_as_callables()
        result = await tools['mcp_github_create_issue'](title="Bug", body="...")
    """

    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize the MCP Client Manager.

        Args:
            config_path: Path to MCP servers configuration file.
                        Defaults to settings.MCP_SERVERS_CONFIG
        """
        self.config_path = config_path or settings.MCP_SERVERS_CONFIG
        self.servers: Dict[str, MCPServerConnection] = {}
        self.tool_prefix = settings.MCP_TOOL_PREFIX
        self._initialized = False
        self._lock = asyncio.Lock()

    def _load_server_configs(self) -> List[MCPServerConfig]:
        """
        Load MCP server configurations from JSON file.

        Returns:
            List of MCPServerConfig objects
        """
        config_file = settings.resolve_path(self.config_path)

        if not config_file.exists():
            print(f"   ⚠️ MCP config file not found: {config_file}")
            return []

        try:
            with open(config_file, "r", encoding="utf-8") as f:
                data = json.load(f)

            servers = data.get("servers", [])
            configs = []

            for server_data in servers:
                if server_data.get("enabled", True):
                    configs.append(MCPServerConfig(**server_data))

            return configs

        except json.JSONDecodeError as e:
            print(f"   ❌ Invalid JSON in MCP config: {e}")
            return []
        except Exception as e:
            print(f"   ❌ Error loading MCP config: {e}")
            return []

    async def initialize(self) -> None:
        """
        Initialize connections to all configured MCP servers.

        This method:
        1. Loads server configurations
        2. Establishes connections to each server
        3. Discovers available tools from each server
        """
        async with self._lock:
            if self._initialized:
                return

            if not settings.MCP_ENABLED:
                print("   ℹ️ MCP integration is disabled")
                return

            print("🔌 Initializing MCP Client Manager...")

            configs = self._load_server_configs()

            if not configs:
                print("   ℹ️ No MCP servers configured")
                return

            for config in configs:
                await self._connect_server(config)

            connected_count = sum(1 for s in self.servers.values() if s.connected)
            total_tools = sum(len(s.tools) for s in self.servers.values())

            print(f"   ✅ Connected to {connected_count}/{len(configs)} MCP servers")
            print(f"   📦 Discovered {total_tools} MCP tools")

            self._initialized = True

    async def _connect_server(self, config: MCPServerConfig) -> None:
        """
        Establish connection to a single MCP server.

        Args:
            config: Server configuration
        """
        connection = MCPServerConnection(config=config)

        try:
            print(
                f"   🔗 Connecting to MCP server: {config.name} ({config.transport})..."
            )

            if config.transport == "stdio":
                await self._connect_stdio(connection)
            elif config.transport in ("http", "streamable-http"):
                await self._connect_http(connection)
            elif config.transport == "sse":
                await self._connect_sse(connection)
            else:
                raise ValueError(f"Unsupported transport: {config.transport}")

            # Discover tools if connected
            if connection.connected and connection.session:
                await self._discover_tools(connection)
                print(
                    f"      ✓ {config.name}: {len(connection.tools)} tools discovered"
                )

        except ImportError as e:
            connection.error = f"MCP library not installed: {e}"
            print(
                f"      ⚠️ {config.name}: MCP library not installed. Run: pip install 'mcp[cli]'"
            )
        except Exception as e:
            connection.error = str(e)
            print(f"      ⚠️ {config.name}: Connection failed - {e}")

        self.servers[config.name] = connection

    async def _connect_stdio(self, connection: MCPServerConnection) -> None:
        """Connect to an MCP server using stdio transport."""
        try:
            from mcp import ClientSession, StdioServerParameters
            from mcp.client.stdio import stdio_client

            config = connection.config

            if not config.command:
                raise ValueError("stdio transport requires 'command' field")

            server_params = StdioServerParameters(
                command=config.command,
                args=config.args,
                env={**os.environ, **config.env},
            )

            # Create the client context
            # Note: We need to manage the async context carefully
            client_cm = stdio_client(server_params)
            read_stream, write_stream = await client_cm.__aenter__()

            connection.read_stream = read_stream
            connection.write_stream = write_stream
            connection._client_cm = client_cm  # Store for cleanup

            # Create session
            session = ClientSession(read_stream, write_stream)
            await session.__aenter__()
            await session.initialize()

            connection.session = session
            connection.connected = True

        except Exception as e:
            connection.error = str(e)
            connection.connected = False
            raise

    async def _connect_http(self, connection: MCPServerConnection) -> None:
        """Connect to an MCP server using HTTP/Streamable HTTP transport."""
        try:
            from mcp import ClientSession
            from mcp.client.streamable_http import streamablehttp_client

            config = connection.config

            if not config.url:
                raise ValueError("http transport requires 'url' field")

            # Create the client context
            client_cm = streamablehttp_client(config.url)
            read_stream, write_stream, _ = await client_cm.__aenter__()

            connection.read_stream = read_stream
            connection.write_stream = write_stream
            connection._client_cm = client_cm

            # Create session
            session = ClientSession(read_stream, write_stream)
            await session.__aenter__()
            await session.initialize()

            connection.session = session
            connection.connected = True

        except Exception as e:
            connection.error = str(e)
            connection.connected = False
            raise

    async def _connect_sse(self, connection: MCPServerConnection) -> None:
        """Connect to an MCP server using SSE transport."""
        # SSE is similar to HTTP but uses different client
        # For now, we'll use the same approach as HTTP
        # The MCP SDK handles the transport details
        await self._connect_http(connection)

    async def _discover_tools(self, connection: MCPServerConnection) -> None:
        """
        Discover available tools from a connected MCP server.

        Args:
            connection: Active server connection
        """
        if not connection.session:
            return

        try:
            tools_response = await connection.session.list_tools()

            for tool in tools_response.tools:
                mcp_tool = MCPTool(
                    name=tool.name,
                    description=tool.description or "No description provided",
                    server_name=connection.config.name,
                    input_schema=tool.inputSchema
                    if hasattr(tool, "inputSchema")
                    else {},
                    original_name=tool.name,
                )
                connection.tools.append(mcp_tool)

        except Exception as e:
            print(f"      ⚠️ Error discovering tools: {e}")

    def get_all_tools(self) -> List[MCPTool]:
        """
        Get all discovered tools from all connected servers.

        Returns:
            List of all MCPTool objects
        """
        all_tools = []
        for connection in self.servers.values():
            if connection.connected:
                all_tools.extend(connection.tools)
        return all_tools

    def get_all_tools_as_callables(self) -> Dict[str, Callable[..., Any]]:
        """
        Convert all MCP tools to callable functions.

        Returns:
            Dictionary mapping tool names to async callable functions
        """
        callables = {}

        for connection in self.servers.values():
            if not connection.connected:
                continue

            for tool in connection.tools:
                prefixed_name = tool.get_prefixed_name(self.tool_prefix)
                callables[prefixed_name] = self._create_tool_wrapper(connection, tool)

        return callables

    def _create_tool_wrapper(
        self, connection: MCPServerConnection, tool: MCPTool
    ) -> Callable[..., Any]:
        """
        Create a callable wrapper for an MCP tool.

        Args:
            connection: Server connection containing the tool
            tool: Tool metadata

        Returns:
            Async callable function that invokes the MCP tool
        """

        async def tool_wrapper(**kwargs) -> Any:
            """
            Wrapper function that calls the MCP tool.

            This function is dynamically created for each MCP tool and handles:
            - Argument validation
            - Tool invocation via MCP protocol
            - Result extraction and formatting
            - Error handling
            """
            if not connection.connected or not connection.session:
                return f"Error: MCP server '{connection.config.name}' is not connected"

            try:
                result = await connection.session.call_tool(
                    tool.original_name, arguments=kwargs
                )

                # Extract content from result
                if hasattr(result, "content") and result.content:
                    contents = []
                    for content in result.content:
                        if hasattr(content, "text"):
                            contents.append(content.text)
                        elif hasattr(content, "data"):
                            contents.append(f"[Binary data: {len(content.data)} bytes]")
                    return "\n".join(contents) if contents else str(result)

                # Check for structured content
                if hasattr(result, "structuredContent") and result.structuredContent:
                    return result.structuredContent

                return str(result)

            except Exception as e:
                return f"Error calling MCP tool '{tool.original_name}': {e}"

        # Set function metadata for agent tool discovery
        tool_wrapper.__name__ = tool.get_prefixed_name(self.tool_prefix)
        tool_wrapper.__doc__ = f"""[MCP:{connection.config.name}] {tool.description}

Server: {connection.config.name}
Original Name: {tool.original_name}
Transport: {connection.config.transport}

Input Schema:
{json.dumps(tool.input_schema, indent=2) if tool.input_schema else "No schema defined"}
"""

        return tool_wrapper

    def get_tool_descriptions(self) -> str:
        """
        Get formatted descriptions of all available MCP tools.

        Returns:
            Formatted string with tool descriptions for prompt injection
        """
        descriptions = []

        for connection in self.servers.values():
            if not connection.connected:
                continue

            for tool in connection.tools:
                prefixed_name = tool.get_prefixed_name(self.tool_prefix)
                desc = tool.description.strip().replace("\n", " ")
                descriptions.append(
                    f"- {prefixed_name} [MCP:{connection.config.name}]: {desc}"
                )

        return "\n".join(descriptions)

    async def call_tool(
        self, tool_name: str, arguments: Dict[str, Any]
    ) -> Tuple[bool, Any]:
        """
        Call an MCP tool by its prefixed name.

        Args:
            tool_name: The prefixed tool name
            arguments: Tool arguments

        Returns:
            Tuple of (success, result)
        """
        callables = self.get_all_tools_as_callables()

        if tool_name not in callables:
            return False, f"Tool '{tool_name}' not found"

        try:
            result = await callables[tool_name](**arguments)
            return True, result
        except Exception as e:
            return False, str(e)

    async def shutdown(self) -> None:
        """
        Gracefully close all MCP server connections.
        """
        print("🔌 Shutting down MCP connections...")

        for name, connection in self.servers.items():
            try:
                if connection.session is not None:
                    await connection.session.__aexit__(None, None, None)
                if connection._client_cm is not None:
                    await connection._client_cm.__aexit__(None, None, None)
                print(f"   ✓ Disconnected from {name}")
            except Exception as e:
                print(f"   ⚠️ Error disconnecting from {name}: {e}")

        self.servers.clear()
        self._initialized = False

    def get_status(self) -> Dict[str, Any]:
        """
        Get status information about all MCP servers.

        Returns:
            Dictionary with status information
        """
        return {
            "enabled": settings.MCP_ENABLED,
            "initialized": self._initialized,
            "servers": {
                name: {
                    "connected": conn.connected,
                    "transport": conn.config.transport,
                    "tools_count": len(conn.tools),
                    "error": conn.error,
                }
                for name, conn in self.servers.items()
            },
        }


# Synchronous wrapper for use in non-async contexts
class MCPClientManagerSync:
    """
    Synchronous wrapper for MCPClientManager.

    Provides blocking methods for environments that don't support async/await.
    """

    def __init__(self, config_path: Optional[str] = None):
        self._async_manager = MCPClientManager(config_path)
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def _get_loop(self) -> Tuple[asyncio.AbstractEventLoop, bool]:
        """Get or create an event loop.

        Returns:
            Tuple of the event loop and whether the current thread already
            has a running loop.
        """
        try:
            running_loop = asyncio.get_running_loop()
        except RuntimeError:
            running_loop = None

        if running_loop is not None:
            # Avoid calling run_until_complete on a running loop, which raises
            # RuntimeError. Use a separate loop (via a new thread) instead.
            return running_loop, True

        if self._loop is None or self._loop.is_closed():
            self._loop = asyncio.new_event_loop()

        return self._loop, False

    def _run_in_new_thread(self, coro: Awaitable[Any]) -> Any:
        """Run a coroutine in a new event loop on a dedicated thread.

        Args:
            coro: Coroutine to execute.

        Returns:
            Result of the coroutine.

        Raises:
            Exception: Any exception raised by the coroutine.
        """
        import threading

        result: Dict[str, Any] = {}

        def runner() -> None:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                result["value"] = loop.run_until_complete(coro)
            except Exception as exc:
                result["error"] = exc
            finally:
                loop.close()

        thread = threading.Thread(target=runner, daemon=True)
        thread.start()
        thread.join()

        if "error" in result:
            raise result["error"]

        return result.get("value")

    def initialize(self) -> None:
        """Initialize MCP connections synchronously."""
        loop, running = self._get_loop()
        if running:
            self._run_in_new_thread(self._async_manager.initialize())
            return
        loop.run_until_complete(self._async_manager.initialize())

    def get_all_tools_as_callables(self) -> Dict[str, Callable[..., Any]]:
        """Get all tools as sync-wrapped callables."""
        async_callables = self._async_manager.get_all_tools_as_callables()
        sync_callables = {}

        for name, async_fn in async_callables.items():

            def make_sync_wrapper(afn):
                def sync_wrapper(**kwargs):
                    loop, running = self._get_loop()
                    if running:
                        return self._run_in_new_thread(afn(**kwargs))
                    return loop.run_until_complete(afn(**kwargs))

                sync_wrapper.__name__ = afn.__name__
                sync_wrapper.__doc__ = afn.__doc__
                return sync_wrapper

            sync_callables[name] = make_sync_wrapper(async_fn)

        return sync_callables

    def get_tool_descriptions(self) -> str:
        """Get tool descriptions."""
        return self._async_manager.get_tool_descriptions()

    def shutdown(self) -> None:
        """Shutdown connections."""
        loop, running = self._get_loop()
        if running:
            self._run_in_new_thread(self._async_manager.shutdown())
            return
        loop.run_until_complete(self._async_manager.shutdown())

    def get_status(self) -> Dict[str, Any]:
        """Get status information."""
        return self._async_manager.get_status()
