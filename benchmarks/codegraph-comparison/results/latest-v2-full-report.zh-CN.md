# RepoBrain vs CodeGraph latest-v2 完整实验报告

日期：2026-09-09

## 结论

RepoBrain 在四仓库主赛道中获胜。它的盲评语义正确率更高，查询运行时零失败，
计分查询的墙钟时间更短，查询 Token 用量也显著更低。CodeGraph 则以极大优势赢得
冷索引对比，并且是在 Grafana 压力测试仓库上唯一产出可用结果的产品。

这些结果只适用于下文锁定的仓库、题目、Trae CLI 和实际观测到的模型路由，
不代表普适的产品排名。

## 锁定的实验配置

- RepoBrain: `2f8419a1f520c375ad91550395217376cd725d40`
- CodeGraph: `1.6.0` (`dfccdf62547fcd76d343344d823a0e1998d3a89f`)
- 请求模型：`Seed-2.1-Turbo`
- 实际观测路由：`Seed-2.1-Turbo -> seed-code-pro`
- 赛道：`unrestricted_native`；两个产品均可使用各自的原生集成，并检查同一份锁定源码树。
- 重复次数：每题 3 次，单并发。
- 主赛道：Flask、ripgrep、Vite 和 Prometheus；20 道题，120 次产品运行。
- 压力赛道：Grafana；3 道题，18 个产品运行槽位。

## 主赛道结果

| 指标 | RepoBrain | CodeGraph + Trae | 获胜方 |
|---|---:|---:|---|
| 盲评加权语义正确率 | **95.83%** | 84.17% | RepoBrain |
| 正确 / 部分正确 / 错误 | **55 / 5 / 0** | 48 / 5 / 7 | RepoBrain |
| 成功查询运行数 | **60/60** | 53/60 | RepoBrain |
| 证据提及召回率 | 297/396 (75.0%) | **316/396 (79.8%)** | CodeGraph |
| 计分查询墙钟时间 | **5,106.67 s** | 20,621.14 s | RepoBrain |
| 查询 Token 数 | **22,326,315** | 86,027,974 | RepoBrain |
| 冷索引墙钟时间 | 7,420.63 s | **9.58 s** | CodeGraph |
| 索引 + 计分查询墙钟时间 | **12,527.30 s** | 20,630.72 s | RepoBrain |

RepoBrain 的查询 Token 用量约少 74.0%，计分查询运行约快 4.04x。计入成功的
冷索引构建后，在这组 60 次查询的工作负载中，RepoBrain 实测总时间仍约快 1.65x。
但 RepoBrain 单是冷索引就耗时约 2 小时 4 分钟，而 CodeGraph 约为 10 秒。

### 各仓库语义正确率

| 仓库 | RepoBrain | CodeGraph + Trae | 结果 |
|---|---:|---:|---|
| Flask | **100.00%** | 90.00% | RepoBrain |
| ripgrep | 93.33% | **96.67%** | CodeGraph |
| Vite | **93.33%** | 56.67% | RepoBrain |
| Prometheus | **96.67%** | 93.33% | RepoBrain |

Vite 上的巨大差距部分来自 CodeGraph 在最终计分数据集中的六次非成功运行。
按照协议，运行时失败和绕过产品的违规运行仍保留在语义正确率分母中，并计为错误。

### 各仓库冷索引时间

| 仓库 | RepoBrain | CodeGraph |
|---|---:|---:|
| Flask | 489.75 s | 0.94 s |
| ripgrep | 541.27 s | 1.04 s |
| Vite | 2,906.91 s | 2.81 s |
| Prometheus | 3,482.70 s | 4.80 s |

Vite 和 Prometheus 的部分 Map Agent 批次超时后，使用了确定性的 `map.md` 回退机制。
生成结果在 RepoBrain 公开工作流中保留明确警告，并发布为有效代次（active generation）。

## Grafana 压力赛道

