# RepoBrain 与 CodeGraph 对比：完整上下文

本文档是本次对比的移交索引。最终数字、完整答案、原始模型事件、早期试验、
执行脚本和复现条件均可从文末文件清单定位。

## 1. 最终结论

最终采用 15 个 VERL 代码理解问题，对 RepoBrain 和
“CodeGraph CLI + Trae 外层 Agent”进行同问题、同请求模型、同端到端墙钟计时。

| 指标 | RepoBrain | CodeGraph + 外层 Agent |
|---|---:|---:|
| 成功任务 | 14/15 | 14/15 |
| 证据原子命中 | 74/80（92.5%） | 72/80（90.0%） |
| 成功任务平均耗时 | 120.28 秒 | 316.55 秒 |
| 成功任务中位耗时 | 120.03 秒 | 318.90 秒 |
| 最快成功任务 | 59.73 秒 | 145.28 秒 |
| 最慢成功任务 | 179.31 秒 | 538.47 秒 |
| 失败任务 | 1 | 1 |

按成功任务平均耗时计算，RepoBrain 在本轮约快 2.63 倍。这个结论只适用于
本文档描述的工作流、模型路由、问题集、索引和单次运行，不能外推为所有仓库和
所有问题上的产品结论。

## 2. 对比为什么重新设计

早期 15 题报告把 RepoBrain 的“检索 + 模型生成最终答案”耗时，与 CodeGraph
纯本地 CLI 查询耗时直接放在同一张表中：

- RepoBrain：平均 106.78 秒，包含模型生成。
- CodeGraph：平均 0.73 秒，只包含本地 CLI。

准确率都为 80/80，但速度口径不对等。用户指出该问题后，最终评测改成：

- RepoBrain 继续走真实 `rb-ask` 端到端流程。
- CodeGraph 外面增加同一个请求模型的 Trae Agent，由 Agent 自主调用
  CodeGraph CLI、阅读输出并生成结构化答案。
- 两边都从进程启动前开始计时，到最终答案进程结束后停止。

因此，`expanded-question-report.md` 是历史结果，不能用来比较两边最终答案的
端到端速度；应以 `fair-e2e-turbo-report.md` 为准。

## 3. 固定环境

### 机器

- 日期：2026-08-26 至 2026-08-27
- OS：macOS 26.5.1（25F80）
- 架构：arm64
- CPU：Apple M5，10 个逻辑 CPU
- 内存：16 GiB

### 产品

- RepoBrain revision：
  `b0ebc36b611305dcbdda7343fc8e0136fa7f2686`
- RepoBrain 版本：engine 0.3.2 / CLI 2.0.2
- CodeGraph：1.5.0
- CodeGraph npm git head：
  `ea72e1b190921232aa7bd02e96bef5bbe4fe0ab6`

### 目标仓库

最终公平端到端评测只使用 VERL：

- 仓库：`https://github.com/verl-project/verl`
- revision：`8f8b122195ecf43475679fb6ee0204ee33f387c5`
- 主要语言：Python

早期索引试验还包括：

- Excalidraw revision：
  `4a6f4e7a32ce3d3360d4d209d14105acc144d8c7`
- OpenClaw revision：
  `1e6844b71aa2299c082d23cf66dce38ff00b2211`

OpenClaw 的 CodeGraph 进程被企业端点策略终止，因此没有纳入配对结论。

## 4. 模型上下文

- 请求模型名称：`Seed-2.1-Turbo`
- 两边实际调用命令都显式带 `-m Seed-2.1-Turbo`。
- CodeGraph 的 Trae JSON 事件明确记录服务端路由：
  `Seed-2.1-Turbo -> seed-code-pro-0608-v1`。
- RepoBrain 的 host runner 未开启 Trae JSON 事件输出，因此其服务端实际路由
  没有独立事件证据。它使用相同模型参数，但不能仅凭 CodeGraph 日志断言两边
  最终都落到同一个后端模型。

这意味着报告中的“同模型”严格指同一个客户端请求模型参数。服务端发生了至少
一次可观测的模型重路由。

## 5. 公平端到端执行方式

