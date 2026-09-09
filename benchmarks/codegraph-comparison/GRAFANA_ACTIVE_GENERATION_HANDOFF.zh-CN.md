# Grafana 未生成 RepoBrain active generation：排障交接计划

## 交接目标

请定位并修复 RepoBrain 在 Grafana `13.2.1` 全仓执行公开完整刷新时，无法完成并发布
active generation 的问题。修复后必须通过公开 `rb-refresh` 路径生成与锁定 SHA 一致的
`current.json`，不能使用 benchmark ceiling 脚本、手工改状态或私自 promote。

## 锁定环境

- RepoBrain 当前主线：以本交接文件所在的最新 `main` 为准
- 用于失败运行的 RepoBrain 核心版本：`2f8419a1f520c375ad91550395217376cd725d40`
- Grafana：`13.2.1`
- Grafana SHA：`56cd3e9288d8255fecebe5d05b48d191f50674b5`
- Runner：本地 `trae-cli 0.201.1-alpha.9`
- 请求模型：`Seed-2.1-Turbo`
- 实际模型：`seed-code-pro`
- 工作树：`benchmarks/codegraph-comparison/.work/v2/worktrees/grafana-repobrain`

## 已证实事实

1. Scanner 完成：扫描 21,802 个文件，耗时 6.59 秒，未超时。
2. 刷新识别出 120 个模块，module concurrency 为 8，API concurrency 为 5。
3. 日志明确记录：
   - `packages_grafana-data/tests_2 failed:`，但冒号后没有异常文本。
   - `RefreshModule_packages_grafana-data done (partial)`。
4. 刷新没有因该 partial 立即停止，而是继续处理后续模块。
5. 日志最后停在：`RefreshModule_public_app (367 groups)...`。
6. 该运行后来由测试执行者人工中断，因为已有 partial 时现有 generation gate 最终不会发布，
   继续完成 367 个 public_app 分组只会扩大模型消耗。
7. 工作树中没有 `.repobrain/current.json`，也没有最终 snapshot；因此没有 active generation。
8. 运行中的 staging `status.json` 不能当作最终成功状态；其中的 `overall_status=success` 是尚未
   做最终聚合的中间快照。

## 不能从现有证据断言的内容

- 不能断言 partial 本身立即终止了刷新；事实恰好相反，刷新继续执行。
- 不能只凭空字符串确定异常一定是 TimeoutError。它与裸 `TimeoutError` 表现一致，但需要
  记录异常类型和 `repr` 后确认。
- 不能断言 public_app 阶段由内部崩溃自然终止；现有日志终止包含人工中断因素。
- 不能把 `367 groups` 描述为硬编码文件上限。它是当前模块识别与分组策略对巨型
  `public_app` 模块的运行结果。

## 直接相关的代码入口

- Group 失败捕获与空错误文本：
  `engine/repobrain_engine/hub/refresh_pipeline.py`，约第 631–685 行。
- 模块和总体状态聚合：
  `engine/repobrain_engine/hub/refresh_pipeline.py`，约第 719–722、852 行。
- Full refresh generation gate：
  `engine/repobrain_engine/hub/refresh_pipeline.py`，约第 940–985 行。
- 当前规则：`overall_status != success` 时删除 staging generation，不 promote；只有全 success
  才写 snapshot/current pointer。
- 模块文件分组：
  `engine/repobrain_engine/hub/module_grouping.py`，约第 32–36、349–412 行。
- 现有分组参考：约 30K effective token budget、每组最多 20 个文件，并结合 import 连通性、
  目录共置和文件名前缀。
- Benchmark build wrapper：
  `benchmarks/codegraph-comparison/scripts/prepare_corpora.py`，当前重建时会清理目标 `.repobrain`，
  不支持从同一 full-refresh staging generation 恢复。

## 证据位置

- Grafana stderr：
  `benchmarks/codegraph-comparison/.work/v2/build-logs/grafana/repobrain.stderr`
- Grafana stdout：
  `benchmarks/codegraph-comparison/.work/v2/build-logs/grafana/repobrain.stdout`
- Grafana pinned worktree：
  `benchmarks/codegraph-comparison/.work/v2/worktrees/grafana-repobrain`
- Benchmark manifest：
  `benchmarks/codegraph-comparison/config/manifest-latest-v2.json`