RepoBrain 的公开完整刷新未能生成 active generation。一个模块组失败，且该仓库仅
`public_app` 就膨胀为 367 个 agent group。失败导致结果无法提升后，刷新被停止；
因此 RepoBrain 的全部九个回答槽位均为 `unavailable`。

| 指标 | RepoBrain | CodeGraph + Trae |
|---|---:|---:|
| 盲评加权语义正确率 | 0.00% | **83.33%** |
| 成功查询运行数 | 0/9 | **8/9** |
| 正确 / 部分正确 / 错误 | 0 / 0 / 9 | **7 / 1 / 1** |
| 查询 Token 数 | unavailable | 24,067,713 |
| 查询墙钟时间 | unavailable | 3,717.17 s |
| 冷索引墙钟时间 | unavailable | 67.88 s |

压力赛道由 CodeGraph 明确获胜。RepoBrain 的 0% 是运行时可用性惩罚，
并不表示其未产生的回答包含错误事实。

## 评审审计

评审采用两阶段、基于源码事实的流程：

1. 从干净、锁定版本的源码检出中提取 5–12 条关系事实及引用。
2. 仅依据这些 Ground Truth、且不使用工具，对匿名并确定性打乱的回答评分。

主赛道共评审 113 个成功回答，另有 7 次运行时失败自动受罚。Ground Truth 提取使用
7,947,211 tokens，评分使用 880,748 tokens。这些评审 Token 单独报告，
不计入任一产品的查询 Token 总量。

## 详细 Benchmark 规则

### 版本与语料锁定

| 组件 | 锁定版本 |
|---|---|
| RepoBrain | `2f8419a1f520c375ad91550395217376cd725d40` (`engine 0.3.2 / cli 2.0.2`) |
| CodeGraph | `1.6.0`, npm git head `dfccdf62547fcd76d343344d823a0e1998d3a89f` |
| Trae CLI | `0.201.1-alpha.9` |
| 请求的回答/评审模型 | `Seed-2.1-Turbo` |
| 实际服务模型 | `seed-code-pro` |
| Flask | `3.1.3` / `22d924701a6ae2e4cd01e9a15bbaf3946094af65` |
| ripgrep | `15.2.0` / `e89fff89ac9af12e8d4ce9d5fd07beb408ca730f` |
| Vite | `8.0.16` / `f94df87ff03b40b65e29bacdc04cc18c7bccaa4a` |
| Prometheus | `3.14.0` / `d7598b7141418fa35be2b5ec5d0fefb634199610` |
| Grafana | `13.2.1` / `56cd3e9288d8255fecebe5d05b48d191f50674b5` |

每个产品都使用同一锁定仓库 SHA 的独立 detached worktree。生成的 `.repobrain` 和
`.codegraph` 数据不会进入另一个产品的 worktree。

### 无限制原生执行规则

1. 两侧回答 Agent 都可以检查锁定源码树并使用各自产品的原生集成。该设定模拟正常 IDE 使用，
   而非完全不看源码的纯检索。
2. RepoBrain 必须通过公开完整刷新构建 active generation，并借助本地 Trae host runner
   通过 `rb-ask` 回答。
3. CodeGraph 侧 Agent 至少必须调用一次 CodeGraph CLI。命令次数不设上限，允许直接检查源码
   做验证。未观测到任何 CodeGraph 调用的运行记为 `protocol_violation`。
4. 两个产品都在只读沙箱中运行，并被明确要求不得修改源码。
5. 每个产品对每道题运行三次，`workers=1`。
6. 外层单次回答超时为 600 秒；Trae shell 命令的工具超时为 120 秒。
7. 结果按 run id、仓库、重复轮次和产品隔离。恢复运行时保留成功槽位；非成功槽位获得一次
   计分重试机会，第二次仍非成功则作为最终结果。
8. Grafana 是独立压力赛道，不纳入四仓库主排名平均值。

### 证据提及召回率

每个回答的自动证据指标计算方式为：

`(命中的预期文件数 + 命中的预期符号数) / (全部预期文件数 + 全部预期符号数)`