### RepoBrain

查询工作区：

`benchmarks/codegraph-comparison/.work/corpora/verl-query-repobrain-knowledge-only`

该目录只保留 RepoBrain 知识层，不提供 VERL 源码。执行入口：

```bash
rb-ask --json \
  --workspace benchmarks/codegraph-comparison/.work/corpora/verl-query-repobrain-knowledge-only \
  "<question>"
```

每题通过以下环境变量固定 host runner：

```bash
RB_HOST_RUNNER=generic
RB_HOST_COMMAND="trae-cli exec -m Seed-2.1-Turbo --cd {workspace} \
  --sandbox read-only --skip-git-repo-check --ephemeral -o {output_file}"
RB_HOST_OUTPUT_MODE=file
RB_HOST_TIMEOUT_SECONDS=600
```

计时包含 `rb-ask` 的知识路由、内部模型调用和最终 JSON 答案生成，不包含预先
构建 RepoBrain 知识层的时间。

### CodeGraph

每题从既有 `.codegraph` 索引复制一个独立、可写、无源码控制工作区：

`benchmarks/codegraph-comparison/.work/fair-e2e-codegraph-control/<question-id>`

Trae Agent 调用形式：

```bash
trae-cli exec \
  -m Seed-2.1-Turbo \
  --cd "<source-free-control-workspace>" \
  --sandbox workspace-write \
  --skip-git-repo-check \
  --ephemeral \
  --json \
  --shell-tool-timeout 120s \
  --output-schema "<temporary-answer-schema.json>" \
  -o "<answer.json>" \
  "<controlled CodeGraph-only prompt>"
```

Prompt 要求：

- 所有仓库证据只能通过固定 CodeGraph CLI 获取。
- 每个命令关闭 telemetry、update check、daemon 和颜色。
- 禁止 `cat`、`rg`、`grep`、`sed`、`awk`、Python 文件读取和直接源码读取。
- 要求最多 8 条 CodeGraph 命令。
- 最终输出 `answer`、`sources`、`limitations` 三字段 JSON。

计时包含 Trae Agent 启动、多轮 CodeGraph CLI 检索、模型阅读检索结果及最终
结构化答案生成，不包含预先构建 CodeGraph 索引的时间。

### 调度

- 并发数：4。
- 总任务：15 题 x 2 产品 = 30。
- RepoBrain 和 CodeGraph 任务按问题交替提交到同一线程池。
- 单任务总超时：600 秒。
- CodeGraph 单次 shell tool 超时：120 秒。
- 结果按任务完成顺序增量写盘。
- 失败不会从准确率分母删除。

并发能缩短整批运行时间，但意味着延迟是在共享机器和共享模型服务负载下测得，
不是严格隔离的单任务延迟。

## 6. 问题集与答案标准

问题集由以下两部分拼接：

- `config/questions.json` 中 ID 以 `verl-` 开头的 3 题。
- `config/questions-expanded.json` 中的 12 题。

总计 15 题、23 个预期文件原子、57 个预期符号原子，共 80 个证据原子。问题
覆盖：

1. PPO 主入口和 legacy Trainer 调用链
2. GAE/GRPO advantage 分派
3. Legacy worker 与资源池映射
4. Ray 配置与 V1/legacy runner 选择
5. V1 与 legacy runner 生命周期
6. Response mask 与 advantage 计算
7. KL penalty 计算与反馈
8. Validation 生成、评分与合并
9. Checkpoint 加载、保存与触发
10. Colocated worker group 初始化
11. Old/ref log-prob 与 critic value
12. Actor/critic 更新顺序
13. Advantage estimator 注册表
14. Policy loss 注册表
15. Adaptive/fixed KL controller

完整英文问题、预期文件和预期符号直接保存在
`fair-e2e-turbo.json` 每个 record 中。

## 7. 评分与统计

评分输入是每题的 `answer` 与 `sources` 拼接文本。

- 文件命中：答案包含完整预期路径或该路径的 basename。
- 符号命中：答案包含预期符号的精确字符串。
- 证据原子召回率：命中原子数 / 预期原子数。
- 失败任务的全部原子按未命中计，不移出分母。
- 平均、中位、最快、最慢耗时只统计 `status=success` 的任务。

