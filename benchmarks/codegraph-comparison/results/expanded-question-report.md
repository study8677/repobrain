# VERL 扩展问题评测报告

## 评测范围

本次 ceiling 对比使用相同的 VERL 四文件语料和 15 个问题。
RepoBrain 在查询时只能访问不包含源码的知识库副本；CodeGraph Agent
只能使用 CodeGraph CLI 返回的图数据和源码片段。

准确率由两部分组成：

- **证据原子召回率**：回答是否包含预期文件名和符号名。
- **答案正确性**：回答中的解释是否与索引源码证据一致。

## 总体结果

| 指标 | RepoBrain ceiling | CodeGraph |
|---|---:|---:|
| 完成问题数 | 15/15 | 15/15 |
| 预期文件命中 | 23/23 | 23/23 |
| 预期符号命中 | 57/57 | 57/57 |
| 总证据原子召回率 | 80/80（100%） | 80/80（100%） |
| 正确答案数 | 15 | 15 |
| 计时口径 | 检索及模型生成的端到端时间 | 仅本地 CLI 检索时间 |
| 计时总耗时 | 1,601.65 秒 | 12 个计时问题共 8.73 秒 |
| 平均计时耗时 | 106.78 秒 | 0.73 秒 |
| 计时耗时中位数 | 99.10 秒 | 0.53 秒 |
| 检索命令数 | 15 个成功答案 | 51 条 CLI 命令 |
| 临时失败 | 2 次 host JSON 解析失败 | 0 |

最初三个 CodeGraph ceiling 问题没有记录命令耗时。其 9 条命令计入命令总数，
但不参与耗时统计。

两边的耗时口径并不相同。RepoBrain 时间包含 Trae Agent 模型阅读知识上下文、
推理并生成结构化答案的完整过程；CodeGraph 时间只包含本地 CLI 命令执行，
不包含外层 Agent 阅读检索结果和编写最终答案的模型耗时。因此这些数字用于说明
各自检索架构的成本构成，不能直接解释为端到端回答速度相差相同比例。

## 逐题结果

表中的 `F` 表示预期文件命中数，`S` 表示预期符号命中数。

| ID | 完整问题 | 预期证据 | RepoBrain | CodeGraph | 判定 |
|---|---|---:|---:|---:|---|
| `ppo-entry` | PPO 主入口在哪里，legacy 路径如何到达 Trainer？ | F 3，S 4 | 7/7，73.49 秒 | 7/7，3 条命令 | 双方正确 |
| `advantage-dispatch` | Advantage 计算如何在 GAE 和 GRPO 间分派？ | F 2，S 3 | 5/5，161.73 秒 | 5/5，2 条命令 | 双方正确 |
| `worker-resources` | Legacy 角色如何映射到 worker 和资源池？ | F 2，S 5 | 7/7，78.13 秒 | 7/7，4 条命令 | 双方正确 |
| `runtime-runner-selection` | PPO 入口如何配置 Ray 并选择 V1 或 legacy runner？ | F 2，S 4 | 6/6，114.94 秒 | 6/6，3 条命令，0.52 秒 | 双方正确 |
| `v1-runner-lifecycle` | V1 runner 初始化什么，它与 legacy 生命周期有何不同？ | F 2，S 4 | 6/6，114.56 秒 | 6/6，1 条命令，0.50 秒 | 双方正确 |
| `response-mask-advantage` | Response mask 如何生成并用于 advantage 计算？ | F 1，S 3 | 4/4，120.17 秒 | 4/4，5 条命令，1.07 秒 | 双方正确 |
| `kl-penalty-flow` | KL penalty 如何计算、应用并反馈给控制器？ | F 2，S 4 | 6/6，99.10 秒 | 6/6，4 条命令，0.54 秒 | 双方正确 |
| `validation-pipeline` | Validation 如何生成、评分并合并结果？ | F 1，S 4 | 5/5，100.70 秒 | 5/5，7 条命令，1.34 秒 | 双方正确 |
| `checkpoint-lifecycle` | Checkpoint 如何加载、保存和触发？ | F 1，S 3 | 4/4，83.42 秒 | 4/4，3 条命令，0.62 秒 | 双方正确 |
| `worker-initialization` | 各角色的 colocated worker group 如何初始化？ | F 2，S 4 | 6/6，76.50 秒 | 6/6，6 条命令，1.51 秒 | 双方正确 |
| `logprob-value-flow` | 何时以及为何计算 old/ref log-prob 和 critic value？ | F 1，S 4 | 5/5，91.92 秒 | 5/5，5 条命令，1.39 秒 | 双方正确 |
| `actor-critic-update-order` | Critic 和 actor 的更新顺序由什么控制？ | F 1，S 3 | 4/4，86.72 秒 | 4/4，3 条命令，0.38 秒 | 双方正确 |
| `advantage-registry` | Advantage estimator 如何注册和查询？ | F 1，S 4 | 5/5，172.58 秒 | 5/5，2 条命令，0.33 秒 | 双方正确 |
| `policy-loss-registry` | Policy loss 如何选择，vanilla 实现在哪里？ | F 1，S 4 | 5/5，71.30 秒 | 5/5，2 条命令，0.37 秒 | 双方正确 |
| `kl-controller-selection` | Adaptive 和 fixed KL controller 如何选择？ | F 1，S 4 | 5/5，156.38 秒 | 5/5，1 条命令，0.17 秒 | 双方正确 |