- 只有当 `sources` 包含预期文件完整的仓库相对路径，且该路径在锁定 SHA 中存在时，才算命中。
- 仅文件名、绝对路径、`..` 路径穿越，以及只在回答正文中提及的路径均不计分。
- 预期符号只有在回答或 sources 中以标识符边界出现时才算命中；例如 `runtime` 中的
  `run` 子串不计分。
- 此指标衡量是否提及证据，不衡量所描述的执行顺序、条件或关系是否正确。

### 两阶段语义盲评

对每道题：

1. Ground Truth Agent 检查一份没有任何产品索引的干净锁定检出，产出 5–12 条原子关系事实、
   引用和常见错误。
2. 所有成功的产品回答按仓库/题目标识，使用固定随机种子 `20260908` 匿名并打乱顺序。
3. 单独的评分调用只接收 Ground Truth 和匿名回答。它禁止使用工具或读取文件，独立评判每个
   回答，不进行候选排名、不猜测产品身份，也不因篇幅长而加分。

评分维度如下：

- 结论：`correct`、`partially_correct` 或 `incorrect`。
- 事实性：`accurate`、`minor_errors` 或 `major_errors`。
- 完整性：`complete`、`partial` 或 `incomplete`。
- 引用有效性：`valid`、`partially_valid`、`invalid` 或 `no_citations`。
- 评审还会记录具体的无依据主张和理由。

加权语义正确率为：

`(correct * 1 + partially_correct * 0.5 + incorrect * 0) / 全部计划回答槽位数`

### 失败与可用性策略

- 超时、崩溃、格式错误/空输出、协议违规和前置条件不可用，均保留在分母中。
- 每个非成功槽位自动受到语义惩罚：`incorrect / major_errors / incomplete / invalid`。
- RepoBrain 运行只有在 `.repobrain/current.json` 指向一个已存在、且 `head_sha` 与锁定源码
  版本一致的 generation 时才具备资格。中止的 staging 目录不视为有效索引。
- 如果公开构建无法创建此前置条件，回答记为 `unavailable`。这是端到端可用性惩罚，
  并非声称一个不存在的回答包含错误事实。
- 对不可用回答，聚合端到端表中的证据召回显示为零；语义可用性则明确记录自动失败惩罚。

### 时间、Token 与成本

- 查询墙钟时间是所有槽位最终计分尝试的时间总和；有实测时间的失败运行仍计入。
- 冷构建时间单独报告。RepoBrain 的公开完整刷新构建模型生成的仓库知识，CodeGraph `init`
  构建静态图。两种产物在语义上并不等价，因此冷构建数字描述的是用户感知的前置成本，
  而不是完全同类的纯索引速度对比。
- Trae 用量来自 `turn.completed`：保留 input、cache-creation input、cached input、output
  和 reasoning-output tokens。报告中的 `total_tokens` 为 input 加 output；cached 和
  reasoning 字段在原始结果中单独报告。
- 产品查询 Token 不含评审 Token。RepoBrain 刷新未暴露索引生成 Token，因此完整构建
  Token 成本不可用。
- 只有运行时字段明确提供 `total_cost_usd` 或 `cost_usd` 时才接受货币成本。本次未输出
  金额，因此货币成本仍不可用。

## 逐题三轮重复结果

`C/P/I` 表示语义评审给出的正确 / 部分正确 / 错误。Evidence 是三轮重复的证据提及得分之和。
平均时间取最终计分尝试；Token 是可取得的最终尝试查询 Token。