该自动指标测量“预期证据是否出现在最终回答中”，不是完整语义正确率。它没有
自动判断：

- 每个因果描述是否正确。
- 引用行号是否存在。
- 同名符号是否指向正确作用域。
- 回答是否包含未被证据支持的额外断言。

早期 `expanded-question-report.md` 有人工源码核验摘要；最终公平运行的 30 个
答案尚未逐句进行独立人工语义复核。

## 8. 最终逐题异常

只有三题不是双方同时满分：

- `verl-ppo-entry`
  - RepoBrain：7/7，81.05 秒。
  - CodeGraph：6/7，145.28 秒。
  - CodeGraph 最终答案遗漏 `TaskRunner` 字符串。
- `verl-worker-resources`
  - RepoBrain：7/7，132.15 秒。
  - CodeGraph：600.04 秒超时，return code 124，0/7。
- `verl-kl-penalty-flow`
  - RepoBrain：40.38 秒失败，return code 1，0/6。
  - CodeGraph：6/6，307.44 秒。

其他 12 题双方均命中全部预期证据原子。

## 9. CodeGraph Agent 行为审计

原始 Trae JSONL 记录到：

- 完成的 shell command：625 条。
- 不含 `codegraph` 字符串的 command：1 条。
- 唯一非 CodeGraph 命令是读取 `/tmp/explore_save.txt`，不是读取目标仓库源码。

最重要的偏差是：Prompt 要求每题最多 8 条 CodeGraph 命令，但这个限制没有
程序化执行。实际单题命令数为 13 至 73 条，总计 625 条。因此：

- 两边满足同问题、同请求模型和同端到端计时口径。
- CodeGraph 基本遵守“只通过 CodeGraph 获取仓库证据”。
- 但本轮不满足严格的等检索命令预算。
- 大量命令提高了 CodeGraph 的耗时，也可能提高其证据覆盖。

事件中还能看到 Agent 尝试了当前 CLI 不支持的 `context` 和 `path` 子命令，
这些失败尝试也计入端到端时间。若需要更严格实验，应由 runner 在第 8 条命令
后强制终止，而不是只在 prompt 中要求。

## 10. 其他限制

- 每题每产品只有一次运行，没有方差、置信区间或重试分布。
- 只有一个最终公平评测仓库：VERL。
- 请求模型发生服务端重路由，未来重跑可能路由到不同模型。
- RepoBrain 和 CodeGraph 的产品边界不同：RepoBrain 原生输出答案，CodeGraph
  原生输出图查询结果，因此 CodeGraph 需要额外 Agent。
- 两边上下文预算没有硬性统一。
- 两边内部模型调用次数没有统一。
- 索引构建时间不包含在问答延迟中；索引性能见早期 `REPORT.md`。
- 所有 benchmark 文件当前在 Git 中显示为未跟踪目录，尚未提交。

## 11. 早期试验上下文

### 冷索引

| 仓库 | 工具 | Wall time | Peak RSS | Index size |
|---|---|---:|---:|---:|
| VERL | RepoBrain scan-only | 9.24 秒 | 82.95 MiB | 7.36 MiB |
| VERL | CodeGraph | 5.40 秒 | 619.63 MiB | 41.21 MiB |
| Excalidraw | RepoBrain scan-only | 14.44 秒 | 139.70 MiB | 5.26 MiB |
| Excalidraw | CodeGraph | 3.02 秒 | 1079.61 MiB | 47.78 MiB |

索引节点和边的语义单位不同，不能直接比较节点数或边数。

### 早期检索

- CodeGraph-only Agent pilot：VERL 3 题 19/19，Excalidraw 3 题 14/14。
- Focused ceiling pilot：VERL 3 题双方均 19/19。
- Expanded 15-question：双方 80/80，但速度口径不公平。
- 最终 fair E2E：RepoBrain 74/80，CodeGraph 72/80。

早期结果仍有助于理解产品的索引体积、资源消耗和纯 CLI 性能，但不能替代最终
端到端答案对比。

