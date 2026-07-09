---
description: Rebuild the antigravity project knowledge base after significant changes. / 在重要改动后重建 antigravity 项目知识库。
allowed-tools: ["Bash"]
---

Run the Antigravity CLI for the current workspace.

通过 Antigravity CLI 刷新当前工作区知识库。

Use Bash:

```bash
ag-refresh --workspace "$PWD"
```

使用 Bash：

```bash
ag-refresh --workspace "$PWD"
```

If $ARGUMENTS contains `quick`, add `--quick`. If $ARGUMENTS contains `failed-only`, add `--failed-only`.

如果 $ARGUMENTS 包含 `quick`，追加 `--quick`。如果 $ARGUMENTS 包含 `failed-only`，追加 `--failed-only`。

If `ag-refresh` is not found, tell the user the engine CLI is not installed and suggest:

如果找不到 `ag-refresh`，说明 engine CLI 尚未安装，建议用户运行：

```bash
pipx install "git+https://github.com/study8677/repobrain.git#subdirectory=engine"
```

Report progress concisely; full refresh can take several minutes.

简洁汇报进度；完整 refresh 可能需要几分钟。
