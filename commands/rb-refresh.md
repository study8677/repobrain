---
description: Automatically build, update, or resume the project knowledge base. / 自动构建、更新或续跑项目知识库。
allowed-tools: ["Bash"]
---

Run the RepoBrain CLI in the current project directory:

```bash
rb-refresh
```

`--workspace` defaults to the current directory. The engine automatically selects
first construction, a matching interrupted task, an incremental update, or an
already-current result. It requires a clean Git worktree and uses committed code.
If $ARGUMENTS contains `--full`, run `rb-refresh --full` to force a new complete
rebuild. Forward unsupported arguments to the CLI so removed or misspelled
options are rejected; do not translate them to a different refresh mode.

在当前项目目录运行 `rb-refresh` 即可；`--workspace` 默认当前目录。引擎自动选择
首次构建、匹配的中断续跑、增量更新或已是最新。要求 Git 工作区干净，只处理已提交
代码。$ARGUMENTS 包含 `--full` 时运行 `rb-refresh --full`，强制新建完整重建任务。
其他参数交给 CLI 检查，禁止将不支持的参数悄悄转换成其他刷新方式。

If `rb-refresh` is not found, explain that the engine CLI is missing and suggest:

如果找不到命令，提示安装 engine CLI：

```bash
pipx install "git+https://github.com/study8677/repobrain.git#subdirectory=engine"
```

Report whether this run builds, resumes, updates, skips, or fails. Full builds
can take several minutes. Never treat a failed result as a successful refresh.

简洁说明此次是构建、续跑、更新、跳过还是失败。完整构建可能需要几分钟，失败时
不能声称知识库已经更新。
