#!/usr/bin/env python3
"""Render the matched end-to-end benchmark as a Chinese Markdown report."""

from __future__ import annotations

import argparse
import json
import re
import statistics
from pathlib import Path


QUESTION_ZH = {
    "verl-ppo-entry": "PPO 主入口与 legacy Trainer 调用链",
    "verl-advantage-dispatch": "GAE/GRPO advantage 分派",
    "verl-worker-resources": "Legacy worker 与资源池映射",
    "verl-runtime-runner-selection": "Ray 配置与 V1/legacy runner 选择",
    "verl-v1-runner-lifecycle": "V1 与 legacy runner 生命周期",
    "verl-response-mask-advantage": "Response mask 与 advantage 计算",
    "verl-kl-penalty-flow": "KL penalty 计算与反馈",
    "verl-validation-pipeline": "Validation 生成、评分与合并",
    "verl-checkpoint-lifecycle": "Checkpoint 加载、保存与触发",
    "verl-worker-initialization": "Colocated worker group 初始化",
    "verl-logprob-value-flow": "Old/ref log-prob 与 critic value",
    "verl-actor-critic-update-order": "Actor/critic 更新顺序",
    "verl-advantage-registry": "Advantage estimator 注册表",
    "verl-policy-loss-registry": "Policy loss 注册表",
    "verl-kl-controller-selection": "Adaptive/fixed KL controller",
}


def product_summary(records: list[dict], product: str) -> dict:
    results = [record.get(product) for record in records]
    present = [result for result in results if result]
    successful = [result for result in present if result["status"] == "success"]
    seconds = [result["seconds"] for result in successful if result["seconds"] is not None]
    return {
        "completed": len(successful),
        "attempted": len(present),
        "found": sum(result["score"]["found"] for result in present),
        "total": sum(result["score"]["total"] for result in present),
        "mean": statistics.mean(seconds) if seconds else None,
        "median": statistics.median(seconds) if seconds else None,
        "minimum": min(seconds) if seconds else None,
        "maximum": max(seconds) if seconds else None,
        "failures": len(present) - len(successful),
    }


def fmt_seconds(value: float | None) -> str:
    return "-" if value is None else f"{value:.2f} 秒"


def fmt_result(result: dict | None) -> str:
    if not result:
        return "未运行"
    score = result["score"]
    return (
        f"{score['found']}/{score['total']}，"
        f"{fmt_seconds(result['seconds'])}，{result['status']}"
    )


def audit_events(raw_dir: Path) -> tuple[list[str], dict[str, dict]]:
    reroutes = set()
    audits = {}
    for path in raw_dir.glob("*.codegraph-events.jsonl"):
        question_id = path.name.removesuffix(".codegraph-events.jsonl")
        commands = []
        with path.open(encoding="utf-8", errors="replace") as stream:
            for line in stream:
                if '"type":"model_reroute"' in line:
                    source = re.search(r'"from_model":"([^"]+)"', line)
                    target = re.search(r'"to_model":"([^"]+)"', line)
                    if source and target:
                        reroutes.add(f"{source.group(1)} -> {target.group(1)}")
                if (
                    '"type":"item.completed"' in line
                    and '"type":"command_execution"' in line
                ):
                    commands.append(line.split('"aggregated_output"', 1)[0])
        audits[question_id] = {
            "commands": len(commands),
            "non_codegraph_commands": [
                command for command in commands if "codegraph" not in command
            ],
        }
    return sorted(reroutes), audits


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--raw-dir", type=Path)
    args = parser.parse_args()

    payload = json.loads(args.input.read_text(encoding="utf-8"))
    records = payload["records"]
    repo = product_summary(records, "repobrain")
    graph = product_summary(records, "codegraph")
    reroutes, audits = audit_events(args.raw_dir) if args.raw_dir else ([], {})
    total_graph_commands = sum(item["commands"] for item in audits.values())
    total_non_graph_commands = sum(
        len(item["non_codegraph_commands"]) for item in audits.values()
    )

    lines = [
        "# RepoBrain 与 CodeGraph 公平端到端对比",
        "",
        "## 评测口径",
        "",
        f"- 请求模型：`{payload['model']}`",
        f"- 并发数：`{payload.get('concurrency', 1)}`",
        "- RepoBrain：计时覆盖知识检索、Trae Agent 推理和结构化答案生成。",
        "- CodeGraph：计时覆盖 Trae Agent 启动、CodeGraph CLI 检索、证据阅读和答案生成。",
        "- 两边使用相同问题、相同请求模型，并采用端到端墙钟时间。",
        "- RepoBrain 查询目录不含源码；CodeGraph Agent 使用不含源码的可写索引副本。",
        "",
    ]
    if reroutes:
        lines.extend(
            [
                "Trae 事件日志记录到以下服务端模型路由：",
                "",
                *[f"- `{item}`" for item in reroutes],
                "",
            ]
        )
    lines.extend(
        [
            "## 总体结果",
            "",
            "| 指标 | RepoBrain | CodeGraph + 外层模型 |",
            "|---|---:|---:|",
            f"| 成功完成 | {repo['completed']}/{repo['attempted']} | {graph['completed']}/{graph['attempted']} |",
            f"| 证据原子命中 | {repo['found']}/{repo['total']} | {graph['found']}/{graph['total']} |",
            f"| 平均端到端耗时 | {fmt_seconds(repo['mean'])} | {fmt_seconds(graph['mean'])} |",
            f"| 中位端到端耗时 | {fmt_seconds(repo['median'])} | {fmt_seconds(graph['median'])} |",
            f"| 最快 | {fmt_seconds(repo['minimum'])} | {fmt_seconds(graph['minimum'])} |",
            f"| 最慢 | {fmt_seconds(repo['maximum'])} | {fmt_seconds(graph['maximum'])} |",
            f"| 失败 | {repo['failures']} | {graph['failures']} |",
            f"| CodeGraph Agent shell 命令 | - | {total_graph_commands} |",
            f"| 非 CodeGraph shell 命令 | - | {total_non_graph_commands} |",
            "",
            "## 逐题结果",
            "",
            "| 问题 | RepoBrain：命中、耗时、状态 | CodeGraph：命中、耗时、状态 | CG 命令/非 CG 命令 |",
            "|---|---:|---:|---:|",
        ]
    )
    for record in records:
        title = QUESTION_ZH.get(record["id"], record["id"])
        audit = audits.get(record["id"], {"commands": 0, "non_codegraph_commands": []})
        lines.append(
            f"| `{record['id']}` {title} | "
            f"{fmt_result(record.get('repobrain'))} | "
            f"{fmt_result(record.get('codegraph'))} | "
            f"{audit['commands']}/{len(audit['non_codegraph_commands'])} |"
        )
    lines.extend(
        [
            "",
            "## 准确率说明",
            "",
            "这里的准确率是预先定义的文件与符号证据原子召回率。完整答案、来源和限制",
            "保存在配套 JSON 中，可继续进行人工语义核验。失败任务按未命中计，不从",
            "分母中删除。",
            "",
        ]
    )
    args.output.write_text("\n".join(lines), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
