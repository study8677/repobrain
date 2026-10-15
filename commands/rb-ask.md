---
description: Ask a question about the current project's codebase via the repobrain knowledge hub. / 通过 repobrain 知识库询问当前项目代码。
allowed-tools: ["Bash"]
---

Run the RepoBrain CLI for the current workspace:

通过 RepoBrain CLI 询问当前工作区：

The engine prefers knowledge for HEAD, otherwise a compatible ancestor on the
current history. Uncommitted edits are allowed: use knowledge as background,
inspect current source for changed behavior, and keep freshness notices. Never
use unrelated sibling knowledge or automatically start a refresh. If no usable
knowledge exists on current history, report the `rb-refresh` hint.

允许边改边问。引擎优先读当前提交的知识，没有时读当前分支祖先版本；旧知识作为背景，
修改处以当前源码为准，保留时效提示。不要借用其他分支独有的知识，也不要自动刷新。
当前历史上没有可用知识时，再提示先运行 `rb-refresh`。

> $ARGUMENTS

Use Bash:

```bash
RB_ASK_TIMEOUT_SECONDS="${RB_ASK_TIMEOUT_SECONDS:-120}" rb-ask "$ARGUMENTS" --workspace "$PWD"
```

If `.env` sets `RB_HOST_RUNNER` (`codex` or `generic`), the same command drives
the user's local logged-in CLI (Codex / Trae / Claude / …) for `rb-ask` instead
of an API key. The same host-runner backend also powers `rb-refresh` (tool-free
stages run through the CLI; conventions and git insights degrade to
deterministic output).

如果 `.env` 设置了 `RB_HOST_RUNNER`（`codex` 或 `generic`），同一个命令会通过
用户本机已登录的 CLI（Codex / Trae / Claude / …）运行 `rb-ask`，不走 API key。
同一套 host-runner 后端也支撑 `rb-refresh`（无工具阶段走 CLI，conventions 与
git insights 降级为确定性产物）。

使用 Bash：

```bash
RB_ASK_TIMEOUT_SECONDS="${RB_ASK_TIMEOUT_SECONDS:-120}" rb-ask "$ARGUMENTS" --workspace "$PWD"
```

If `rb-ask` is not found, tell the user the engine CLI is not installed and suggest:

如果找不到 `rb-ask`，说明 engine CLI 尚未安装，建议用户运行：

```bash
pipx install "git+https://github.com/study8677/repobrain.git#subdirectory=engine"
```

Prefer `rb-ask` over manual file search. If the answer returns insufficient detail, follow up with targeted Read/Grep.

优先使用 `rb-ask`，不要先手动搜索文件。如果返回的信息不够，再用有目标的 Read/Grep 补充。
