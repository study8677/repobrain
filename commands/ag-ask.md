---
description: Ask a question about the current project's codebase via the antigravity knowledge hub. / 通过 antigravity 知识库询问当前项目代码。
allowed-tools: ["Bash"]
---

Run the Antigravity CLI for the current workspace:

通过 Antigravity CLI 询问当前工作区：

> $ARGUMENTS

Use Bash:

```bash
AG_ASK_TIMEOUT_SECONDS="${AG_ASK_TIMEOUT_SECONDS:-120}" ag-ask "$ARGUMENTS" --workspace "$PWD"
```

If `.env` sets `AG_HOST_RUNNER=codex`, the same command uses the user's local
Codex CLI login for `ag-ask` instead of an API key. This host-runner mode is
ask-only; refresh should use scan-only artifacts or a configured `OPENAI_*`
provider.

如果 `.env` 设置了 `AG_HOST_RUNNER=codex`，同一个命令会通过用户本机 Codex CLI
登录运行 `ag-ask`，不走 API key。这个 host-runner 模式只支持 ask；refresh
应使用 scan-only 产物或已配置的 `OPENAI_*` provider。

使用 Bash：

```bash
AG_ASK_TIMEOUT_SECONDS="${AG_ASK_TIMEOUT_SECONDS:-120}" ag-ask "$ARGUMENTS" --workspace "$PWD"
```

If `ag-ask` is not found, tell the user the engine CLI is not installed and suggest:

如果找不到 `ag-ask`，说明 engine CLI 尚未安装，建议用户运行：

```bash
pipx install "git+https://github.com/study8677/repobrain.git#subdirectory=engine"
```

Prefer `ag-ask` over manual file search. If the answer returns insufficient detail, follow up with targeted Read/Grep.

优先使用 `ag-ask`，不要先手动搜索文件。如果返回的信息不够，再用有目标的 Read/Grep 补充。
