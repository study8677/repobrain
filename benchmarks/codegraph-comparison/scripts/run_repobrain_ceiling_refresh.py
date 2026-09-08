#!/usr/bin/env python3
"""Promote an otherwise successful host-runner refresh for ceiling tests."""

from __future__ import annotations

import argparse
import asyncio
import json
from pathlib import Path

from repobrain_engine.hub.incremental import (
    get_head_sha,
    initialize_full_generation_metadata,
)
from repobrain_engine.hub.refresh_pipeline import (
    _aggregate_states,
    _refresh_pipeline_into_generation,
    _write_refresh_status,
)
from repobrain_engine.hub.storage import (
    create_generation,
    new_generation_id,
    promote_generation,
    refresh_lock,
    use_knowledge_root,
)


def _degraded_entries(status) -> tuple[dict[str, str], dict[str, str]]:
    degraded = {"partial", "failed", "unresolved"}
    stages = {
        name: state
        for name, state in status.stages.items()
        if state in degraded
    }
    modules = {
        name: state
        for name, state in status.modules.items()
        if state in degraded
    }
    return stages, modules


async def _run(workspace: Path) -> dict[str, object]:
    workspace = workspace.expanduser().resolve()
    head_sha = get_head_sha(workspace)
    if not head_sha:
        raise RuntimeError("Ceiling refresh requires a Git HEAD")

    with refresh_lock(workspace):
        generation = new_generation_id(head_sha)
        generation_root = create_generation(
            workspace,
            generation,
            clone_active=False,
        )
        with use_knowledge_root(generation_root):
            status = await _refresh_pipeline_into_generation(workspace)
            degraded_stages, degraded_modules = _degraded_entries(status)
            expected_stages = {"git_insights": "partial"}
            if degraded_stages != expected_stages or degraded_modules:
                raise RuntimeError(
                    "Refusing ceiling promotion because degradation was not "
                    f"limited to {expected_stages}: "
                    f"stages={degraded_stages}, modules={degraded_modules}"
                )

            status.stages["git_insights"] = "success"
            status.overall_status = _aggregate_states(
                list(status.stages.values()) + list(status.modules.values()),
                skipped_state="success",
            )
            if status.overall_status != "success":
                raise RuntimeError(
                    f"Ceiling status remained {status.overall_status}"
                )
            _write_refresh_status(generation_root, status)
            snapshot = initialize_full_generation_metadata(
                workspace,
                generation_root,
                head_sha,
                status,
            )

        if get_head_sha(workspace) != head_sha:
            raise RuntimeError("Workspace HEAD changed during ceiling refresh")
        pointer = promote_generation(
            workspace,
            generation=generation,
            head_sha=head_sha,
            merkle_root=str(snapshot.get("merkle_root", "")),
        )

    return {
        "mode": "ceiling",
        "waiver": {"git_insights": "partial"},
        "generation": generation,
        "status": status.model_dump(mode="json"),
        "pointer": pointer,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workspace", type=Path, required=True)
    args = parser.parse_args()
    result = asyncio.run(_run(args.workspace))
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