| 题目 | 产品 | C/P/I | 证据 | 成功 | 平均秒数 | Token |
|---|---|---:|---:|---:|---:|---:|
| `flask-blueprint-registration` | RepoBrain | 3/0/0 | 12/15 | 3/3 | 58.92 | 695,581 |
| `flask-blueprint-registration` | CodeGraph | 3/0/0 | 13/15 | 3/3 | 110.25 | 1,200,067 |
| `flask-cli-app-loading` | RepoBrain | 3/0/0 | 12/15 | 3/3 | 52.39 | 476,482 |
| `flask-cli-app-loading` | CodeGraph | 2/1/0 | 14/15 | 3/3 | 139.00 | 1,649,117 |
| `flask-context-lifecycle` | RepoBrain | 3/0/0 | 12/15 | 3/3 | 54.40 | 778,637 |
| `flask-context-lifecycle` | CodeGraph | 3/0/0 | 14/15 | 3/3 | 103.30 | 958,504 |
| `flask-request-dispatch` | RepoBrain | 3/0/0 | 15/18 | 3/3 | 56.62 | 634,937 |
| `flask-request-dispatch` | CodeGraph | 2/1/0 | 15/18 | 3/3 | 112.11 | 1,185,963 |
| `flask-session-cookie` | RepoBrain | 3/0/0 | 9/12 | 3/3 | 53.42 | 769,934 |
| `flask-session-cookie` | CodeGraph | 2/1/0 | 11/12 | 3/3 | 90.73 | 986,298 |
| `ripgrep-argument-normalization` | RepoBrain | 3/0/0 | 15/24 | 3/3 | 84.79 | 1,072,105 |
| `ripgrep-argument-normalization` | CodeGraph | 3/0/0 | 21/24 | 3/3 | 350.21 | 4,886,770 |
| `ripgrep-ignore-walk` | RepoBrain | 3/0/0 | 10/18 | 3/3 | 90.71 | 1,067,669 |
| `ripgrep-ignore-walk` | CodeGraph | 3/0/0 | 13/18 | 3/3 | 363.81 | 5,816,791 |
| `ripgrep-main-dispatch` | RepoBrain | 3/0/0 | 12/15 | 3/3 | 52.72 | 547,154 |
| `ripgrep-main-dispatch` | CodeGraph | 3/0/0 | 14/15 | 3/3 | 359.33 | 5,281,050 |
| `ripgrep-match-print` | RepoBrain | 1/2/0 | 11/18 | 3/3 | 73.57 | 1,096,504 |
| `ripgrep-match-print` | CodeGraph | 2/1/0 | 16/18 | 3/3 | 414.74 | 6,681,820 |
| `ripgrep-search-worker` | RepoBrain | 3/0/0 | 18/24 | 3/3 | 73.63 | 905,739 |
| `ripgrep-search-worker` | CodeGraph | 3/0/0 | 21/24 | 3/3 | 427.73 | 7,481,953 |
| `vite-build-orchestration` | RepoBrain | 2/1/0 | 13/15 | 3/3 | 145.11 | 2,550,243 |
| `vite-build-orchestration` | CodeGraph | 2/0/1 | 10/15 | 2/3 | 471.93 | 4,494,127 |
| `vite-dev-server-creation` | RepoBrain | 3/0/0 | 12/21 | 3/3 | 95.41 | 1,281,336 |
| `vite-dev-server-creation` | CodeGraph | 2/0/1 | 11/21 | 2/3 | 482.14 | 5,007,289 |
| `vite-hmr-propagation` | RepoBrain | 3/0/0 | 18/24 | 3/3 | 95.05 | 1,121,821 |
| `vite-hmr-propagation` | CodeGraph | 1/0/2 | 8/24 | 1/3 | 564.53 | 2,659,149 |
| `vite-plugin-ordering` | RepoBrain | 2/1/0 | 12/18 | 3/3 | 76.87 | 1,003,720 |
| `vite-plugin-ordering` | CodeGraph | 1/1/1 | 10/18 | 2/3 | 401.79 | 3,333,988 |
| `vite-transform-request` | RepoBrain | 3/0/0 | 18/24 | 3/3 | 87.88 | 979,509 |
| `vite-transform-request` | CodeGraph | 2/0/1 | 16/24 | 2/3 | 362.25 | 2,101,880 |
| `prometheus-promql-execution` | RepoBrain | 3/0/0 | 15/21 | 3/3 | 154.33 | 2,467,046 |
| `prometheus-promql-execution` | CodeGraph | 2/0/1 | 14/21 | 2/3 | 557.52 | 5,279,480 |
| `prometheus-remote-write-queue` | RepoBrain | 3/0/0 | 18/21 | 3/3 | 107.74 | 1,911,790 |
| `prometheus-remote-write-queue` | CodeGraph | 3/0/0 | 19/21 | 3/3 | 318.22 | 5,205,520 |
| `prometheus-rule-evaluation` | RepoBrain | 3/0/0 | 21/27 | 3/3 | 79.49 | 900,324 |
| `prometheus-rule-evaluation` | CodeGraph | 3/0/0 | 27/27 | 3/3 | 446.36 | 7,757,351 |
| `prometheus-scrape-lifecycle` | RepoBrain | 2/1/0 | 23/27 | 3/3 | 75.32 | 797,138 |
| `prometheus-scrape-lifecycle` | CodeGraph | 3/0/0 | 25/27 | 3/3 | 338.32 | 5,492,123 |
| `prometheus-tsdb-append` | RepoBrain | 3/0/0 | 21/24 | 3/3 | 133.85 | 1,268,646 |
| `prometheus-tsdb-append` | CodeGraph | 3/0/0 | 24/24 | 3/3 | 459.45 | 8,568,734 |
| `grafana-alert-scheduler` | RepoBrain | 0/0/3 | 0/21 | 0/3 | - | 0 |
| `grafana-alert-scheduler` | CodeGraph | 2/1/0 | 18/21 | 3/3 | 404.76 | 8,003,523 |
| `grafana-dashboard-loading` | RepoBrain | 0/0/3 | 0/30 | 0/3 | - | 0 |
| `grafana-dashboard-loading` | CodeGraph | 3/0/0 | 21/30 | 3/3 | 336.10 | 7,504,834 |
| `grafana-http-server-startup` | RepoBrain | 0/0/3 | 0/21 | 0/3 | - | 0 |
| `grafana-http-server-startup` | CodeGraph | 2/0/1 | 14/21 | 2/3 | 498.20 | 8,559,356 |

