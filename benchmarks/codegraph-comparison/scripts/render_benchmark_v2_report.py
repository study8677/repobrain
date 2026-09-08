#!/usr/bin/env python3
"""Render a v2 multi-repository, repeated benchmark JSON as Markdown."""

from __future__ import annotations

import argparse
import json
import statistics
from collections import defaultdict
from pathlib import Path


def fmt_seconds(value: float | None) -> str:
    return "-" if value is None else f"{value:.2f} 秒"


def summarize(results: list[dict]) -> dict:
    present = [result for result in results if result]
    successful = [result for result in present if result.get("status") == "success"]
    seconds = [
        result["seconds"] for result in present
        if result.get("seconds") is not None
    ]
    usage = [
        result["usage"] for result in present
        if result.get("usage", {}).get("status") == "available"
    ]
    costs = [
        result["cost"] for result in present
        if result.get("cost", {}).get("status") == "available"
    ]
    return {
        "attempted": len(present),
        "success": len(successful),
        "found": sum(result.get("score", {}).get("found", 0) for result in present),
        "total": sum(result.get("score", {}).get("total", 0) for result in present),
        "total_seconds": sum(seconds),
        "mean": statistics.mean(seconds) if seconds else None,
        "median": statistics.median(seconds) if seconds else None,
        "usage_available": len(usage),
        "total_tokens": sum(item.get("total_tokens", 0) for item in usage),
        "input_tokens": sum(item.get("input_tokens", 0) for item in usage),
        "output_tokens": sum(item.get("output_tokens", 0) for item in usage),
        "cost_available": len(costs),
        "cost_usd": sum(item.get("amount", 0) for item in costs),
    }


def fmt_accuracy(found: int, total: int) -> str:
    if not total:
        return "-"
    return f"{found}/{total}（{found / total:.1%}）"


def fmt_usage(summary: dict) -> str:
    available = summary["usage_available"]
    attempted = summary["attempted"]
    if not available:
        return f"unavailable（0/{attempted}）"
    return f"{summary['total_tokens']:,}（{available}/{attempted} 可得）"


def fmt_cost(summary: dict) -> str:
    available = summary["cost_available"]
    attempted = summary["attempted"]
    if not available:
        return f"unavailable（0/{attempted}）"
    return f"${summary['cost_usd']:.6f}（{available}/{attempted} 可得）"


