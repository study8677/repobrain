---
description: First-time setup for Antigravity. Configure the LLM API key used to read and analyze your codebase.
agent: build
---

# ag-setup

First-time setup for the Antigravity plugin. The user needs an LLM API key configured before refresh and ask commands will work. Goal: write a `.env` file at the current workspace root.

## Step 1 — Detect existing config

Read `.env` at the workspace root if it exists. If `OPENAI_API_KEY` is already set, ask the user whether to overwrite. If they say no, confirm "already configured" and stop.

## Step 2 — Ask which LLM provider

Present these options:
- **OpenAI** — gpt-4o-mini / gpt-4o
- **DeepSeek** — cheap, strong on code
- **Groq** — fast, free tier
- **DashScope (Aliyun)** — qwen series
- **NVIDIA NIM** — generous free tier
- **Ollama (local)** — no key needed, runs locally
- **Other OpenAI-compatible endpoint** — custom URL

## Step 3 — Collect URL / key / model

| Provider | `OPENAI_BASE_URL` | Suggested `OPENAI_MODEL` |
|---|---|---|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` |
| DashScope | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-max` |
| NVIDIA NIM | `https://integrate.api.nvidia.com/v1` | `meta/llama-3.3-70b-instruct` |
| Ollama | `http://localhost:11434/v1` | `llama3.2` (key can be `ollama`) |
| Other | ask the user | ask the user |

For non-Ollama providers ask the user to paste their key. For Ollama use `OPENAI_API_KEY=ollama`.

## Step 4 — Write `.env`

```
OPENAI_BASE_URL=<chosen URL>
OPENAI_API_KEY=<the key, or "ollama">
OPENAI_MODEL=<chosen model>
AG_ASK_TIMEOUT_SECONDS=120
```

If `.env` already existed and the user opted to overwrite, replace only the four keys above; preserve any other lines.

## Step 5 — Ensure `.env` is git-ignored

Check `.gitignore`. If `.env` is not listed (and no globbing rule covers it), append `.env` on a new line. If `.gitignore` doesn't exist, create one with `.env`.

## Step 6 — Tell the user next steps

Print:
```
Antigravity is configured for this project.

Next:
  1. ag-refresh              — build the knowledge base
  2. ag-ask <question>        — ask anything about the codebase
```

Do NOT call MCP tools from this command. The refresh and ask commands use the CLI (`ag-refresh` / `ag-ask`) directly and will read the `.env` file on each run.