## 完整题目目录

下文是发送给两个产品的完整原始 Prompt。预期文件和符号是证据提及的原子项，
不是语义 Ground Truth。

### `flask-request-dispatch`

- 仓库/类别：`flask` / `cross_file_path`
- 题目：Flask 如何让一个 WSGI 请求依次经过请求预处理、端点分派和响应最终处理？请引用定义各阶段的文件和符号。
- 预期文件：`src/flask/app.py`
- 预期符号：`wsgi_app`, `full_dispatch_request`, `preprocess_request`, `dispatch_request`, `finalize_request`

### `flask-context-lifecycle`

- 仓库/类别：`flask` / `lifecycle`
- 题目：Flask 的应用上下文和请求上下文如何进入和退出各自的生命周期？每个 push 和 pop 操作分别由哪个上下文类负责？请引用文件路径和符号。
- 预期文件：`src/flask/ctx.py`
- 预期符号：`AppContext`, `RequestContext`, `push`, `pop`

### `flask-session-cookie`

- 仓库/类别：`flask` / `state_persistence`
- 题目：Flask 如何将已签名的 cookie 加载到 session，并将 session 保存回响应？请引用具体的 session 接口、方法和文件。
- 预期文件：`src/flask/sessions.py`
- 预期符号：`SecureCookieSessionInterface`, `open_session`, `save_session`

### `flask-blueprint-registration`

- 仓库/类别：`flask` / `registration_flow`
- 题目：Flask Blueprint 如何注册到应用上？其中延迟处理的路由如何变成应用 URL 规则？请引用文件路径和符号。
- 预期文件：`src/flask/sansio/blueprints.py`
- 预期符号：`Blueprint`, `BlueprintSetupState`, `register`, `add_url_rule`

### `flask-cli-app-loading`