def result_cell(result: dict | None) -> str:
    if not result:
        return "未运行"
    score = result.get("score") or {}
    usage = result.get("usage") or {}
    cost = result.get("cost") or {}
    tokens = (
        f"{usage.get('total_tokens', 0):,} tokens"
        if usage.get("status") == "available"
        else "tokens unavailable"
    )
    cost_text = (
        f"${cost.get('amount', 0):.6f}"
        if cost.get("status") == "available"
        else "cost unavailable"
    )
    return (
        f"{score.get('found', 0)}/{score.get('total', 0)}，"
        f"{fmt_seconds(result.get('seconds'))}，{tokens}，{cost_text}，"
        f"{result.get('status', 'unknown')}"
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    payload = json.loads(args.input.read_text(encoding="utf-8"))
    if payload.get("schema_version") != 2:
        parser.error("input must be a schema_version 2 result")

    grouped: dict[tuple[str, int, str], dict[str, dict | None]] = defaultdict(dict)
    repository_results: dict[str, dict[str, list[dict]]] = defaultdict(
        lambda: defaultdict(list)
    )
    all_results: dict[str, list[dict]] = defaultdict(list)
    for record in payload.get("records") or []:
        result = record.get("result")
        key = (record["repository"], record["repeat"], record["question_id"])
        grouped[key][record["product"]] = result
        if result:
            repository_results[record["repository"]][record["product"]].append(result)
            all_results[record["product"]].append(result)
    codegraph_commands = sum(
        result.get("audit", {}).get("commands", 0)
        for result in all_results["codegraph"]
    )
    native_codegraph_commands = sum(
        result.get("audit", {}).get("codegraph_commands", 0)
        for result in all_results["codegraph"]
    )
    non_codegraph_commands = sum(
        result.get("audit", {}).get("non_codegraph_commands", 0)
        for result in all_results["codegraph"]
    )
    direct_source_reads = sum(
        result.get("audit", {}).get("direct_source_read_commands", 0)
        for result in all_results["codegraph"]
    )
    reroutes = sorted({
        reroute
        for product_results in all_results.values()
        for result in product_results
        for reroute in result.get("model", {}).get("routes", [])
    })

    lines = [
        f"# RepoBrain 与 CodeGraph 对比：{payload['run_id']}",
        "",
        "## 评测口径",
        "",
        f"- Manifest：`{payload.get('manifest', '-')}`",
        f"- 请求模型：`{payload.get('model', '-')}`",
        f"- 赛道：`{payload.get('track', 'unknown')}`",
        f"- 源码访问：`{payload.get('source_access', 'unknown')}`",
        f"- 重复次数：`{payload.get('repeat_count', 1)}`",
        f"- 并发数：`{payload.get('concurrency', 1)}`",
        "- 每个 repository、repeat、product 的原始结果和日志独立保存。",
        "",
    ]
    tools = payload.get("tools") or {}
    if tools:
        repo_tool = tools.get("repobrain") or {}
        graph_tool = tools.get("codegraph") or {}
        lines.extend([
            f"- RepoBrain：`{repo_tool.get('version', '-')}` / `{repo_tool.get('revision', '-')}`",
            f"- CodeGraph：`{graph_tool.get('release', '-')}`",
            "",
        ])
    lines.extend([
        "## 总体结果",
        "",
        "| 产品 | 成功/已运行 | 最终正确率（证据原子） | 总耗时 | 总 tokens | 总成本 |",
        "|---|---:|---:|---:|---:|---:|",
    ])
    for product in ("repobrain", "codegraph"):
        summary = summarize(all_results[product])
        lines.append(
            f"| {product} | {summary['success']}/{summary['attempted']} | "
            f"{fmt_accuracy(summary['found'], summary['total'])} | "
            f"{fmt_seconds(summary['total_seconds'])} | {fmt_usage(summary)} | "
            f"{fmt_cost(summary)} |"
        )
    lines.extend([
        "", "## Agent 行为审计", "",
        f"- CodeGraph Agent 命令总数：`{codegraph_commands}`",
        f"- 其中 CodeGraph CLI 调用：`{native_codegraph_commands}`",
        f"- 其中非 CodeGraph shell 命令：`{non_codegraph_commands}`（无限制赛道允许）",
        f"- 检出的直接源码读取命令：`{direct_source_reads}`（"
        + ("无限制赛道允许）" if payload.get("source_access") else "source-free 赛道不允许）"),
    ])
    if reroutes:
        lines.extend([
            "", "Trae 事件中记录到的模型路由：", "",
            *[f"- `{reroute}`" for reroute in reroutes],
        ])

    lines.extend([
        "", "## 分项目结果", "",
        "| 项目 | 产品 | 成功/已运行 | 最终正确率（证据原子） | 总耗时 | 总 tokens | 总成本 |",
        "|---|---|---:|---:|---:|---:|---:|",
    ])
    for repository in sorted(repository_results):
        for product in ("repobrain", "codegraph"):
            summary = summarize(repository_results[repository][product])
            lines.append(
                f"| {repository} | {product} | {summary['success']}/{summary['attempted']} | "
                f"{fmt_accuracy(summary['found'], summary['total'])} | "
                f"{fmt_seconds(summary['total_seconds'])} | "
                f"{fmt_usage(summary)} | {fmt_cost(summary)} |"
            )

    lines.extend([
        "", "## 逐次逐题结果", "",
        "| 项目 | 重复 | 问题 | RepoBrain | CodeGraph | CG 命令/非 CG/源码读取 |",
        "|---|---:|---|---:|---:|---:|",
    ])
    for (repository, repeat, question_id), products in sorted(grouped.items()):
        audit = (products.get("codegraph") or {}).get("audit", {})
        lines.append(
            f"| {repository} | {repeat} | `{question_id}` | "
            f"{result_cell(products.get('repobrain'))} | "
            f"{result_cell(products.get('codegraph'))} | "
            f"{audit.get('commands', 0)}/"
            f"{audit.get('non_codegraph_commands', 0)}/"
            f"{audit.get('direct_source_read_commands', 0)} |"
        )
    lines.extend([
        "", "## 准确率说明", "",
        "证据原子命中率只检查预先定义的文件和符号是否出现在答案或来源中。",
        "失败和未完成任务不会从已运行任务的分母中删除；完整答案、来源、",
        "限制与运行日志保存在对应 run-id 的分层目录中。",
        "",
    ])
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text("\n".join(lines), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
