# Project Context

## Purpose
**Google Antigravity Workspace Template** is a production-grade starter kit for building autonomous AI agents.
Its primary goals are to provide a minimal, transparent workspace where agents have:
- **Infinite Memory** via recursive summarization.
- **Auto-discovery** of tools and context.
- **Seamless Connectivity** to external systems via the Model Context Protocol (MCP).
- **Multi-Agent Coordination** using a Swarm (Router-Worker) pattern.
- **Artifact-First Workflow** where every task produces plans, logs, and evidence.

## Tech Stack
- **Language:** Python 3.10+
- **AI Model:** Google GenAI (Optimized for Gemini 2.0 Flash), but architecture is LLM agnostic.
- **Data Validation:** Pydantic (used for tool arguments and return values).
- **Integration:** Model Context Protocol (MCP) `mcp[cli]`.
- **Knowledge Hub:** `openai-agents[litellm]` for multi-agent project context pipelines.
- **CLI:** `typer` + `rich` for the `ag` command-line tool.
- **Testing:** Pytest.
- **Environment:** `python-dotenv` for configuration.

## Project Conventions

### Code Style
- **Python:**
  - **Type Hints:** Mandatory for all function signatures (e.g., `def func(a: int) -> bool:`).
  - **Docstrings:** Google-style docstrings are required for all tools to enable agent discovery (Must include `Args:`, `Returns:`, `Raises:`).
  - **Pydantic:** Use Pydantic models for complex data structures.

### Architecture Patterns
- **Tool Isolation:** All external interactions (API calls, I/O) must be encapsulated as functions in `antigravity_engine/tools/`.
- **Statelessness:** Tools should generally be stateless; context is passed via arguments.
- **Swarm Orchestrator:** Uses a Router-Worker pattern to delegate complex tasks to specialist agents (Coder, Reviewer, Researcher).
- **Event-Driven:** The architecture supports event-driven workflows.
- **Zero-Config:** Configuration is auto-loaded from `.antigravity/` (primary) and `.context/` (backward-compatible fallback).

### Testing Strategy
- **Framework:** `pytest` is the standard testing framework.
- **Scope:** Tests should cover agent logic (`tests/test_agent.py`), memory management (`tests/test_memory.py`), and MCP integration (`tests/test_mcp.py`).
- **Safety:** Tools must fail gracefully with error messages rather than crashing the agent.

### Git Workflow
- Standard feature-branch workflow.
- Commits should be atomic and descriptive.
- Documentation (in `docs/`) should be updated alongside code changes.

### Knowledge Hub
- **Hub Module** (`antigravity_engine/hub/`): Multi-agent pipelines for project context management — scans the workspace, generates conventions docs, and answers project questions via LLM.
- **CLI Commands:** `ag refresh` scans the project and updates `.antigravity/conventions.md`. `ag ask` answers questions about the project. `ag report` and `ag log-decision` append to memory/decision logs.

## Domain Context
- **Infinite Memory:** The system uses recursive summarization to compress interaction history, allowing long-running contexts without hitting token limits.
- **Model Context Protocol (MCP):** A standard for connecting AI assistants to systems (databases, GitHub, filesystems). The agent acts as an MCP client.
- **Swarm Protocol:** A method for coordinating multiple specialized agents to solve complex problems by breaking them down into sub-tasks.

## Important Constraints
- **Gemini Optimization:** While LLM agnostic, the prompt engineering and memory structures are currently optimized for Gemini 2.0 Flash.
- **Security:** Tools must not expose secrets. All environment variables should be managed via `.env`.

## External Dependencies
- **Google Gemini API:** Primary intelligence provider.
- **MCP Servers:** External servers (e.g., `@modelcontextprotocol/server-github`) that the agent connects to for extended capabilities.
