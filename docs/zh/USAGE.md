# RepoBrain 使用参考

安装、模型后端配置和本地 CLI 模板（包括 Trae）见 [INSTALL.md](../../INSTALL.md)。本文说明安装完成后的命令用法。

## 更新知识库与提问

在项目根目录运行：

```bash
rb-refresh
rb-ask "这个项目的认证逻辑是怎么实现的？"
```

`rb-refresh` 自动选择首次完整构建、已有知识库的增量更新，或继续匹配当前版本的未完成任务。知识库已经是最新时，跳过生成。失败后重新运行同一个命令即可。需要明确重新生成全部知识时，使用：

```bash
rb-refresh --full
```

刷新针对 Git 中已提交的代码，要求工作区干净。首次构建可能需要几分钟，大仓库更久。成功的知识版本会按提交保留在本地；切回已经建过知识的提交后，`rb-ask` 自动读取对应版本，`rb-refresh` 直接复用，不重新生成。不同分支指向同一提交时可以共用知识。

`rb-ask` 支持边改边问：暂存、未暂存和未跟踪的修改不会阻止提问，知识库继续保留最近一次成功刷新的版本。提问优先读取当前提交对应的知识，没有时使用当前分支历史中最近的可用祖先版本，并注明知识截至哪个提交。模型会获得当前文件变化和有长度限制的 Diff；知识是背景资料，涉及修改的结论以当前源码为准，新文件及被截断的内容需要按需读取核实。提问不会触发刷新或发布新的知识版本。

当前提交及其祖先都没有兼容知识时才提示先生成知识，不借用另一分支独有的版本。正式刷新仍要求工作区干净；失败不会覆盖旧版本。回答期间继续编辑会提醒核对最新代码，切换提交则要求重新提问。旧版平铺知识在 Git 仓库中也只复用当前提交或祖先提交的内容；非 Git 目录保留原有行为。

`--workspace` 指要处理的项目文件夹，默认是当前目录（`.`）。从其他目录运行时才需要写路径：

```bash
rb-refresh --workspace /path/to/project
rb-ask "测试代码在哪里？" --workspace /path/to/project
```

Engine 包提供 `rb-refresh`、`rb-ask`、`rb-mcp`；CLI 包提供模板注入、诊断和离线记录。两个包都安装后，`rb refresh` 与 `rb ask` 会调用同一个 Engine，各自支持对应的 `--full`、`--json`、`--workspace` 参数。安装方法见 [INSTALL.md](../../INSTALL.md)。

## 供脚本或其他 Agent 调用

调用方能运行 shell 命令时，可以使用 JSON 输出：

```bash
rb-ask "认证逻辑在哪里？" --workspace /path/to/project --json
```

成功时 stdout 输出如下对象，退出码为 `0`：

```json
{
  "answer": "认证逻辑位于 src/auth.py …",
  "sources": ["src/auth.py:12"],
  "limitations": [],
  "workspace": "/path/to/project",
  "question": "认证逻辑在哪里？"
}
```

查询执行失败时，stdout 保持为空，stderr 输出 `{"error": "..."}`，退出码非零。非法命令参数由参数解析器拒绝；中断时退出码为 `130`。包装命令的等价用法是 `rb ask "问题" --json`。

## 插件斜杠命令

斜杠命令在已安装插件的宿主中运行，不是 shell 可执行文件：

| 用途 | Claude Code | Codex CLI |
|---|---|---|
| 配置后端 | `/repobrain:rb-setup` | `/rb-setup` |
| 自动刷新 | `/repobrain:rb-refresh` | `/rb-refresh` |
| 强制全部重建 | `/repobrain:rb-refresh --full` | `/rb-refresh --full` |
| 查询项目 | `/repobrain:rb-ask <问题>` | `/rb-ask <问题>` |
| 创建模板仓库 | `/repobrain:rb-init <名字>` | `/rb-init <名字>` |

尚未配置后端时才需要 setup。不存在独立的 `rb-setup` shell 命令；直接使用 shell 的用户按 [INSTALL.md](../../INSTALL.md) 配置 `.env`。

## 可选的规则文件与记录

`rb init` 向指定目录注入共享指令和 IDE 引导文件。它是可选功能；不执行它，刷新也会创建自己的知识库目录。

```bash
rb init /path/to/project
rb init /path/to/project --force
```

第一个命令跳过已有文件；`--force` 会覆盖已有文件，提交前应检查生成结果。`AGENTS.md` 保存共享规则，IDE 专用文件引用这些规则。

斜杠命令 `rb-init` 的用途不同：调用 `agent-repo-init` skill，基于 RepoBrain 模板创建新仓库。它不是更新现有项目知识库的前置步骤。模板流程见 [零配置特性](ZERO_CONFIG.md)。

也可以不调用模型，直接记录发现和决策：

```bash
rb report "认证模块需要重构"
rb log-decision "使用 PostgreSQL" "团队有相关运维经验"
```

发现写入 `.repobrain/memory/reports.md`，决策写入 `.repobrain/decisions/log.md`。两条命令都支持 `--workspace /path/to/project`。

## 排查问题

```bash
rb doctor --workspace /path/to/project
```

Doctor 检查 Engine 是否可用、配置、提供商连通性、知识库状态和诊断日志位置，不生成知识。它对 generic 本地 CLI 的诊断覆盖有限，还需单独检查该 CLI 的登录状态与命令配置。常见安装和会话问题见 [排错文档（英文）](../en/TROUBLESHOOTING.md)。

## 把 RepoBrain 作为 MCP 服务端

需要通过 MCP 工具调用的客户端可以使用此方式。先建立知识库，再注册 stdio 服务端，例如 Claude Code：

```bash
rb-refresh --workspace /path/to/project
claude mcp add repobrain rb-mcp -- --workspace /path/to/project
```

其他客户端可参考 [MCP 配置示例](../examples/repobrain.mcp.json)，替换项目路径，并确保客户端能从 PATH 找到 `rb-mcp`。服务提供 `ask_project(question)` 和 `refresh_project(full=False)`。提问只读；刷新会更新知识库，`full=True` 强制开始完整重建。

服务端接入与 RepoBrain 连接数据库、GitHub 等外部 MCP 服务是两件事。外部工具配置见 [MCP 集成](MCP_INTEGRATION.md)，执行边界见 [Sandbox](SANDBOX.md)，内部路由和知识生成细节见 [Swarm 协议](SWARM_PROTOCOL.md)。
