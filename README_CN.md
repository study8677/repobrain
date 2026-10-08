<div align="center">

<img src="docs/assets/logo.svg" alt="RepoBrain" width="200"/>

# RepoBrain（仓库大脑）

把代码整理成知识库，让 AI 基于源码回答问题。

<sub>原名 <b>Antigravity Workspace Template</b> —— 同一个项目，全新的名字。</sub>

[English](README.md) · **中文** · [Español](README_ES.md)

[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)
[![CI](https://img.shields.io/github/actions/workflow/status/study8677/repobrain/test.yml?style=for-the-badge&label=CI)](https://github.com/study8677/repobrain/actions)
[![DeepWiki](https://img.shields.io/badge/DeepWiki-Docs-blue?style=for-the-badge&logo=gitbook&logoColor=white)](https://deepwiki.com/study8677/repobrain)
[![NLPM](https://img.shields.io/badge/NLPM-audited-7C3AED?style=for-the-badge)](https://github.com/xiaolai/nlpm-for-claude)

<img src="docs/assets/demo.gif" alt="rb-ask 演示 — 向代码库提问,答案带文件路径和行号" width="800"/>

</div>

RepoBrain 帮你理解陌生项目、定位功能实现，并获得带源码引用的回答。
项目知识保存在 `.repobrain/`，可以在支持的 IDE 和 Agent 之间共享。

## 项目理念

> AI Agent 的能力上限 = **它能读到的上下文质量。**

引擎是核心：`rb-refresh` 部署多智能体集群自主阅读代码——每个模块分配专属 Agent 生成知识文档。`rb-ask` 将问题路由到对应 Agent，答案有据可查，带文件路径和行号。

**与其给 Claude Code / Codex 一个仓库 `grep` 让它自己找，不如给它一个仓库版本的 ChatGPT。**

```
传统做法：                           RepoBrain 做法：
  CLAUDE.md = 5000 行文档              Claude Code 调用 ask_project("auth 怎么工作的？")
  Agent 全部读入，大半遗忘              Router → ModuleAgent 读真实源码，返回精准答案
  幻觉率居高不下                       有据可查，带文件路径和行号
```

| 痛点 | 没有 RepoBrain | 有 RepoBrain |
|:----|:----------------|:--------------|
| Agent 忘记代码风格 | 反复纠正同样的问题 | 读取 `.repobrain/conventions.md` —— 一次到位 |
| 接手新代码库 | Agent 只能猜测架构 | `rb-refresh` → ModuleAgent 自主学习每个模块 |
| 切换 IDE | 每个 IDE 规则不同 | 一个 `.repobrain/` 目录 —— 所有 IDE 共享 |
| 问"X 怎么实现的？" | Agent 胡乱翻文件 | `ask_project` MCP → Router 精准路由到负责模块的 Agent |

架构是**文件 + 实时问答引擎**，而非插件。跨 IDE、跨 LLM、零平台锁定。

完整的产品主张与设计原则见[项目理念文档](docs/zh/PHILOSOPHY.md)。

## 快速开始

把下面这句话交给能够在你项目里执行命令的 AI 助手：

> 阅读 [AI_INSTALL.md](https://github.com/study8677/repobrain/blob/main/AI_INSTALL.md)，照着它在当前项目里安装 RepoBrain。

安装指南会完成工具安装、模型配置、知识库构建和一次问答检查。本机已登录的
Trae 等命令行工具可以作为后端，无需额外 API key；也支持 OpenAI 兼容 API。
需要 Python 3.10+、至少有一次提交的 Git 仓库，以及刷新时干净的工作区。

各平台安装和手动配置见 [安装指南](INSTALL.md)与[快速开始文档](docs/zh/QUICK_START.md)。
在现有项目里建立知识库，不需要先运行 `rb init` 或 `rb-init`。

## 日常使用

安装并配置好后，在项目目录中运行：

```bash
rb-refresh
rb-ask "这个项目的认证逻辑是怎么实现的？"
```

`rb-refresh` 会自动选择首次构建、提交后的增量更新或匹配任务的中断续跑。
知识库已是最新时直接跳过，不调用模型。上次失败了，再运行同一个命令即可继续。

只有需要重新生成全部知识时，才运行：

```bash
rb-refresh --full
```

`rb-ask` 使用已有知识库回答，附带源码证据。代码有新提交时会提醒刷新，
但提问过程中不会更新知识库。

可以这样提问：

- 这个接口在哪里实现，哪些地方调用了它？
- 数据从页面到后端经过了哪些步骤？
- 修改这个函数，会影响哪些模块？

## 工作原理

```text
源码 → rb-refresh → .repobrain/ 知识库 → rb-ask → 带代码引用的回答
```

RepoBrain 把相关代码分组、生成模块知识，并为问题选择相关上下文。
知识保存在项目里，支持的 IDE 可以共享同一份内容。更新先写入临时版本，
完整成功后才生效；失败时继续保留原有可用知识库。

首次构建会调用配置好的模型，可能需要数分钟，大仓库更久。
刷新前需要提交修改，或用 `git stash` 暂时收起修改。IDE 规则文件和新项目模板属于可选功能，
详见[完整用法](docs/zh/USAGE.md)。

## 支持方式

| 使用方式 | 环境 | 如何接入 |
|:---------|:-----|:---------|
| 原生插件 | Claude Code、Codex CLI | 用斜杠命令完成配置、刷新和提问。 |
| 兼容 IDE | Cursor、Windsurf、Gemini CLI、VS Code + Copilot、Cline、Aider、DeepSeek Harness | 共享上下文文件、CLI 或 MCP 客户端。 |
| 其他 Agent 和脚本 | 能执行命令或调用 MCP 的环境 | CLI/JSON 输出，或可选的 `rb-mcp`。 |

平台命令差异、JSON 输出和 MCP 注册步骤见[完整用法](docs/zh/USAGE.md)与[安装指南](INSTALL.md)。

## 评测

项目在 Flask、ripgrep、Vite、Prometheus 上进行过固定源码访问权限和模型路由的
RepoBrain / CodeGraph + Trae 对比。[完整报告](benchmarks/codegraph-comparison/results/latest-v2-full-report.zh-CN.md)
包含正确率、查询耗时、Token 和首次建库成本。结果只适用于这组实验；
AI 知识生成和静态代码图索引是不同的工作负载。

## 详细文档

- [安装与故障排查](INSTALL.md)
- [完整命令、JSON 和可选集成](docs/zh/USAGE.md)
- [知识生成与问答架构](docs/zh/SWARM_PROTOCOL.md)
- [外部 MCP 工具](docs/zh/MCP_INTEGRATION.md) · [沙盒配置](docs/zh/SANDBOX.md)
- [版本变更](CHANGELOG.md)
- 文档首页：[中文](docs/zh/README.md) · [English](docs/en/README.md) · [Español](docs/es/README.md)

**NLPM 审计反馈** —— 本仓库受益于 [xiaolai](https://github.com/xiaolai) 的 [NLPM](https://github.com/xiaolai/nlpm-for-claude)，它是面向 Claude Code 插件、skills 和 agent 定义的自然语言编程 linter。它的审计帮助发现了 skill frontmatter 和依赖版本卫生方面的真实改进点。

---

## 贡献

创意也是贡献！欢迎在 [issue](https://github.com/study8677/repobrain/issues) 中报告 bug、提出建议或提交架构方案。

## 贡献者

<table>
  <tr>
    <td align="center" width="20%">
      <a href="https://github.com/Lling0000">
        <img src="https://github.com/Lling0000.png" width="80" /><br/>
        <b>⭐ Lling0000</b>
      </a><br/>
      <sub><b>主要贡献者</b> · 创意建议 · 项目管理员 · 项目构想与反馈</sub>
    </td>
    <td align="center" width="20%">
      <a href="https://github.com/h13181278389">
        <img src="https://github.com/h13181278389.png" width="80" /><br/>
        <b>h13181278389</b>
      </a><br/>
      <sub><b>核心贡献者</b> · 感谢你对 RepoBrain 的支持、反馈与贡献</sub>
    </td>
    <td align="center" width="20%">
      <a href="https://github.com/flyw1015">
        <img src="https://github.com/flyw1015.png" width="80" /><br/>
        <b>flyw1015</b>
      </a><br/>
      <sub><b>核心贡献者</b> · 感谢你对 RepoBrain 的支持、反馈与贡献</sub>
    </td>
    <td align="center" width="20%">
      <a href="https://github.com/devalexanderdaza">
        <img src="https://github.com/devalexanderdaza.png" width="80" /><br/>
        <b>Alexander Daza</b>
      </a><br/>
      <sub>沙盒 MVP · OpenSpec 工作流 · 技术分析文档 · PHILOSOPHY</sub>
    </td>
    <td align="center" width="20%">
      <a href="https://github.com/chenyi">
        <img src="https://github.com/chenyi.png" width="80" /><br/>
        <b>Chen Yi</b>
      </a><br/>
      <sub>首个 CLI 原型 · 753 行重构 · DummyClient 提取 · 快速开始文档</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="20%">
      <a href="https://github.com/Subham-KRLX">
        <img src="https://github.com/Subham-KRLX.png" width="80" /><br/>
        <b>Subham Sangwan</b>
      </a><br/>
      <sub>动态工具与上下文加载 (#4) · 多 Agent Swarm 协议 (#3)</sub>
    </td>
    <td align="center" width="20%">
      <a href="https://github.com/shuofengzhang">
        <img src="https://github.com/shuofengzhang.png" width="80" /><br/>
        <b>shuofengzhang</b>
      </a><br/>
      <sub>记忆上下文窗口修复 · MCP 关闭优雅处理 (#28)</sub>
    </td>
    <td align="center" width="20%">
      <a href="https://github.com/goodmorning10">
        <img src="https://github.com/goodmorning10.png" width="80" /><br/>
        <b>goodmorning10</b>
      </a><br/>
      <sub>增强 <code>rb ask</code> 上下文加载 — 新增 CONTEXT.md、AGENTS.md 和 memory/*.md 作为上下文来源 (#29)</sub>
    </td>
    <td align="center" width="20%">
      <a href="https://github.com/abhigyanpatwari">
        <img src="https://github.com/abhigyanpatwari.png" width="80" /><br/>
        <b>Abhigyan Patwari</b>
      </a><br/>
      <sub>代码知识图谱原生集成到 <code>rb ask</code>，提供符号搜索、调用图和影响分析</sub>
    </td>
    <td align="center" width="20%">
      <a href="https://github.com/BBear0115">
        <img src="https://github.com/BBear0115.png" width="80" /><br/>
        <b>BBear0115</b>
      </a><br/>
      <sub>技能封装与知识图谱检索增强 · 多语言 README 同步更新 (#30)</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="20%">
      <a href="https://github.com/SunkenCost">
        <img src="https://github.com/SunkenCost.png" width="80" /><br/>
        <b>SunkenCost</b>
      </a><br/>
      <sub><code>rb clean</code> 清理命令 · <code>__main__</code> 入口保护 (#37)</sub>
    </td>
    <td align="center" width="20%">
      <a href="https://github.com/aravindhbalaji04">
        <img src="https://github.com/aravindhbalaji04.png" width="80" /><br/>
        <b>Aravindh Balaji</b>
      </a><br/>
      <sub>统一指令层围绕 <code>AGENTS.md</code> (#41)</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="20%">
      <a href="https://github.com/xiaolai">
        <img src="https://github.com/xiaolai.png" width="80" /><br/>
        <b>xiaolai</b>
      </a><br/>
      <sub><a href="https://github.com/xiaolai/nlpm-for-claude">NLPM</a> 审计反馈 · Skill frontmatter 修复 · 依赖版本卫生审查 (#51, #52, #53)</sub>
    </td>
  </tr>
</table>

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=study8677/repobrain&type=Date)](https://star-history.com/#study8677/repobrain&Date)

## 许可证

MIT License. 详见 [LICENSE](LICENSE)。

---

<div align="center">

**[📚 查看完整文档 →](docs/zh/)**

*为 AI 原生开发时代而构建*

友情链接：[LINUX DO](https://linux.do/)

</div>
