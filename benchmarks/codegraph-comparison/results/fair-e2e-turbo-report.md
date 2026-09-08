# RepoBrain 与 CodeGraph 公平端到端对比

## 评测口径

- 请求模型：`Seed-2.1-Turbo`
- 并发数：`4`
- RepoBrain：计时覆盖知识检索、Trae Agent 推理和结构化答案生成。
- CodeGraph：计时覆盖 Trae Agent 启动、CodeGraph CLI 检索、证据阅读和答案生成。
- 两边使用相同问题、相同请求模型，并采用端到端墙钟时间。
- RepoBrain 查询目录不含源码；CodeGraph Agent 使用不含源码的可写索引副本。

Trae 事件日志记录到以下服务端模型路由：

- `Seed-2.1-Turbo -> seed-code-pro-0608-v1`

## 总体结果

| 指标 | RepoBrain | CodeGraph + 外层模型 |
|---|---:|---:|
| 成功完成 | 14/15 | 14/15 |
| 证据原子命中 | 74/80 | 72/80 |
| 平均端到端耗时 | 120.28 秒 | 316.55 秒 |
| 中位端到端耗时 | 120.03 秒 | 318.90 秒 |
| 最快 | 59.73 秒 | 145.28 秒 |
| 最慢 | 179.31 秒 | 538.47 秒 |
| 失败 | 1 | 1 |
| CodeGraph Agent shell 命令 | - | 625 |
| 非 CodeGraph shell 命令 | - | 1 |

## 逐题结果

| 问题 | RepoBrain：命中、耗时、状态 | CodeGraph：命中、耗时、状态 | CG 命令/非 CG 命令 |
|---|---:|---:|---:|
| `verl-ppo-entry` PPO 主入口与 legacy Trainer 调用链 | 7/7，81.05 秒，success | 6/7，145.28 秒，success | 13/0 |
| `verl-advantage-dispatch` GAE/GRPO advantage 分派 | 5/5，74.79 秒，success | 5/5，152.87 秒，success | 18/0 |
| `verl-worker-resources` Legacy worker 与资源池映射 | 7/7，132.15 秒，success | 0/7，600.04 秒，failed | 73/0 |
| `verl-runtime-runner-selection` Ray 配置与 V1/legacy runner 选择 | 6/6，120.99 秒，success | 6/6，419.02 秒，success | 56/0 |
| `verl-v1-runner-lifecycle` V1 与 legacy runner 生命周期 | 6/6，101.08 秒，success | 6/6，291.17 秒，success | 53/0 |
| `verl-response-mask-advantage` Response mask 与 advantage 计算 | 4/4，168.34 秒，success | 4/4，345.70 秒，success | 43/0 |
| `verl-kl-penalty-flow` KL penalty 计算与反馈 | 0/6，40.38 秒，failed | 6/6，307.44 秒，success | 37/0 |
| `verl-validation-pipeline` Validation 生成、评分与合并 | 5/5，88.53 秒，success | 5/5，245.04 秒，success | 31/0 |
| `verl-checkpoint-lifecycle` Checkpoint 加载、保存与触发 | 4/4，179.31 秒，success | 4/4，421.92 秒，success | 38/1 |
| `verl-worker-initialization` Colocated worker group 初始化 | 6/6，113.74 秒，success | 6/6，538.47 秒，success | 71/0 |
| `verl-logprob-value-flow` Old/ref log-prob 与 critic value | 5/5，144.77 秒，success | 5/5，167.29 秒，success | 20/0 |
| `verl-actor-critic-update-order` Actor/critic 更新顺序 | 4/4，119.07 秒，success | 4/4，463.48 秒，success | 68/0 |
| `verl-advantage-registry` Advantage estimator 注册表 | 5/5，148.16 秒，success | 5/5，362.52 秒，success | 47/0 |
| `verl-policy-loss-registry` Policy loss 注册表 | 5/5，59.73 秒，success | 5/5，241.09 秒，success | 27/0 |
| `verl-kl-controller-selection` Adaptive/fixed KL controller | 5/5，152.22 秒，success | 5/5，330.36 秒，success | 30/0 |

## 准确率说明

这里的准确率是预先定义的文件与符号证据原子召回率。完整答案、来源和限制
保存在配套 JSON 中，可继续进行人工语义核验。失败任务按未命中计，不从
分母中删除。