- 结果页：
  `benchmarks/codegraph-comparison/results/latest-v2-full-report.zh-CN.md`

## 建议排查顺序

### 阶段 1：先补齐失败证据

1. 将 `failure_reason=str(exc)` 改为至少记录：异常类型、`repr(exc)`、module/group id、attempt、
   超时配置和开始/结束时间。
2. 在 full refresh 顶层记录 run id、PID、开始时间、最终退出原因，以及
   SIGINT/SIGTERM/KeyboardInterrupt 等中断信号。
3. 每个 group 必须同时有 started 和 terminal 状态，不能只留下空错误字符串。
4. 写回状态时区分 `running snapshot` 和 `terminal refresh status`。

### 阶段 2：做最小可重复复现

不要一开始反复重跑整个 Grafana 全仓。先新增专用诊断脚本，在锁定 worktree 上只执行：

1. `detect_modules` / `resolve_module_path`
2. `load_module_files`
3. `group_files`
4. 输出 public_app 的文件总数、分组数、每组文件数/估算 token、import 连通分量、目录/前缀
   来源，以及最大、最小和中位组大小。
5. 单独重跑 `packages_grafana-data/tests_2`，确认异常类型及其稳定性。

注意：直接运行 `prepare_corpora.py` 会清理现有 `.repobrain`。取得完整证据前不要覆盖当前
staging；请复制证据或使用新的隔离 work root。

### 阶段 3：实现 full-refresh 可恢复性

1. 为同一 workspace HEAD 保留未发布 staging generation。
2. 重启时读取 refresh status，只重跑 failed/pending group。
3. 已 success 的 group 按内容哈希复用，不得重新调用模型。
4. 中断后可以 resume，而不是从 21,802 个文件重新开始。
5. 为 full refresh 增加明确的 `--failed-only` / resume 契约，但不能改变锁定 source SHA。

### 阶段 4：控制巨型模块调度

1. 不要一次为 public_app 的 367 个 group 全部创建并发任务。
2. 使用固定窗口或 bounded queue，保证同时活跃 group 数受控。
3. 按更细的目录层级拆分 `public_app` catch-all 模块。
4. 审计 import graph + directory + prefix 策略为什么没有进一步形成稳定子模块。
5. 失败 group 独立退避和重试，不应拖住数百个已排队任务。
6. 只有确认 prompt/token 上限允许后，才评估调大每组文件数或 token budget。

### 阶段 5：决定 partial generation 的产品语义

这是产品决策，不应由实现者偷偷选择：

- 方案 A：继续要求全 success 才 promote，但必须支持断点恢复，直到所有 group 终态成功。
- 方案 B：允许显式 degraded generation 发布，同时要求：
  - `current.json` / status 明确标记 partial/degraded；
  - 查询必须携带缺失模块警告；
  - benchmark 不得把 degraded 当成 full success；
  - 后续 `--failed-only` 可以补齐并升级为完整 generation。

不允许直接把 partial 改成 success，或复用旧 ceiling 脚本手工 promote。

## 建议测试

1. 裸 `TimeoutError` 日志必须包含异常类型，不能为空。
2. 任一 group 超时后，其他 group 仍可完成并持久化 terminal 状态。
3. 中断后 resume 只重跑 failed/pending group。
4. 已成功 group 的输入未变化时不会重新调用模型。
5. 人为注入一个 group timeout：首次不发布，resume 成功后发布。
6. public_app 数百组使用窗口化调度，峰值活跃任务不超过配置值。
7. Flask、ripgrep、Vite、Prometheus 的现有 full refresh 行为不退化。

## 最终验收标准

- 在锁定 Grafana SHA 上，公开完整刷新能在明确的时间、内存和并发预算内结束。
- 每个发现的 module/group 都有 terminal 状态，不能有遗漏或永久 pending。
- `.repobrain/current.json` 存在并指向真实 generation。
- `current.json.head_sha` 等于
  `56cd3e9288d8255fecebe5d05b48d191f50674b5`。
- snapshot 和 status 都是最终态，而不是运行中间态。
- 单组 timeout 可以被明确诊断并通过 resume/failed-only 补齐。
- 人工中断后重新运行不会重算已成功 group。
- Grafana 的 9 个 RepoBrain benchmark 槽位不再因缺 active generation 而全部 unavailable。
- 全部现有 engine tests 与新增 Grafana recovery/integration tests 通过。
