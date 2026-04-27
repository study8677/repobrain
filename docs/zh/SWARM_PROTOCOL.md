# 🔥 多 Agent Swarm 协议

## 🪐 架构：Router-Worker 模式

Swarm 把复杂任务拆分给专家 Agent 协同完成：Router 分析并分发任务，Coder/Reviewer/Researcher 执行并回传，Router 汇总结果。

## 🧠 专家角色

- 🧭 **Router**：任务分析、拆解、分配、结果合成。  
- 💻 **Coder**：实现与测试，遵循干净代码与文档规范。  
- 🔍 **Reviewer**：正确性/安全/性能审查与改进建议。  
- 📚 **Researcher**：调研信息、补充上下文与洞察。  

## 🚀 如何使用

### 交互式演示
```bash
python -m antigravity_engine.swarm_demo
```
输入任务即可观察协作过程。

### 代码调用
```python
from antigravity_engine.swarm import SwarmOrchestrator

swarm = SwarmOrchestrator()
result = swarm.execute("构建带错误处理的文件压缩工具")
print(result)  # 返回最终合成后的字符串结果
```

## 🔧 配置

- 当前实现使用 `antigravity_engine/swarm.py` 内置的 worker 映射，尚未实现 `.antigravity/swarm_config.json` 配置加载。  
- 自定义 Agent：继承 `BaseAgent`（参考 `antigravity_engine/agents`），在 `swarm.py` 注册即可。  

## 📊 日志与产物

- 执行日志默认输出到终端（`execute(..., verbose=True)`）。  
- 可通过 `swarm.get_message_log()` 读取内存中的消息总线记录。  
- 当前实现不会自动把 swarm 日志/产物写入磁盘。  

## ⚡ 性能提示

- 任务描述要清晰；预加载上下文；将子任务写具体以提高 Router 分派稳定性。  
- 禁用不需要的 Agent，定期清理旧 artifacts，必要时做结果缓存。  

## 🐛 故障排查

- Agent 未初始化：先在 Python 中实例化 `SwarmOrchestrator` 查看初始化输出。  
- 执行卡住：先用 `verbose=False` 运行，再用 `get_message_log()` 检查路由与执行链路。  
- 结果质量低：提供更多上下文，描述更具体，确保 Reviewer 启用。  

## 📚 示例

```python
# 示例：Web 爬虫
swarm.execute("""
构建新闻爬虫：
1) 抓取文章
2) 提取标题/作者/日期
3) 保存 JSON
4) 有错误处理
""")
```

```python
# 示例：Flask API + 测试 + 安全评审
swarm.execute("""
创建 REST API：
- GET/POST /users
- 请求校验
- 单元测试齐全
- 做安全检查
""")
```

---

**下一步：** [零配置特性](ZERO_CONFIG.md) | [文档索引](README.md)
