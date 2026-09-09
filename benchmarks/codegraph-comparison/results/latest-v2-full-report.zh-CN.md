# RepoBrain vs CodeGraph latest-v2 实验结果

日期：2026-09-09

## 结论

RepoBrain 赢得四仓库主榜；CodeGraph 赢得 Grafana 超大仓压力榜。

该结论只适用于本次锁定版本、题集、Trae CLI 和模型路由，不能外推为普适产品排名。

## 实验快照

- RepoBrain：`2f8419a1f520c375ad91550395217376cd725d40`
- CodeGraph：`1.6.0`（git head `dfccdf62547fcd76d343344d823a0e1998d3a89f`）
- Trae CLI：`0.201.1-alpha.9`
- 请求模型：`Seed-2.1-Turbo`
- 实际模型路由：`Seed-2.1-Turbo -> seed-code-pro`
- 赛道：`unrestricted_native`，双方均可读取相同的锁定源码并使用各自原生能力
- 重复规则：每题 3 次，单并发，单次回答超时 600 秒
- 主榜：Flask、ripgrep、Vite、Prometheus，共 20 题、120 个产品运行槽位
- 压力榜：Grafana，共 3 题、18 个产品运行槽位，独立统计

## 主榜结果

| 指标 | RepoBrain | CodeGraph + Trae | 获胜方 |
|---|---:|---:|---|
| 盲评加权语义正确率 | **95.83%** | 84.17% | RepoBrain |
| 正确 / 部分正确 / 错误 | **55 / 5 / 0** | 48 / 5 / 7 | RepoBrain |
| 成功查询运行数 | **60/60** | 53/60 | RepoBrain |
| 证据提及召回率 | 297/396（75.0%） | **316/396（79.8%）** | CodeGraph |
| 计分查询墙钟时间 | **5,106.67 秒** | 20,621.14 秒 | RepoBrain |
| 查询 Token | **22,326,315** | 86,027,974 | RepoBrain |
| 冷构建墙钟时间 | 7,420.63 秒 | **9.58 秒** | CodeGraph |
| 冷构建 + 计分查询 | **12,527.30 秒** | 20,630.72 秒 | RepoBrain |

主榜中，RepoBrain 的计分查询约快 4.04 倍，查询 Token 少约 74%。计入成功的冷构建后，
在这组 60 次查询的工作负载中，RepoBrain 总耗时仍约快 1.65 倍。

不过，RepoBrain 的冷构建约为 2 小时 4 分钟，CodeGraph 约为 10 秒。两者产物并不完全
同类：RepoBrain 完整刷新会生成模型知识文档，CodeGraph `init` 构建静态代码图。因此该数字
表示用户感知的前置成本，不是完全同类的纯索引速度比较。

## 各仓库语义正确率

| 仓库 | RepoBrain | CodeGraph + Trae | 获胜方 |
|---|---:|---:|---|
| Flask | **100.00%** | 90.00% | RepoBrain |
| ripgrep | 93.33% | **96.67%** | CodeGraph |
| Vite | **93.33%** | 56.67% | RepoBrain |
| Prometheus | **96.67%** | 93.33% | RepoBrain |

Vite 的较大差距部分来自 CodeGraph 最终计分数据中的 6 次非成功运行。按照端到端规则，
运行失败、协议违规和前置条件不可用均保留在语义正确率分母中并计为错误。

## 各仓库冷构建时间

| 仓库 | RepoBrain | CodeGraph |
|---|---:|---:|
| Flask | 489.75 秒 | 0.94 秒 |
| ripgrep | 541.27 秒 | 1.04 秒 |
| Vite | 2,906.91 秒 | 2.81 秒 |
| Prometheus | 3,482.70 秒 | 4.80 秒 |

Vite 和 Prometheus 的部分 Map Agent 批次超时后使用了确定性 `map.md` 回退。生成结果
保留明确 warning，并通过 RepoBrain 公开工作流发布为 active generation。

## Grafana 压力榜

RepoBrain 的公开完整刷新没有完成，也没有发布 active generation。现有证据显示：

- `packages_grafana-data/tests_2` 组记录为 `partial`；日志中的异常文本为空，疑似裸
  `TimeoutError`，但尚未最终确认。
- 刷新没有在该 partial 后立即停止，而是继续执行。
- 日志最终停在启动 `RefreshModule_public_app (367 groups)` 之后；随后为避免在已无法发布的
  generation 上继续消耗数百次模型调用，我们人工中断了该次刷新。
- `.repobrain/current.json` 和最终 snapshot 均不存在，这是未发布的确定证据。
- 即使不中断，当前逻辑在最终状态为 partial 时也会拒绝 promote generation。

因此 RepoBrain 的 9 个 Grafana 回答槽位均按前置条件不可用记为 `unavailable`。

| 指标 | RepoBrain | CodeGraph + Trae |
|---|---:|---:|
| 盲评加权语义正确率 | 0.00% | **83.33%** |
| 成功查询运行数 | 0/9 | **8/9** |
| 正确 / 部分正确 / 错误 | 0 / 0 / 9 | **7 / 1 / 1** |
| 查询 Token | unavailable | 24,067,713 |
| 查询墙钟时间 | unavailable | 3,717.17 秒 |
| 冷构建墙钟时间 | unavailable | 67.88 秒 |

压力榜由 CodeGraph 明确获胜。RepoBrain 的 0% 是端到端可用性惩罚，并不表示九份实际回答
全部含有错误；这些回答根本没有满足可查询前置条件。

## 最小计分口径

- 语义盲评先从干净锁定源码中提取 Ground Truth，再对匿名并打乱的答案评分。
- `correct / partially_correct / incorrect` 的权重为 `1 / 0.5 / 0`。
- 超时、崩溃、空输出、协议违规和 unavailable 均留在分母中并自动按 incorrect 计分。
- CodeGraph 运行至少必须实际调用一次 CodeGraph CLI；否则属于协议违规。
- 证据提及召回率只检查预期完整路径和符号是否被正确提及，不等同于语义正确率。

## 必要限制

- 货币成本不可用，因为 Trae JSONL 没有输出价格。
- 产品查询 Token 不含语义评审 Token，也不含 RepoBrain 未暴露的完整刷新 Token。
- 耗时使用每个槽位的最终计分尝试；早期失败尝试和调试重试未计入计分总量。
- 本次完成了每题三轮回答，但没有完成三次冷构建、十次确定性延迟重复或配对 bootstrap
  置信区间，因此仍不是可发表级 benchmark。