- 仓库/类别：`flask` / `configuration_flow`
- 题目：Flask CLI 如何创建命令上下文，并定位或加载目标 Flask 应用？请引用负责此过程的类、方法和文件。
- 预期文件：`src/flask/cli.py`
- 预期符号：`FlaskGroup`, `make_context`, `ScriptInfo`, `load_app`

### `ripgrep-main-dispatch`

- 仓库/类别：`ripgrep` / `command_dispatch`
- 题目：ripgrep 的可执行程序入口如何将解析后的参数分派到串行或并行搜索执行？请引用文件路径和符号。
- 预期文件：`crates/core/main.rs`
- 预期符号：`main`, `run`, `search`, `search_parallel`

### `ripgrep-argument-normalization`

- 仓库/类别：`ripgrep` / `configuration_flow`
- 题目：原始命令行 flags 如何解析成 LowArgs，并在执行前进一步规范化为 HiArgs？请引用文件路径和符号。
- 预期文件：`crates/core/flags/parse.rs`, `crates/core/flags/lowargs.rs`, `crates/core/flags/hiargs.rs`
- 预期符号：`parse`, `parse_low`, `LowArgs`, `HiArgs`, `from_low_args`

### `ripgrep-search-worker`

- 仓库/类别：`ripgrep` / `dependency_mapping`
- 题目：ripgrep 如何把规范化后的参数转成 matcher、searcher、printer 和可执行的 search worker？请引用构造方法、类型和文件。
- 预期文件：`crates/core/flags/hiargs.rs`, `crates/core/search.rs`
- 预期符号：`matcher`, `searcher`, `printer`, `search_worker`, `SearchWorkerBuilder`, `PatternMatcher`

### `ripgrep-ignore-walk`

- 仓库/类别：`ripgrep` / `filtering_flow`
- 题目：ripgrep 如何构建并行文件系统遍历，并在遍历条目时应用包括父目录规则在内的 gitignore 匹配？请引用文件路径和符号。
- 预期文件：`crates/ignore/src/walk.rs`, `crates/ignore/src/gitignore.rs`
- 预期符号：`WalkBuilder`, `build_parallel`, `GitignoreBuilder`, `matched_path_or_any_parents`

### `ripgrep-match-print`

- 仓库/类别：`ripgrep` / `cross_crate_path`
- 题目：Rust-regex matcher 如何构建，并连接到负责格式化匹配结果的标准 printer sink？请引用关键 builder、sink 回调和文件。
- 预期文件：`crates/regex/src/matcher.rs`, `crates/printer/src/standard.rs`
- 预期符号：`RegexMatcherBuilder`, `StandardBuilder`, `sink`, `matched`

### `vite-dev-server-creation`

- 仓库/类别：`vite` / `startup_flow`
- 题目：Vite 如何根据用户配置创建开发服务器、解析该配置，并组装实际启用的插件？请引用文件路径和符号。
- 预期文件：`packages/vite/src/node/server/index.ts`, `packages/vite/src/node/config.ts`, `packages/vite/src/node/plugins/index.ts`
- 预期符号：`createServer`, `_createServer`, `resolveConfig`, `resolvePlugins`

### `vite-transform-request`

- 仓库/类别：`vite` / `plugin_pipeline`
- 题目：Vite 开发服务器的模块请求如何从 transformRequest 开始，经过加载、插件解析或转换继续推进？请引用文件路径和符号。
- 预期文件：`packages/vite/src/node/server/transformRequest.ts`, `packages/vite/src/node/server/pluginContainer.ts`
- 预期符号：`transformRequest`, `loadAndTransform`, `EnvironmentPluginContainer`, `resolveId`, `load`, `transform`

### `vite-hmr-propagation`

- 仓库/类别：`vite` / `state_reconciliation`
- 题目：Vite 如何处理发生变化的文件、使模块图状态失效，并把 HMR 更新传播到受影响的模块？请引用文件路径和符号。
- 预期文件：`packages/vite/src/node/server/hmr.ts`, `packages/vite/src/node/server/moduleGraph.ts`
- 预期符号：`handleHMRUpdate`, `updateModules`, `propagateUpdate`, `EnvironmentModuleGraph`, `onFileChange`, `invalidateModule`

