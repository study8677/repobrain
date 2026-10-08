# AI_INSTALL — paste this to your AI assistant

**For humans:** You are using an AI IDE (Trae / Cursor / Claude Code / Codex / Windsurf / Cline)
and it is already logged in. A logged-in headless CLI can serve as the backend
without an API key; otherwise configure an OpenAI-compatible provider. Copy this file to your
AI assistant and say: *"Install RepoBrain in this project by following AI_INSTALL.md."*
Then just answer any question it asks. When it finishes, ask it anything about your codebase.

**面向用户：** 你正在用某个 AI IDE（Trae / Cursor / Claude Code / Codex / Windsurf / Cline），
而且已经登录。本机可用且已登录的命令行工具可以作为后端，无需 API key；否则需要
配置 OpenAI 兼容提供商。把这个文件贴给你的 AI 助手，对它说：
*"照着 AI_INSTALL.md 在这个项目里装好 RepoBrain。"* 然后回答它问你的问题即可。
装完后，直接问它任何关于你代码库的问题。

**Para usuarios:** Una CLI con sesión iniciada puede servir de backend sin API key;
si no está disponible, configura un proveedor compatible con OpenAI. Comparte este
archivo con tu asistente y dile: *"Instala RepoBrain en este proyecto siguiendo
AI_INSTALL.md y explícame el resultado en español."* Las instrucciones técnicas
de abajo están en inglés y chino; el asistente debe responder en tu idioma.

---

## Instructions for the AI assistant / 给 AI 助手的指令

You are an installation assistant. Your goal: install and configure **RepoBrain** in the
user's **current project** so that afterwards the user can ask questions about their codebase
and you (the AI) will answer them grounded in real code.

你是安装助手。目标：在用户**当前项目**里安装并配置 **RepoBrain**，让用户之后能问关于代码库的
问题，而你（AI）能基于真实源码回答。

Follow the steps **in order**. If a step fails, diagnose and fix it before continuing.
Report progress to the user in their language. Never invent an API key or paste secrets.

按顺序执行。某步失败就先排查修复再继续。用用户的语言汇报进度。**绝不**编造 API key 或粘贴密钥。

### Step 0 — Confirm you can run shell commands / 确认你能执行 shell

This script only works if you (the AI) can execute terminal commands in the user's project.
If you cannot run commands, stop and tell the user to follow `INSTALL.md` manually instead.

只有当你能在用户项目里执行终端命令时这套流程才成立。如果你不能执行命令，请停止并告诉用户
改用 `INSTALL.md` 手动安装。

### Step 1 — Check Python / 检查 Python

RepoBrain needs **Python 3.10+**. Run:

```bash
python3 --version
```

If it is missing or below 3.10, install a newer Python (prefer the user's platform tool:
`brew install python@3.12` on macOS, `pyenv install`, or the system package manager) and make
sure `python3` on PATH is ≥ 3.10 before continuing.

如果缺失或低于 3.10，装一个更新的 Python（优先用平台工具：macOS 用 `brew install python@3.12`，
或 `pyenv`、系统包管理器），确认 PATH 上的 `python3` ≥ 3.10 再继续。

### Step 2 — Install RepoBrain / 安装 RepoBrain

Prefer `pipx` (isolated, does not pollute the environment). Fall back to `pip --user`.
Install the **engine** (`rb-ask`, `rb-refresh`, `rb-mcp`) and inject the **CLI** (`rb`, `rb init`):

优先用 `pipx`（隔离、不污染环境），失败则回退 `pip --user`。安装**引擎**（`rb-ask` / `rb-refresh` /
`rb-mcp`）并注入 **CLI**（`rb` / `rb init`）：

```bash
# Preferred: pipx
pipx install "git+https://github.com/study8677/repobrain.git#subdirectory=engine"
pipx inject --force --include-apps repobrain-engine "git+https://github.com/study8677/repobrain.git#subdirectory=cli"

# Fallback: pip --user
python3 -m pip install --user "git+https://github.com/study8677/repobrain.git#subdirectory=engine"
python3 -m pip install --user "git+https://github.com/study8677/repobrain.git#subdirectory=cli"
```

Verify: `rb-ask --help` prints usage. If the command is not found, the install bin directory
is not on PATH — add it (the installer prints the path) and re-check.

验证：`rb-ask --help` 能打印用法。若提示找不到命令，是安装目录不在 PATH 上——把它加进 PATH
（安装器会打印路径）再验证。

### Step 3 — Configure a zero-key backend / 配置零-key 后端

**Prefer no API key.** Detect a logged-in local headless CLI and write a host-runner `.env`.
Check in this order and use the **first** one that is available and logged in:

**优先零 API key。** 探测本机已登录的无头 CLI，写入 host-runner 的 `.env`。按下面顺序检查，
用**第一个**可用且已登录的：

1. **Trae** — `command -v trae-cli` and `trae-cli login status`. If OK, write to `.env`:

   ```bash
   RB_HOST_RUNNER=generic
   RB_HOST_COMMAND=trae-cli exec --cd {workspace} --sandbox read-only --skip-git-repo-check --ephemeral -o {output_file}
   RB_HOST_OUTPUT_MODE=file
   RB_HOST_TIMEOUT_SECONDS=240
   ```

2. **Codex** — `command -v codex` and `codex login status`. If OK, write to `.env`:

   ```bash
   RB_HOST_RUNNER=codex
   # RB_HOST_MODEL is optional; leave it unset to use the codex login's default
   # model. Set it only to force a specific one, e.g. RB_HOST_MODEL=gpt-5.3-codex-spark
   RB_HOST_TIMEOUT_SECONDS=240
   RB_HOST_MAX_CONTEXT_CHARS=60000
   ```