## 12. 复现命令

从仓库根目录执行：

```bash
bash benchmarks/codegraph-comparison/scripts/bootstrap.sh
bash benchmarks/codegraph-comparison/scripts/run_index_benchmark.sh
```

公平端到端评测：

```bash
benchmarks/codegraph-comparison/.work/repobrain-venv/bin/python \
  benchmarks/codegraph-comparison/scripts/run_fair_e2e_benchmark.py \
  --workers 4 \
  --timeout 600 \
  --restart \
  --output benchmarks/codegraph-comparison/results/fair-e2e-turbo.json
```

生成中文报告：

```bash
benchmarks/codegraph-comparison/.work/repobrain-venv/bin/python \
  benchmarks/codegraph-comparison/scripts/render_fair_e2e_report.py \
  benchmarks/codegraph-comparison/results/fair-e2e-turbo.json \
  benchmarks/codegraph-comparison/results/fair-e2e-turbo-report.md \
  --raw-dir benchmarks/codegraph-comparison/results/raw/fair-e2e-turbo
```

不加 `--restart` 会保留成功结果，只补跑缺失或失败的产品任务。

## 13. 文件索引

### 核心输入

- `config/manifest.json`：机器、产品和仓库版本。
- `config/questions.json`：初始问题与答案原子。
- `config/questions-expanded.json`：扩展问题与答案原子。
- `PROTOCOL.md`：原始评测协议和失败政策。

### 最终公平评测

- `scripts/run_fair_e2e_benchmark.py`：公平端到端 runner。
- `scripts/render_fair_e2e_report.py`：中文报告及事件审计生成器。
- `results/fair-e2e-turbo.json`：15 题双方完整答案、来源、限制、耗时和逐原子评分。
- `results/fair-e2e-turbo-report.md`：最终中文汇总与逐题表。
- `results/raw/fair-e2e-turbo/*.repobrain.log`：RepoBrain 原始 stdout/stderr。
- `results/raw/fair-e2e-turbo/*.codegraph-answer.json`：CodeGraph Agent 最终答案。
- `results/raw/fair-e2e-turbo/*.codegraph-events.jsonl`：CodeGraph Agent 完整事件、
  命令和命令输出。

### 早期结果

- `results/REPORT.md`：索引、native retrieval 和 ceiling 总报告。
- `results/codegraph-agent-pilot.md`：CodeGraph-only Agent pilot。
- `results/focused-query-pilot.md`：VERL 三题聚焦试验。
- `results/expanded-question-report.md`：旧 15 题报告及人工答案摘要。
- `results/*.json`：早期结构化原始结果。

### 可再生运行时目录

`.work` 当前约 3.2 GB，包含：

- CodeGraph npm runtime。
- RepoBrain Python venv。
- 第三方仓库 clone 和独立 worktree。
- RepoBrain/CodeGraph 查询 corpus。
- 每题 CodeGraph 无源码索引副本。
- smoke/debug 临时结果。

该目录不应作为长期报告附件，其中可能包含机器相关绝对路径。它可以通过
bootstrap 和 runner 重新生成。

## 14. 核心文件 SHA-256

```text
96900030ce2cf929ce5ad70e53eb966b80ad582aae2415cf8a0d329b6bb8c21b  config/manifest.json
d239f31b9c32b8cfbadc25aca0d94d7481e4aa47038c1049ddc54ca76ca48d06  config/questions.json
34503ed63b3ee151473222eb1bffd34964593c9e2f3909802242dca2e3b12d02  config/questions-expanded.json
acd95cd565a5ed33be52bce63eeb363b8b9bfe2d513e53b32ad9045184d41bc6  scripts/run_fair_e2e_benchmark.py
2cd886e3c97646ffc8b42ecc07bde7d621fcc471327594f6f60fefd6d3395bf3  results/fair-e2e-turbo.json
c463bcf384e77781d183c7cfedb31ca3d290cfd9e444cb03b594eae3fa74d9d2  results/fair-e2e-turbo-report.md
```

这些哈希对应生成本文档前的最终评测产物。若重新运行或重新生成报告，哈希会变化。