## 答案内容核验

| ID | 经源码证据验证的答案内容 |
|---|---|
| `ppo-entry` | `main` 选择 runner，`run_ppo` 远程启动 runner；legacy 的 `TaskRunner.run` 创建 `RayPPOTrainer`，然后调用 `init_workers` 和 `fit`。 |
| `advantage-dispatch` | `compute_advantage` 显式选择 GAE 或 GRPO，并调用 `core_algos.py` 中的实现；其他 estimator 通过注册表查找。 |
| `worker-resources` | Legacy 初始化把 actor、critic 等角色映射到 worker class 和全局或独立资源池，然后创建 Trainer。 |
| `runtime-runner-selection` | `main` 根据 `trainer.use_v1` 选择 V1；`run_ppo` 合并 Ray runtime 配置、初始化 Ray，并运行选中的远程 runner。 |
| `v1-runner-lifecycle` | V1 初始化 transfer queue、V1 trainer 和 agent-loop manager；legacy 手工组装 worker、数据集、资源池和 `RayPPOTrainer`。 |
| `response-mask-advantage` | Mask 是 `attention_mask` 末尾 response 长度对应的切片；`fit` 创建该 mask，estimator 用它排除 padding token。 |
| `kl-penalty-flow` | `kl_penalty` 计算 token 级散度；`apply_kl_penalty` 从 reward 中减去系数乘 KL，并根据实际 KL 更新 adaptive controller。 |
| `validation-pipeline` | `_validate` 生成 response、计算 reward 并累计样本数据；结果经合并后由 `_val_metrics_update` 汇总为指标。 |
| `checkpoint-lifecycle` | 训练恢复 actor、可选 critic、global step 和 dataloader 状态；按周期、训练结束或接近中断时保存。 |
| `worker-initialization` | `init_workers` 按资源池组织角色 class 并创建 colocated worker group；reward 和 teacher 使用各自的 manager。 |
| `logprob-value-flow` | Old log-prob 提供 PPO behavior policy 基线，reference log-prob 用于 KL 正则，critic value 用于 GAE 和 return。 |
| `actor-critic-update-order` | 启用 critic 时先更新 critic；critic warmup 结束后才更新 actor，随后把新权重同步给 rollout replica。 |
| `advantage-registry` | Estimator decorator 统一处理 enum/string 名称，拒绝冲突的重复注册，并在查询未知名称时报错。 |
| `policy-loss-registry` | Policy-loss decorator 注册模式，查询函数拒绝未知名称，`compute_policy_loss_vanilla` 注册为 `vanilla`。 |
| `kl-controller-selection` | Fixed controller 保持常量系数；adaptive controller 根据裁剪后的目标 KL 比例误差和 horizon 更新系数。 |

## 结论

1. 在该 focused 语料中，双方准确率持平：所有预期证据均被命中，解释也与源码一致。
2. CodeGraph 的本地 CLI 检索比 RepoBrain 的端到端模型问答快约两个数量级，
   但这是不同计时口径；每题需要 1 至 7 条命令，最终答案由未计时的外层
   Agent 综合生成。
3. RepoBrain 每题只需一条知识库问答命令，而且查询环境中没有源码；
   但模型推理主导了耗时，每个成功答案需要 71 至 173 秒。
4. RepoBrain 在 `worker-initialization` 上出现两次临时 host JSON 解析失败，
   重试后完成；CodeGraph 扩展测试没有命令失败。
5. 这是针对四个 PPO 核心文件的深度测试，不代表整个 VERL 仓库的覆盖率。
   全仓索引结果仍单独记录在 `REPORT.md`。
