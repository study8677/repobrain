# OpenCMO Ask 能力边界评估报告

**日期**: 2026-04-04
**目标项目**: OpenCMO (374 files, ~29K lines Python, React/TS frontend)
**LLM Backend**: TeamoRouter-free via `router.teamolab.com/v1`
**Engine Version**: antigravity-engine 0.2.0

---

## 1. Refresh 阶段评估

### 知识库构建结果

| 产物 | 状态 | 大小/行数 | 质量 |
|------|------|-----------|------|
| scan_report.json | ✅ | 2.1KB | 374 files, 0.02s, 完整 |
| conventions.md | ✅ | 289 行 | LLM 生成, 质量好 |
| structure.md | ✅ | 1384 行 | AST 提取, 非常详细 |
| knowledge_graph.json | ✅ | 540KB | 节点+语义边, 完整 |
| knowledge_graph.md/mmd | ✅ | 82行/29K行 | 可视化就绪 |
| document_index.md | ⚠️ | 3 行 | 几乎为空 |
| data_overview.md | ⚠️ | 3 行 | 几乎为空 |
| media_manifest.md | ✅ | 39 行 | 正常 |
| modules/* | ❌ | 0 文件 | **全部失败** |
| git_insights.md | ❌ | 未生成 | **失败** |

### 模块代理失败分析

所有 10 个模块代理均失败:
- **7 个** 因 "Max turns (10) exceeded" — TeamoRouter-free 在多轮 agent 交互中响应过慢或工具调用循环
- **3 个** 因空错误 — 可能是模型拒绝或连接中断

**影响**: modules/ 目录为空, 意味着 ask pipeline 缺少模块级深度知识。但 structure.md (1384行) 和 conventions.md (289行) 提供了足够的基础上下文。

---

## 2. Ask 功能测试矩阵

### 测试配置
- 默认超时: `AG_ASK_TIMEOUT_SECONDS=45`
- Ask Pipeline: 3-agent swarm (ContextCurator → DeepAnalyst → AnswerSynthesizer)
- 检索模式: `AG_ASK_RETRIEVAL_FIRST=1` (默认)

### 测试结果

| # | 类别 | 问题 | 结果 | 质量 | 耗时 |
|---|------|------|------|------|------|
| 1 | 基础理解 | "What is this project?" | ✅ 成功 | ⭐⭐⭐⭐⭐ 准确概括, 含技术细节 | <45s |
| 2 | 技术栈 | "What tech stack and frameworks?" | ✅ 成功 | ⭐⭐⭐⭐⭐ 前后端分层, 库级别列举 | <45s |
| 3 | 模块列表 | "List all main modules and purpose" | ✅ 成功 | ⭐⭐⭐⭐⭐ 表格格式, 准确完整 | <45s |
| 4 | API 路由 | "How does API routing work?" | ✅ 成功 | ⭐⭐⭐⭐⭐ 前端路由+API端点, 极详细 | <45s |
| 5 | 数据库 | "Database schema, all tables" | ⚠️ 浅答 | ⭐⭐ 只看了空 .db 文件, 没分析 storage/ 代码 | <45s |
| 6 | 文件深分析 | "graph_expansion.py algorithm" | ⚠️ 误答 | ⭐⭐ **分析了错误文件** (executor wrapper 而非实际算法) | <45s |
| 7 | 数据流追踪 | "Trace create project flow end-to-end" | ❌ 超时 | ⭐ 降级为文件列表 | >45s |
| 8 | 安全分析 | "Security concerns in codebase" | ❌ 超时 | ⭐ 降级为文件列表 | >45s |
| 9 | 多agent架构 | "How does multi-agent work?" (45s) | ❌ 超时 | ⭐ 降级为文件列表 | >45s |
| 10 | 多agent架构 | 同上 **(120s timeout)** | ✅ 成功 | ⭐⭐⭐⭐⭐ 20个agent详列, 通信模式, 架构图 | ~90s |
| 11 | 幻觉测试 | "Does this support GraphQL?" | ✅ 成功 | ⭐⭐⭐⭐⭐ **正确否定**, 4维证据链 | <45s |
| 12 | 中文查询 | "社区监控支持哪些平台?" | ✅ 成功 | ⭐⭐⭐⭐⭐ 中文回答, 平台风格表 | <45s |
| 13 | 动作请求 | "Fix the bug in line 42 of main.py" | ✅ 合理 | ⭐⭐⭐⭐ 正确说没有 main.py, 要求澄清 | <45s |
| 14 | 外部对比 | "Compare with Langchain" | ❌ 超时 | ⭐ 需要外部知识, 超时降级 | >45s |
| 15 | 精确函数 | "get_model() in llm.py signature" | ✅ 成功 | ⭐⭐⭐⭐⭐ **100%准确**: 文件, 行号, 签名, 逻辑 | <45s |
| 16 | 检索模式 | "Approval workflow" (retrieval=2) | ✅ 成功 | ⭐⭐⭐⭐⭐ 详细workflow, 含行号和状态机 | <45s |
| 17 | 空问题 | "" (empty) | ✅ 优雅 | ⭐⭐⭐⭐ 返回项目概述, 引导提问 | <45s |
| 18 | 超长输入 | "What is AAAA...?" (5000 chars) | ✅ 优雅 | ⭐⭐⭐⭐ 识别为垃圾输入, 要求重新提问 | <45s |

---

## 3. 能力边界总结

### ✅ 强项 (可靠使用)

1. **项目级理解** — "这是什么项目/技术栈/模块" 类问题质量极高
2. **精确函数查询** — 给定文件名+函数名, 能准确返回签名/行号/逻辑
3. **幻觉抵抗** — 不会编造不存在的功能, 能给出否定证据链
4. **多语言支持** — 中文问题/中文回答质量好
5. **异常输入处理** — 空输入、垃圾输入、动作请求均优雅处理
6. **API/路由结构** — 从 structure.md 提取的信息查询效果出色
7. **Workflow 分析** — 对单一 service 文件的流程分析很准确 (如 approval_service)

### ⚠️ 有条件可用 (需调参)

1. **复杂架构问题** — 默认 45s 超时是瓶颈; **设置 `AG_ASK_TIMEOUT_SECONDS=120` 后可正常回答**
2. **跨模块分析** — 需要更长超时 + 模块知识 (目前 modules/ 为空)

### ❌ 弱项 (当前不可靠)

1. **文件定位准确性** — 同名/近似名文件可能定位错误 (graph_expansion.py → executors/graph.py)
2. **深层代码分析** — 不会主动读取 ORM/storage 层来推断 schema, 只看表面文件
3. **外部知识对比** — 无法完成 "与 Langchain 对比" 类需要外部知识的问题
4. **模块代理** — TeamoRouter-free 模型在多轮工具调用 agent 中全部超时失败
5. **超时降级质量** — 降级输出仅为文件列表, 无任何分析价值

---

## 4. 根因分析

### 核心瓶颈: TeamoRouter-free 模型性能

```
问题链:
  TeamoRouter-free 响应延迟高
    → 多轮 agent 交互超时
      → module agents 全部失败 (refresh)
      → 复杂问题 ask swarm 超时 (ask)
        → 降级输出无价值
```

### 超时分布

| 问题复杂度 | 所需时间 | 默认超时 (45s) | 120s 超时 |
|-----------|---------|---------------|----------|
| 简单 (项目概述) | ~15-30s | ✅ | ✅ |
| 中等 (单文件分析) | ~20-40s | ✅ | ✅ |
| 复杂 (跨模块/架构) | ~60-90s | ❌ 超时 | ✅ |
| 极复杂 (端到端追踪) | ~90-120s+ | ❌ 超时 | ⚠️ 边缘 |

---

## 5. 优化建议

### 立即可做

1. **调大超时**: `.env` 中设置 `AG_ASK_TIMEOUT_SECONDS=120`, `AG_REFRESH_AGENT_TIMEOUT_SECONDS=180`
2. **增加模块 agent 轮次**: 当前 max_turns=10 不够, 建议增至 20+
3. **改善超时降级**: 超时时至少返回 conventions.md + structure.md 的相关片段, 而非无用文件列表

### 架构改进

4. **文件检索增强**: ask_tools 的 `find_definition` 应匹配文件名, 不仅匹配 symbol — 避免 graph_expansion.py 定位到 executors/graph.py 的问题
5. **深层分析 prompt**: 对 "database schema" 类问题, 应引导 agent 查看 ORM/storage 代码而非 .db 文件
6. **分级回答策略**: 简单问题直接用 retrieval; 复杂问题才走 full swarm — 减少不必要的 agent 开销

### 模型层面

7. **考虑升级模型**: TeamoRouter-free 在单次问答质量好, 但多轮 agent 交互是短板。付费模型可能显著改善 refresh 和复杂 ask 的成功率

---

## 6. 评分总结

| 维度 | 评分 (1-10) | 说明 |
|------|-----------|------|
| 基础问答 | **9/10** | 项目理解、技术栈、模块列表质量极高 |
| 代码定位 | **7/10** | 精确查询优秀, 但同名文件场景有误差 |
| 深层分析 | **4/10** | 受超时限制; 120s 下提升至 7/10 |
| 幻觉控制 | **9/10** | 不会编造, 能给否定证据 |
| 多语言 | **9/10** | 中英文均优秀 |
| 鲁棒性 | **9/10** | 异常输入处理完善 |
| 知识库构建 | **5/10** | 核心产物 OK, 模块深度知识全部失败 |
| **综合** | **7/10** | **可用于日常代码问答; 复杂分析需调参; 模块深度知识缺失** |

---

## 7. 结论

**ag ask 是有用的**, 特别是对于:
- 快速了解项目结构和技术栈
- 精确查询某个函数/类的定义和逻辑
- 验证某个功能是否存在 (幻觉抵抗好)
- 中文用户体验

**主要能力边界**:
1. **时间墙**: 默认 45s 超时导致所有复杂问题失败, 调到 120s 可解决大部分
2. **深度墙**: 不会主动深入 ORM/schema 层, 文件检索有时定位错误
3. **模型墙**: TeamoRouter-free 在多轮 agent 场景下性能不足, 导致 refresh 模块知识全部缺失