### `vite-build-orchestration`

- 仓库/类别：`vite` / `build_pipeline`
- 题目：Vite 如何创建 builder、解析构建插件并执行构建环境？请引用负责此过程的文件和符号。
- 预期文件：`packages/vite/src/node/build.ts`
- 预期符号：`build`, `createBuilder`, `resolveBuildPlugins`, `buildEnvironment`

### `vite-plugin-ordering`

- 仓库/类别：`vite` / `algorithm_dispatch`
- 题目：Vite 如何对用户插件排序，并提供按特定 hook 排序的插件列表供执行？请引用文件路径和符号。
- 预期文件：`packages/vite/src/node/config.ts`, `packages/vite/src/node/plugins/index.ts`
- 预期符号：`sortUserPlugins`, `resolvePlugins`, `createPluginHookUtils`, `getSortedPluginsByHook`

### `prometheus-promql-execution`

- 仓库/类别：`prometheus` / `query_execution`
- 题目：Prometheus 如何解析一条即时 PromQL 查询，并使其依次经过查询创建、执行和表达式求值？请引用文件路径和符号。
- 预期文件：`promql/parser/parse.go`, `promql/engine.go`
- 预期符号：`ParseExpr`, `NewInstantQuery`, `Exec`, `exec`, `Eval`

### `prometheus-scrape-lifecycle`

- 仓库/类别：`prometheus` / `runtime_lifecycle`
- 题目：Prometheus 如何应用抓取配置、将目标集合协调成 scrape pool，并运行每个 scrape loop？请引用文件路径和符号。
- 预期文件：`scrape/manager.go`, `scrape/scrape.go`
- 预期符号：`Manager`, `ApplyConfig`, `updateTsets`, `scrapePool`, `Sync`, `scrapeLoop`, `run`

### `prometheus-tsdb-append`

- 仓库/类别：`prometheus` / `state_persistence`
- 题目：Prometheus TSDB 的 append 请求如何获取 Head appender、添加样本、写入提交记录，并提交或回滚？请引用文件路径和符号。
- 预期文件：`tsdb/head_append.go`
- 预期符号：`Head`, `Appender`, `headAppender`, `Append`, `log`, `Commit`, `Rollback`

### `prometheus-remote-write-queue`

- 仓库/类别：`prometheus` / `queue_processing`
- 题目：Prometheus remote write 如何将样本入队、对队列分片、组成批次，并重试发送写请求？请引用文件路径和符号。
- 预期文件：`storage/remote/queue_manager.go`
- 预期符号：`QueueManager`, `Append`, `updateShardsLoop`, `runShard`, `sendSamplesWithBackoff`, `sendWriteRequestWithBackoff`

### `prometheus-rule-evaluation`

- 仓库/类别：`prometheus` / `scheduler_flow`
- 题目：Prometheus 如何加载和调度规则组、对规则组求值，并选择串行或并发的规则批次？请引用文件路径和符号。
- 预期文件：`rules/manager.go`, `rules/group.go`
- 预期符号：`Manager`, `Update`, `LoadGroups`, `Group`, `run`, `Eval`, `SplitGroupIntoBatches`

### `grafana-http-server-startup`

- 仓库/类别：`grafana` / `stress_startup_flow`
- 题目：Grafana 如何构建并运行 HTTP server、挂载 middleware 和 routes，并开始为 listeners 提供服务？请引用文件路径和符号。
- 预期文件：`pkg/api/http_server.go`
- 预期符号：`HTTPServer`, `ProvideHTTPServer`, `Run`, `applyRoutes`, `addMiddlewaresAndStaticRoutes`, `getListeners`

### `grafana-alert-scheduler`

