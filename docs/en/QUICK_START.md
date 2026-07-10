# 🚀 Quick Start Guide

Get the RepoBrain repository knowledge engine running in minutes.

## 📋 Prerequisites

- Python 3.10+
- pip or conda
- Git

## 🏃 Local Development

### 1. Install Dependencies
```bash
python3 -m venv venv
source venv/bin/activate
pip install -e ./cli -e './engine[dev]'
```

### 2. Build the Knowledge Base
```bash
rb-refresh --workspace .
```

This command scans the project, builds `.repobrain/`, and prepares the
repository knowledge base for routed project Q&A.

### 3. Ask Project Questions
```bash
rb-ask "How does authentication work in this project?" --workspace .
```

The ask pipeline reads the generated structure map, routes to the right module
agent, and returns grounded answers with file evidence.

## 🐳 Docker Deployment

### Build & Run
```bash
docker-compose up --build
```

This builds the image from the current checkout and starts the knowledge-hub MCP
server against `/app` inside the container. Rebuild after source changes, or edit
`docker-compose.yml` if you want a bind-mounted development checkout.

### Customizing Docker
Edit `docker-compose.yml` to:
- Change environment variables
- Mount additional volumes
- Expose different ports

## 🔧 Configuration

### Environment Variables
Create a `.env` file:

```bash
# LLM Configuration
OPENAI_BASE_URL=https://your-endpoint/v1
OPENAI_API_KEY=your-key
OPENAI_MODEL=your-model

# MCP Configuration
MCP_ENABLED=true
# Required before rb-ask auto-connects external MCP servers
RB_ALLOW_MCP=true

# Retrieval graph: off, compact, or full
RB_RETRIEVAL_MODE=compact

# Custom settings
LOG_LEVEL=INFO
ARTIFACTS_DIR=artifacts
```

`ARTIFACTS_DIR` supports absolute or relative paths. Relative values are
resolved from the repository root so outputs do not drift into IDE default paths.

This project is optimized for trusted local workspaces. `RB_RETRIEVAL_MODE`
defaults to `compact`; `full` keeps richer evidence artifacts. Common secrets are
redacted before retrieval graph files are written, but snippets can still include
repository content, so do not enable rich retrieval logging for untrusted or
shared workspaces.

The default sandbox is local developer convenience, not an untrusted-code
isolation boundary. `SANDBOX_TYPE=microsandbox` is opt-in; if the runtime is not
available, the engine warns and falls back to local execution.

### Memory Management
The agent automatically manages memory via markdown files:
- `memory/agent_memory.md` (raw entries)
- `memory/agent_summary.md` (compressed summary)

To reset:

```bash
rm -f memory/agent_memory.md memory/agent_summary.md
rb-refresh --workspace .
```

## 📁 Project Structure Reference

```
├── cli/                         # Lightweight rb CLI and templates
├── engine/repobrain_engine/    # Knowledge engine, hub, MCP server, sandbox
├── artifacts/                   # Plans, reports, and benchmark outputs
├── memory/                      # Markdown interaction memory
└── .repobrain/                # Generated knowledge base in target repos
```

See [Project Structure](../README.md#project-structure) for details.

## 🧪 Running Tests

```bash
# Run all tests
pytest engine/tests cli/tests

# Run a specific engine test
pytest engine/tests/test_hub_pipeline.py -v
```

## 🐛 Troubleshooting

### Knowledge commands don't start
```bash
# Check if the engine CLI is installed
rb-ask --help
rb doctor --workspace .

# Verify OpenAI-compatible configuration
echo $OPENAI_BASE_URL
echo $OPENAI_API_KEY
```

### Tools not loading
```bash
# Verify engine tools have valid Python files
ls -la engine/repobrain_engine/tools/

# Check for syntax errors
python -m py_compile engine/repobrain_engine/tools/*.py
```

### Memory issues
```bash
# Check memory file
cat memory/agent_memory.md

# Clear memory
rm -f memory/agent_memory.md memory/agent_summary.md
```

## 🔌 MCP Integration

To enable MCP servers:

1. Set `MCP_ENABLED=true` in `.env`
2. Set `RB_ALLOW_MCP=true` only when you trust the configured servers
3. Configure servers in `mcp_servers.json`
4. Restart the command

MCP stdio servers inherit the process environment plus any configured `env`
values. Treat every enabled server as code with local permissions. See
[MCP Integration Guide](MCP_INTEGRATION.md) for detailed setup.

## 📚 Next Steps

- **Learn Philosophy**: [Project Philosophy](PHILOSOPHY.md)
- **Explore MCP**: [MCP Integration](MCP_INTEGRATION.md)
- **Multi-Agent**: [Swarm Protocol](SWARM_PROTOCOL.md)
- **Advanced**: [Zero-Config Features](ZERO_CONFIG.md)
- **Roadmap**: [Development Roadmap](ROADMAP.md)

---

**Questions?** Check the [Full Index](README.md) or open an issue on GitHub.
