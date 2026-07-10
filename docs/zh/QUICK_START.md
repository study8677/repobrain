# 🚀 快速开始指南

几分钟内运行 RepoBrain 代码库知识引擎。

## 📋 前置条件

- Python 3.10+
- pip 或 conda
- Git

## 🏃 本地开发

### 1. 安装依赖
```bash
python3 -m venv venv
source venv/bin/activate
pip install -e ./cli -e './engine[dev]'
```

### 2. 构建知识库
```bash
rb-refresh --workspace .
```

该命令会扫描项目、构建 `.repobrain/`，并为后续路由式问答准备代码库知识库。

### 3. 提问项目问题
```bash
rb-ask "这个项目的认证逻辑是怎么实现的？" --workspace .
```

问答流水线会读取结构图，将问题路由到合适的模块 Agent，并返回带文件证据的答案。

## 🐳 Docker 部署

### 构建与运行
```bash
docker-compose up --build
```

这会基于当前 checkout 构建镜像，并在容器内针对 `/app` 启动知识库 MCP 服务。
源码变更后需要重新 build；如果要开发期热加载，可自行修改 `docker-compose.yml`
绑定挂载当前仓库。

可按需修改 `docker-compose.yml`（环境变量、挂载卷、端口等）。

## 🔧 配置

### 环境变量
创建 `.env`：

```bash
# LLM 配置
OPENAI_BASE_URL=https://your-endpoint/v1
OPENAI_API_KEY=your-key
OPENAI_MODEL=your-model

# MCP 配置
MCP_ENABLED=true
# rb-ask 自动连接外部 MCP server 前还需要显式开启
RB_ALLOW_MCP=true

# Retrieval graph：off、compact 或 full
RB_RETRIEVAL_MODE=compact

# 自定义
LOG_LEVEL=INFO
ARTIFACTS_DIR=artifacts
```

`ARTIFACTS_DIR` 支持绝对路径和相对路径。相对路径会基于仓库根目录解析，
避免输出落到 IDE 的默认目录。

当前项目默认服务于可信本地 workspace。`RB_RETRIEVAL_MODE` 默认是
`compact`；`full` 会保留更完整的证据产物。常见 secret 在写入 retrieval
graph 前会被脱敏，但片段仍可能包含仓库内容，因此不要在不可信或共享 workspace
中开启高保真检索日志。

默认 sandbox 是本地开发便利边界，不是执行不可信代码的隔离边界。
`SANDBOX_TYPE=microsandbox` 是显式 opt-in；如果运行时不可用，engine 会输出
warning 并降级到本地执行。

### 记忆管理
记忆由以下 Markdown 文件自动管理：
- `memory/agent_memory.md`（原始记忆条目）
- `memory/agent_summary.md`（压缩摘要）

重置方法：

```bash
rm -f memory/agent_memory.md memory/agent_summary.md
rb-refresh --workspace .
```

## 📁 项目结构参考

```
├── cli/                         # 轻量 rb CLI 与模板
├── engine/repobrain_engine/    # 知识引擎、hub、MCP server、sandbox
├── artifacts/                   # 计划、报告与 benchmark 输出
├── memory/                      # Markdown 交互记忆
└── .repobrain/                # 目标仓库中生成的知识库
```

详见 [项目结构](README.md)。

## 🧪 运行测试

```bash
# 全量
pytest engine/tests cli/tests

# 指定 engine 测试文件
pytest engine/tests/test_hub_pipeline.py -v
```

## 🐛 常见问题

### 知识库命令无法启动
```bash
# 检查 engine CLI
rb-ask --help
rb doctor --workspace .

# 检查 OpenAI-compatible 配置
echo $OPENAI_BASE_URL
echo $OPENAI_API_KEY
```

### 工具未加载
```bash
# 检查 engine 工具文件
ls -la engine/repobrain_engine/tools/

# 检查语法
python -m py_compile engine/repobrain_engine/tools/*.py
```

### 记忆异常
```bash
# 查看记忆
cat memory/agent_memory.md

# 清理记忆
rm -f memory/agent_memory.md memory/agent_summary.md
```

## 🔌 MCP 集成

启用步骤：
1. `.env` 中设置 `MCP_ENABLED=true`
2. 只有信任已配置 server 时，才设置 `RB_ALLOW_MCP=true`
3. 在 `mcp_servers.json` 配置服务器
4. 重新运行命令

MCP stdio server 会继承当前进程环境变量以及配置中的 `env` 值。把每个启用的
server 都当作拥有本地权限的代码来对待。详见 [MCP 集成指南](MCP_INTEGRATION.md)。

## 📚 下一步

- **了解理念**： [项目理念](PHILOSOPHY.md)
- **探索 MCP**： [MCP 集成](MCP_INTEGRATION.md)
- **多 Agent**： [Swarm 协议](SWARM_PROTOCOL.md)
- **高级特性**： [零配置特性](ZERO_CONFIG.md)
- **规划路线**： [开发路线图](ROADMAP.md)

---

更多信息参见 [文档索引](README.md) 或在 GitHub 提 Issue。👍
