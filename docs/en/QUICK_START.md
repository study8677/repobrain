# 🚀 Quick Start Guide

Get the Antigravity repository knowledge engine running in minutes.

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
ag refresh --workspace .
```

This command scans the project, builds `.antigravity/`, and prepares the
repository knowledge base for routed project Q&A.

### 3. Ask Project Questions
```bash
ag ask "How does authentication work in this project?" --workspace .
```

The ask pipeline reads the generated structure map, routes to the right module
agent, and returns grounded answers with file evidence.

## 🐳 Docker Deployment

### Build & Run
```bash
docker-compose up --build
```

This builds the published runtime image and starts the knowledge-hub MCP server
against the mounted workspace.

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

# Custom settings
LOG_LEVEL=INFO
ARTIFACTS_DIR=artifacts
```

`ARTIFACTS_DIR` supports absolute or relative paths. Relative values are
resolved from the repository root so outputs do not drift into IDE default paths.

### Memory Management
The agent automatically manages memory via markdown files:
- `memory/agent_memory.md` (raw entries)
- `memory/agent_summary.md` (compressed summary)

To reset:

```bash
rm -f memory/agent_memory.md memory/agent_summary.md
ag refresh --workspace .
```

## 📁 Project Structure Reference

```
├── cli/                         # Lightweight ag CLI and templates
├── engine/antigravity_engine/    # Knowledge engine, hub, MCP server, sandbox
├── artifacts/                   # Plans, reports, and benchmark outputs
├── memory/                      # Markdown interaction memory
└── .antigravity/                # Generated knowledge base in target repos
```

See [Project Structure](../README.md#project-structure) for details.

## 🧪 Running Tests

```bash
# Run all tests
pytest engine/tests cli/tests

# Run a specific engine test
pytest engine/tests/test_hub_pipeline.py -v

# With coverage
pytest --cov=antigravity_engine engine/tests/
```

## 🐛 Troubleshooting

### Agent doesn't start
```bash
# Check if the engine CLI is installed
ag-ask --help

# Verify OpenAI-compatible configuration
echo $OPENAI_BASE_URL
echo $OPENAI_API_KEY
```

### Tools not loading
```bash
# Verify engine tools have valid Python files
ls -la engine/antigravity_engine/tools/

# Check for syntax errors
python -m py_compile engine/antigravity_engine/tools/*.py
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
2. Configure servers in `mcp_servers.json`
3. Restart the agent

See [MCP Integration Guide](MCP_INTEGRATION.md) for detailed setup.

## 📚 Next Steps

- **Learn Philosophy**: [Project Philosophy](PHILOSOPHY.md)
- **Explore MCP**: [MCP Integration](MCP_INTEGRATION.md)
- **Multi-Agent**: [Swarm Protocol](SWARM_PROTOCOL.md)
- **Advanced**: [Zero-Config Features](ZERO_CONFIG.md)
- **Roadmap**: [Development Roadmap](ROADMAP.md)

---

**Questions?** Check the [Full Index](README.md) or open an issue on GitHub.
