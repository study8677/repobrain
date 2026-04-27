# 📚 Antigravity Workspace Documentation

Welcome to the comprehensive documentation for the **Antigravity Workspace Template** — a production-grade starter kit for building autonomous AI agents on Google Antigravity.

## 🎯 Quick Navigation

### Getting Started
- **[Quick Start Guide](QUICK_START.md)** — Installation, local development, and first steps
- **[Project Philosophy](PHILOSOPHY.md)** — Core concepts and Artifact-First protocol

### Core Features
- **[Zero-Config Features](ZERO_CONFIG.md)** — Automatic tool and context discovery
- **[MCP Integration](MCP_INTEGRATION.md)** — Connect to external tools and data sources
- **[Multi-Agent Swarm](SWARM_PROTOCOL.md)** — Orchestrate specialist agents for complex tasks

### Planning & Vision
- **[Development Roadmap](ROADMAP.md)** — Current progress and future plans through Phase 9

## 🌟 Key Features

### 🧠 Infinite Memory Engine
Recursive summarization automatically compresses history—context limits are a thing of the past.

### 🛠️ Universal Tool Protocol
Generic ReAct pattern. Just register any Python function in `antigravity_engine/tools/`, and the Agent learns to use it automatically.

### 🎓 Skill-Based Project Initialization
Use the built-in `agent-repo-init` skill to bootstrap a clean repository from this template.
It supports `quick` and `full` modes and includes a portable script at `skills/agent-repo-init/scripts/init_project.py`.

### ⚡️ Gemini Native
Optimized for Gemini 2.0 Flash's speed and function calling capabilities.

### 🔌 External LLM Support
Call any OpenAI-compatible API via the built-in `call_openai_chat` tool (supports OpenAI, Azure, Ollama).

## 🚀 Common Tasks

### I want to...

| Task | Documentation |
|------|----------------|
| Get started with the agent | [Quick Start](QUICK_START.md) |
| Build a custom tool | [Zero-Config Features](ZERO_CONFIG.md) |
| Initialize a new project from this template | [Zero-Config Features](ZERO_CONFIG.md) |
| Connect to an MCP server | [MCP Integration](MCP_INTEGRATION.md) |
| Use multiple agents | [Multi-Agent Swarm](SWARM_PROTOCOL.md) |
| Understand the architecture | [Project Philosophy](PHILOSOPHY.md) |
| See what's coming | [Development Roadmap](ROADMAP.md) |
| Query project context | `ag ask "question"` / `ag refresh` |

## 📊 Project Structure

```
.
├── .antigravity/        # 🛸 Antigravity config/rules
├── .context/            # 📚 Knowledge base auto-injected
├── artifacts/           # 📂 Agent outputs (plans, logs, visuals)
├── antigravity_engine/   # 🧠 Agent source code
│   ├── agent.py         # Main agent loop
│   ├── memory.py        # JSON memory manager
│   ├── mcp_client.py    # MCP integration
│   ├── swarm.py         # Multi-agent orchestration
│   ├── agents/          # Specialist agents
│   │   ├── base_agent.py
│   │   ├── coder_agent.py
│   │   ├── reviewer_agent.py
│   │   └── researcher_agent.py
│   ├── tools/           # Tool implementations
│   │   ├── demo_tool.py
│   │   └── mcp_tools.py
│   └── hub/             # Knowledge Hub (scanner, agents, pipeline)
├── tests/               # ✅ Test suite
├── scripts/             # 🧪 Utility scripts
├── docker-compose.yml   # Local dev stack
├── README.md            # Main landing page
└── pyproject.toml       # Python dependencies
```

## 🎓 Documentation by Role

### For Developers
1. Start with [Quick Start](QUICK_START.md)
2. Learn [Zero-Config tool discovery](ZERO_CONFIG.md)
3. Explore the [swarm protocol](SWARM_PROTOCOL.md)

### For DevOps/Deployment
1. Read [Quick Start](QUICK_START.md) Docker section
2. Check [Development Roadmap](ROADMAP.md) Phase 9 (Enterprise Core)
3. Configure MCP servers in [MCP Integration](MCP_INTEGRATION.md)

### For Architects
1. Understand [Project Philosophy](PHILOSOPHY.md)
2. Study [Multi-Agent Swarm](SWARM_PROTOCOL.md) architecture
3. Review [Development Roadmap](ROADMAP.md) vision