- 仓库/类别：`grafana` / `stress_scheduler_flow`
- 题目：Grafana 的告警调度器如何运行周期性 tick、选出已准备执行的规则，并分派求值任务？请引用文件路径和符号。
- 预期文件：`pkg/services/ngalert/schedule/schedule.go`
- 预期符号：`NewScheduler`, `Run`, `schedulePeriodic`, `processTick`, `runJobFn`, `runSequences`

### `grafana-dashboard-loading`

- 仓库/类别：`grafana` / `stress_frontend_flow`
- 题目：Grafana 的 dashboard scene 页面如何选择 state manager、加载 dashboard、获取其数据并将其转成 scene？请引用文件路径和符号。
- 预期文件：`public/app/features/dashboard-scene/pages/DashboardScenePage.tsx`, `public/app/features/dashboard-scene/pages/DashboardScenePageStateManager.ts`, `public/app/features/dashboard/services/DashboardLoaderSrv.ts`
- 预期符号：`DashboardScenePage`, `getDashboardScenePageStateManager`, `DashboardScenePageStateManager`, `loadDashboard`, `loadScene`, `fetchDashboard`, `DashboardLoaderSrv`

## 复现命令与产物

```bash
# 准备锁定版本的 worktree 和工具版本。
bash benchmarks/codegraph-comparison/scripts/bootstrap.sh \
  --repository flask --repository ripgrep --repository vite \
  --repository prometheus --repository grafana

# 构建各产品的前置条件。采集构建时间时应按仓库串行运行。
benchmarks/codegraph-comparison/.work/v2/tools/repobrain-venv/bin/python \
  benchmarks/codegraph-comparison/scripts/prepare_corpora.py \
  --repository flask --product all

# 主赛道 120 个回答槽位。
benchmarks/codegraph-comparison/.work/v2/tools/repobrain-venv/bin/python \
  benchmarks/codegraph-comparison/scripts/run_benchmark_v2.py \
  --run-id main-full-v2 --track unrestricted_native \
  --repository flask --repository ripgrep --repository vite \
  --repository prometheus --repeat 3 --workers 1

# 主赛道语义评审。
benchmarks/codegraph-comparison/.work/v2/tools/repobrain-venv/bin/python \
  benchmarks/codegraph-comparison/scripts/judge_benchmark_v2.py \
  benchmarks/codegraph-comparison/results/runs/main-full-v2/unrestricted_native/results.json \
  --output benchmarks/codegraph-comparison/results/runs/main-full-v2/unrestricted_native/semantic-judge-v2.json \
  --resume --ground-truth-timeout 600 --grading-timeout 300
```

权威本地产物：

- 主赛道回答结果：`results/runs/main-full-v2/unrestricted_native/results.json`
- 主赛道语义结果：`results/runs/main-full-v2/unrestricted_native/semantic-judge-v2.json`
- 主赛道可读运行报告：`results/runs/main-full-v2/unrestricted_native/report.md`
- 压力赛道回答结果：`results/runs/grafana-stress-v2/unrestricted_native/results.json`
- 压力赛道语义结果：`results/runs/grafana-stress-v2/unrestricted_native/semantic-judge-v2.json`
- 逐回答事件和日志：位于各次运行的 repository/repeat/product 路径下
- 构建日志和无源码语料来源记录：`.work/v2/build-logs/` 和 `.work/v2/corpora/`

## 局限性

- 货币成本不可用，因为 Trae JSONL 未输出价格，因此改为报告 Token 用量。
- RepoBrain 刷新流水线未暴露索引生成阶段的 Token 用量，所以查询 Token 可比较，
  但完整构建 Token 成本不可用。
- 上述时间使用每个槽位的最终计分尝试。此前失败的尝试及测试框架调试重试不计入计分总量。
- 证据提及召回率不等同于语义正确性；语义指标以盲评结果为准。
- 更换模型、仓库版本、题集、超时时间或并发数，都可能改变结果。
- 本次每题运行了三轮，但未完成协议中达到正式发表级别所建议的三次冷构建、
  十次确定性延迟重复测试或配对 bootstrap 置信区间。
