# Enterprise Architecture Assessment Plan (2026-03-02)

## 1) 当前成熟度快照
- 阶段状态：具备单 Agent、Swarm、MCP、本地/Microsandbox 执行能力。
- 架构类型：以模板和规则驱动为核心，偏“开发者工作台”而非“企业控制平面”。
- 主要短板：缺少统一观测、身份与权限、发布治理、韧性策略、供应链治理与多环境管理。

## 2) 关键证据
- 日志方式以 `print` 为主，未形成结构化日志与追踪上下文。
  - `src/agent.py`
  - `src/swarm.py`
  - `src/mcp_client.py`
- 外部调用缺少重试/退避/熔断策略。
  - `src/tools/openai_proxy.py`
  - `src/tools/ollama_local.py`
- 配置中存在 `MCP_CONNECTION_TIMEOUT`，但连接路径未统一应用超时控制。
  - `src/config.py`
  - `src/mcp_client.py`
- 依赖未锁定版本，供应链可重复性不足。
  - `requirements.txt`
- CI 仅执行 pytest，未包含 lint/type/security/SBOM/镜像扫描。
  - `.github/workflows/test.yml`
- 容器默认 root 运行。
  - `Dockerfile`
- MCP `env` 当前为原样传递，不自动变量展开。
  - `docs/en/MCP_INTEGRATION.md`

## 3) 目标企业级能力模型
- 治理层：身份、授权、审计、策略（Policy as Code）。
- 控制层：任务编排、配额、限流、重试、熔断、幂等。
- 执行层：隔离运行时（Microsandbox）、资源边界、回收策略。
- 数据层：状态持久化、事件存储、索引与保留策略。
- 可观测层：日志/指标/追踪 + SLO + 告警。
- 交付层：多环境发布、变更门禁、供应链安全。

## 4) 分阶段落地路线

### Phase A（1-2 周）：基线治理
1. 建立结构化日志（JSON），为每次请求生成 `trace_id`/`task_id`。
2. 引入统一异常分类（用户错误/系统错误/外部依赖错误）。
3. 为 OpenAI/Ollama/MCP 调用补充重试+指数退避（含最大重试次数）。
4. 将 `MCP_CONNECTION_TIMEOUT` 接入 MCP 实际连接流程。

### Phase B（2-4 周）：交付与供应链
1. 锁定依赖版本并建立升级策略（周度/双周）。
2. CI 增加：lint、type-check、security scan、coverage gate。
3. 产出 SBOM，并对 Docker 镜像做漏洞扫描。
4. Docker 运行用户改为非 root，最小化镜像权限。

### Phase C（4-8 周）：企业控制平面能力
1. 增加认证与授权（API key/JWT + RBAC）。
2. 增加配额、速率限制、并发上限与租户隔离。
3. 审计日志落盘（谁在何时调用了哪些工具/参数摘要/结果状态）。
4. Swarm 扩展到可配置编排（外置 worker map + 策略配置）。

### Phase D（8-12 周）：SRE 与合规
1. 定义并发布 SLO：成功率、P95 延迟、错误预算。
2. 增加健康探针、就绪探针、故障注入演练。
3. 建立数据保留、脱敏、密钥轮换流程。
4. 对关键能力建立“变更评审 + 回滚演练”。

## 5) 支撑企业级架构的方法论
- 架构方法：Hexagonal Architecture（端口适配器）+ DDD（限界上下文）。
- 可靠性方法：Bulkhead、Circuit Breaker、Retry with Jitter、Idempotency Key。
- 安全方法：Zero Trust、Least Privilege、Secret Manager、Audit Trail。
- 交付方法：Trunk-Based + Feature Flag + Progressive Delivery（Canary）。
- 运维方法：SLO/SLI、Error Budget、Runbook、GameDay。

## 6) 成功指标（建议）
- 可用性：月度成功率 ≥ 99.9%。
- 质量：关键路径单测覆盖 ≥ 80%，变更失败率 < 10%。
- 安全：高危漏洞修复 SLA < 24h。
- 交付：平均 lead time 降至 < 1 天（主干到生产）。

## 7) 立即可执行 Top 10
1. 接入结构化日志 + `trace_id`。
2. 全外部调用补齐 retry/backoff。
3. 使用并验证 `MCP_CONNECTION_TIMEOUT`。
4. `requirements.txt` 全量锁版本。
5. CI 加 lint/type/security/coverage gate。
6. Docker 改非 root。
7. 引入 secret 管理（不在配置文件内明文写密钥）。
8. 引入鉴权 + RBAC。
9. 加速率限制与配额。
10. 定义并监控首批 SLO。
