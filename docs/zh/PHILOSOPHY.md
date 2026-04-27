# 🌟 项目理念

## Antigravity Workspace 的愿景

在 AI IDE 已经很强的时代，目标是让企业级架构变成 **Clone → Rename → Prompt** 的简单体验。通过以 `AGENTS.md` 作为权威行为规则，并配合 IDE 引导文件与 `.antigravity/*` 动态上下文，把完整的**认知架构**写进仓库，让 IDE 变成“懂行的架构师”，而不是空白编辑器。

## 为什么要有“会思考”的脚手架？

用 Google Antigravity 或 Cursor 做 AI 开发时，痛点在于：**IDE 和模型都强，但空项目太弱。** 每次新项目都要重复：
- 代码放 `src` 还是 `app`？
- 工具函数如何写才能被 Gemini 识别？
- 如何让 AI 记住上下文？

理想流程是：**git clone 之后 IDE 已经知道该做什么。** 这就是本模板诞生的原因。

## 🧠 核心理念：Artifact-First

工作区遵循 **Artifact-First** 协议，复杂任务不仅写代码，还要产出可审计的产物：
1) **计划**：先在 `artifacts/plan_[task_id].md` 写计划  
2) **证据**：日志、测试输出放入 `artifacts/logs/`  
3) **可视化**：UI 变更需有截图等视觉产物  

每个任务都有“证据链”，便于复盘与改进。

## 🛸 运行方式

Agent 遵循严格的“Think-Act-Reflect”循环，模拟 Gemini 2.0 Flash 的认知流程：

```
用户 → Agent（思考与策略）→ 工具执行 → 产出 artifacts → 返回报告
```

## 🔥 关键特性

- 🧠 **无限记忆引擎**：递归摘要自动压缩历史，缓解上下文限制。  
- 🛠️ **通用工具协议**：通用 ReAct 模式；将 Python 函数注册到 `available_tools` 即可被调用。  
- ⚡️ **Gemini 原生**：针对 Gemini 2.0 Flash 的速度与函数调用优化。  
- 🔌 **外部 LLM（OpenAI 兼容）**：用内置 `call_openai_chat` 工具调用任何 OpenAI 格式接口（支持 OpenAI/Azure/Ollama）。  

---

**下一步：** [快速开始](QUICK_START.md) | [文档索引](README.md)