3. **Claude Code** — `command -v claude` (logged-in state is implicit). If present, write to `.env`:

   ```bash
   RB_HOST_RUNNER=generic
   RB_HOST_COMMAND=claude -p --add-dir {workspace}
   RB_HOST_OUTPUT_MODE=stdout
   RB_HOST_TIMEOUT_SECONDS=240
   ```

4. **Fallback — no local CLI found.** Only if none of the above is available, tell the user a
   zero-key backend needs a logged-in Trae/Codex/Claude. Offer to configure an
   OpenAI-compatible provider in `.env` using `engine/.env.example` as reference.
   In an installed native plugin, `/rb-setup` or `/repobrain:rb-setup` can guide
   this configuration; `rb-setup` is not a standalone shell executable.
   Do not fabricate a key.

   **回退——没探测到本地 CLI。** 只有在以上都不可用时，告诉用户零-key 需要一个已登录的
   Trae/Codex/Claude，可以参考 `engine/.env.example` 配置 `.env` 中的 OpenAI 兼容
   提供商。已安装原生插件时，可用 `/rb-setup` 或 `/repobrain:rb-setup` 引导配置；
   `rb-setup` 不是独立的 shell 命令。不要编造 key。

Write `.env` to the **project root** and make sure it is git-ignored:

把 `.env` 写到**项目根目录**，并确保它被 git 忽略：

```bash
grep -qxF '.env' .gitignore 2>/dev/null || echo '.env' >> .gitignore
```

### Step 4 — Optional IDE context files / 可选的 IDE 规则文件

If the user wants IDE rule files that guide future assistants to `rb-ask`,
inject them with the command below. This is optional: refresh creates the
knowledge directory itself. Preserve existing rules; do not use `--force`.

如果用户需要引导后续助手调用 `rb-ask` 的 IDE 规则文件，可以执行下面的命令。
这一步是可选的：刷新会自行创建知识库目录。保留已有规则，不使用 `--force`。

```bash
rb init .
```

### Step 5 — Smoke test / 冒烟自测

Before refreshing, verify that the project is a Git repository with at least one
commit and a clean worktree. Setup or optional IDE files may have introduced
changes. If the tree is dirty, list the affected files and explain that they
must be committed or stashed before continuing. Do not automatically commit,
stash, or discard the user's changes.

刷新前确认项目是至少有一次提交的 Git 仓库，且工作区干净。配置和可选的 IDE 文件
可能产生修改。若工作区不干净，列出相关文件，说明需要先提交或用 `git stash`
收起修改再继续。不要自动提交、stash 或丢弃用户的修改。

Build the knowledge base first, then ask one question and show the answer.
`rb-ask` does not build or update knowledge during a question.

先构建知识库，再提问并展示答案。`rb-ask` 不会在问答过程中构建或更新知识库。

```bash
rb-refresh
rb-ask "What does this project do? / 这个项目是做什么的?"
```

For programmatic use, `--json` returns `{answer, sources, limitations, workspace, question}`.

程序化调用可加 `--json`，返回 `{answer, sources, limitations, workspace, question}`。

### Step 6 — Report / 汇报

Report the backend actually configured and whether refresh and ask passed.
Use the example below only when a zero-key host runner was configured. If
verification is still blocked, state the remaining issue rather than claiming success.

用用户的语言说明实际配置的后端，以及刷新和问答是否通过。下面的示例只适用于
已配置零-key 本地后端的情况。若验证仍受阻，说明剩余问题，不声称安装验收成功。

> ✅ RepoBrain is installed and configured for **zero-API-key** mode (driving your logged-in
> `<runner>`). From now on, just ask me anything about this codebase — I will use RepoBrain to
> answer, grounded in real code with file paths and line numbers. Run `rb-refresh` after
> committing code changes or to continue a failed task; it selects the update mode automatically.
> Use `rb-refresh --full` only to regenerate all knowledge. Ask does not trigger refresh.
>
> ✅ RepoBrain 已装好并配置为**零 API key**模式（驱动你已登录的 `<runner>`）。以后直接问我
> 关于这个代码库的任何问题即可——我会用 RepoBrain 基于真实源码作答，带文件路径和行号。
> 代码提交后或上次更新失败后，运行 `rb-refresh`，系统会自动选择更新方式。
> 只有需要重新生成全部知识时才使用 `rb-refresh --full`。提问不会触发刷新。

---

## Capability boundaries (be honest with the user) / 能力边界（如实告诉用户）

Zero-key mode drives a **single-turn, tool-free** local CLI, so `rb-refresh` degrades gracefully:

零-key 模式驱动的是**单轮、无工具调用**的本地 CLI，因此 `rb-refresh` 会优雅降级：

- **module docs / map** — generated by your local CLI ✅
- **conventions** — collapses the multi-hop handoff swarm into a single-turn agent ⚠️
- **git insights** — deterministic pre-extracted git data, no LLM narration ⚠️

`rb-ask` Q&A works fully (single-turn). If the user later gets an API key, `rb-setup` switches
to the full-capability, tool-using refresh automatically — a configured API backend always wins.

`rb-ask` 问答完全可用（单轮）。用户以后若拿到 API key，`rb-setup` 会自动切到全功能、带工具的
refresh——配置了 API 后端时永远优先用它。
