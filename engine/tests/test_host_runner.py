"""Tests for local host runner integration."""
from __future__ import annotations

import subprocess
from pathlib import Path
from types import SimpleNamespace

import pytest

from antigravity_engine.hub.host_runner import (
    HostRunnerError,
    build_codex_command,
    parse_host_runner_answer,
    run_codex_host_runner,
)


def test_codex_command_constructs_read_only_exec(tmp_path: Path) -> None:
    schema_path = tmp_path / "schema.json"
    output_path = tmp_path / "answer.json"

    cmd = build_codex_command(
        workspace=tmp_path,
        model="gpt-5.3-codex-spark",
        schema_path=schema_path,
        output_path=output_path,
        prompt="answer this",
    )

    assert cmd[:2] == ["codex", "exec"]
    assert cmd[cmd.index("--cd") + 1] == str(tmp_path)
    assert cmd[cmd.index("--sandbox") + 1] == "read-only"
    assert "--ephemeral" in cmd
    assert "--skip-git-repo-check" in cmd
    assert cmd[cmd.index("--model") + 1] == "gpt-5.3-codex-spark"
    assert cmd[cmd.index("--output-schema") + 1] == str(schema_path)
    assert cmd[cmd.index("--output-last-message") + 1] == str(output_path)
    assert cmd[-1] == "answer this"


@pytest.mark.asyncio
async def test_missing_codex_cli_has_clear_error(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setattr("shutil.which", lambda _: None)

    with pytest.raises(HostRunnerError, match="Codex CLI is not installed"):
        await run_codex_host_runner(
            workspace=tmp_path,
            question="What is this?",
            context="context",
        )


@pytest.mark.asyncio
async def test_codex_timeout_reports_deadline(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setattr("shutil.which", lambda _: "/usr/bin/codex")

    def _timeout(*args, **kwargs):
        raise subprocess.TimeoutExpired(cmd=args[0], timeout=kwargs["timeout"])

    monkeypatch.setattr("subprocess.run", _timeout)

    with pytest.raises(HostRunnerError, match="timed out after 1s"):
        await run_codex_host_runner(
            workspace=tmp_path,
            question="What is this?",
            context="context",
            timeout_seconds=1,
        )


@pytest.mark.asyncio
async def test_codex_output_last_message_json_is_parsed(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setattr("shutil.which", lambda _: "/usr/bin/codex")
    seen: dict[str, list[str]] = {}

    def _run(cmd, **kwargs):
        seen["cmd"] = cmd
        output_path = Path(cmd[cmd.index("--output-last-message") + 1])
        output_path.write_text(
            '{"answer": "It uses host mode.", "sources": ["a.py:1"], "limitations": []}',
            encoding="utf-8",
        )
        return SimpleNamespace(returncode=0, stdout="", stderr="")

    monkeypatch.setattr("subprocess.run", _run)

    answer = await run_codex_host_runner(
        workspace=tmp_path,
        question="What is this?",
        context="context",
        retrieval_evidence="evidence",
        model="gpt-5.3-codex-spark",
    )

    assert answer.answer == "It uses host mode."
    assert answer.sources == ["a.py:1"]
    assert seen["cmd"][0:2] == ["codex", "exec"]


def test_non_json_output_is_diagnostic() -> None:
    with pytest.raises(HostRunnerError, match="non-JSON output"):
        parse_host_runner_answer("plain text answer")


@pytest.mark.asyncio
async def test_codex_failure_redacts_env_secrets(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setattr("shutil.which", lambda _: "/usr/bin/codex")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-super-secret-value")

    def _run(*args, **kwargs):
        return SimpleNamespace(
            returncode=1,
            stdout="",
            stderr="provider rejected sk-super-secret-value",
        )

    monkeypatch.setattr("subprocess.run", _run)

    with pytest.raises(HostRunnerError) as excinfo:
        await run_codex_host_runner(
            workspace=tmp_path,
            question="What is this?",
            context="context",
        )

    message = str(excinfo.value)
    assert "sk-super-secret-value" not in message
    assert "<redacted>" in message