### For Contributors
1. Read [Project Philosophy](PHILOSOPHY.md)
2. Check [Development Roadmap](ROADMAP.md) Phase 9
3. Open an issue to propose ideas

## 🔗 External Resources

- 🌐 [Antigravity Official Docs](https://docs.antigravity.dev/)
- 📘 [MCP Protocol Specification](https://modelcontextprotocol.io/)
- 🐍 [Python Documentation](https://docs.python.org/3/)
- 🐳 [Docker Documentation](https://docs.docker.com/)
- 🧪 [Pytest Documentation](https://docs.pytest.org/)

## ❓ FAQ

**Q: Can I use this with OpenAI instead of Gemini?**  
A: Yes! Set `OPENAI_BASE_URL` and `OPENAI_API_KEY` in `.env`. See [Quick Start](QUICK_START.md) for details.

**Q: How do I add a custom tool?**  
A: Drop a Python file in `antigravity_engine/tools/` with your functions. No registration needed! See [Zero-Config Features](ZERO_CONFIG.md).

**Q: How do I initialize a fresh project from this template?**  
A: Use the `agent-repo-init` skill in `quick` or `full` mode, or run `skills/agent-repo-init/scripts/init_project.py`. See [Zero-Config Features](ZERO_CONFIG.md).

**Q: How do I deploy to production?**  
A: Use Docker! See [Quick Start](QUICK_START.md) Docker section.

**Q: Can I use multiple agents?**  
A: Yes! Use the swarm system. See [Multi-Agent Swarm](SWARM_PROTOCOL.md).

**Q: How do I add context/knowledge?**
A: Create files in `.context/` directory. They're automatically loaded! See [Zero-Config Features](ZERO_CONFIG.md).

**Q: What is the Knowledge Hub?**
A: The Knowledge Hub (`ag ask`, `ag refresh`, `ag report`, `ag log-decision`) maintains project context in `.antigravity/`, making all AI IDEs smarter. See the main [README](../../README.md).

**Q: What languages does module detection support?**
A: Python, TypeScript/JavaScript, Go, Rust, Java, Kotlin, Swift, C/C++, and C#. The scanner uses a unified extension list to detect modules across all supported languages.

**Q: What are structured facts?**
A: Since April 2026, `ag refresh` produces structured JSON claims with source evidence (file path + line range) per module. `ag ask` verifies these claims against live source before answering, reducing hallucination and improving traceability.

## 🤝 Contributing

We welcome contributions at all levels:

### Report Issues
Found a bug? [Open an issue](https://github.com/study8677/antigravity-workspace-template/issues)

### Suggest Ideas
Have an architectural idea? Ideas are contributions too!  
[Propose your thought](https://github.com/study8677/antigravity-workspace-template/issues/new)

### Submit Code
Ready to code? Check the [Roadmap](ROADMAP.md) Phase 9 for open areas.

### Improve Docs
See a typo or unclear section? Submit a PR to improve the docs!

## 📞 Support

- 📖 **Documentation**: You're reading it! (or check [README.md](../../README.md))
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/study8677/antigravity-workspace-template/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/study8677/antigravity-workspace-template/discussions)
- 👥 **Community**: [Star the repo](https://github.com/study8677/antigravity-workspace-template) to stay updated

## 👥 Contributors

- [@devalexanderdaza](https://github.com/devalexanderdaza) — First contributor. Implemented demo tools, enhanced agent functionality, proposed the "Agent OS" roadmap, and completed MCP integration.
- [@Subham-KRLX](https://github.com/Subham-KRLX) — Added dynamic tools and context loading (Fixes #4) and the multi-agent cluster protocol (Fixes #6).
- [@SunkenCost](https://github.com/SunkenCost) — Added `ag clean` command and `__main__` entry-point guard (#37).
- [@aravindhbalaji04](https://github.com/aravindhbalaji04) — Unified instruction surface around `AGENTS.md` (#41).
- [@xiaolai](https://github.com/xiaolai) — Provided [NLPM](https://github.com/xiaolai/nlpm-for-claude) audit feedback that improved skill frontmatter and dependency hygiene (#51, #52, #53).

## 📄 License

This project is licensed under the **MIT License**. See [LICENSE](../../LICENSE) for details.

---

**Latest Update:** April 2026
**Version:** Phase 10 (Knowledge Hub) ✅ — structured evidence pipeline + multi-language module support

**Happy building with Antigravity!** 🚀

Friendly Link: [LINUX DO](https://linux.do/)
