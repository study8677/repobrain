---
description: Ask a question about the current project's codebase via the antigravity knowledge hub. / 通过 antigravity 知识库询问当前项目代码。
allowed-tools: ["mcp__plugin_antigravity_antigravity__ask_project"]
---

Use the `mcp__plugin_antigravity_antigravity__ask_project` MCP tool to answer:

使用 `mcp__plugin_antigravity_antigravity__ask_project` MCP 工具回答：

> $ARGUMENTS

If the MCP tool is not available or not connected, tell the user to restart Claude Code once so the Antigravity MCP server loads, then rerun the command. Do not diagnose missing MCP tools as an LLM key problem.

如果 MCP 工具不可用或未连接，请告诉用户完整重启 Claude Code 一次，让 Antigravity MCP server 加载完成，然后重新运行本命令。不要把缺失 MCP 工具判断为 LLM API key 问题。

Prefer this tool over manual file search. If the tool returns insufficient detail, follow up with targeted Read/Grep.

优先使用该工具，不要先手动搜索文件。如果工具返回的信息不够，再用有目标的 Read/Grep 补充。
