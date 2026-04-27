## 0. Prerequisites
- [x] 0.1 Create OpenSpec change proposal
- [x] 0.2 Rename `engine/src/` to `engine/antigravity_engine/` and update all imports
- [x] 0.3 Create `engine/pyproject.toml` with entry points, `_cli_entry.py`, `__main__.py`
- [x] 0.4 Update all docs, scripts, config referencing `src/` or `requirements.txt`

## 1. Templates + Offline CLI
- [x] 1.1 Update `.antigravity/` templates (rules.md, conventions.md, decisions/.gitkeep, memory/.gitkeep, .version)
- [x] 1.2 Create IDE config templates (CLAUDE.md, AGENTS.md, .windsurfrules, .clinerules, .github/copilot-instructions.md)
- [x] 1.3 Create CLI reader.py (pure pathlib, no engine dependency)
- [x] 1.4 Add offline CLI commands (ag report, ag log-decision)
- [x] 1.5 Create CLI tests (test_reader.py)

## 2. Engine Hub + LLM Commands
- [x] 2.1 Create project scanner (hub/scanner.py)
- [x] 2.2 Create OpenAI Agent SDK agents (hub/agents.py)
- [x] 2.3 Create pipeline (hub/pipeline.py)
- [x] 2.4 Add CLI commands calling Engine (ag ask, ag refresh, ag start-engine refactor)
- [x] 2.5 Create tests (test_hub_scanner.py, test_hub_pipeline.py, test_hub_discovery.py)
