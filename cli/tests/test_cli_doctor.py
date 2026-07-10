"""Tests for rb doctor diagnostics."""
from __future__ import annotations

import json
import subprocess
import builtins
from contextlib import nullcontext
from pathlib import Path
from unittest.mock import MagicMock, patch

from typer.testing import CliRunner

from rb_cli.cli import app

runner = CliRunner()
_ORIGINAL_IMPORT = builtins.__import__


def _write_env(workspace: Path) -> None:
    (workspace / ".env").write_text(
        "\n".join(
            [
                "OPENAI_BASE_URL=https://api.example.test/v1",
                "OPENAI_API_KEY=sk-test-1234567890",
                "OPENAI_MODEL=gpt-test",
            ]
        ),
        encoding="utf-8",
    )


def _write_knowledge(workspace: Path) -> None:
    rb_dir = workspace / ".repobrain"
    agents_dir = rb_dir / "agents"
    agents_dir.mkdir(parents=True)
    (rb_dir / "map.md").write_text("# Map\n", encoding="utf-8")
    (agents_dir / "core.md").write_text("# Core\n", encoding="utf-8")
    (rb_dir / ".last_refresh_sha").write_text("abc123\n", encoding="utf-8")
    (rb_dir / "status.json").write_text(
        json.dumps(
            {
                "refresh_run_id": "test",
                "overall_status": "success",
                "modules": {"core": "success"},
                "groups": {"core/default": "success"},
            }
        ),
        encoding="utf-8",
    )


def _git_run_with_lag(lag: int):
    def fake_run(cmd, **kwargs):
        if cmd[:3] == ["git", "rev-parse", "--is-inside-work-tree"]:
            return subprocess.CompletedProcess(cmd, 0, stdout="true\n", stderr="")
        if cmd[:3] == ["git", "rev-list", "--count"]:
            return subprocess.CompletedProcess(cmd, 0, stdout=f"{lag}\n", stderr="")
        raise AssertionError(f"unexpected command: {cmd}")

    return fake_run


def _mock_provider_ok():
    response = MagicMock()
    response.raise_for_status.return_value = None
    return patch("requests.get", return_value=response)


def _import_without_requests(name, *args, **kwargs):
    if name == "requests":
        raise ImportError("No module named requests")
    return _ORIGINAL_IMPORT(name, *args, **kwargs)


def test_doctor_happy_path(tmp_path: Path, monkeypatch) -> None:
    """rb doctor exits 0 when engine, env, provider, and knowledge are healthy."""
    _write_env(tmp_path)
    _write_knowledge(tmp_path)
    for key in ("OPENAI_BASE_URL", "OPENAI_API_KEY", "OPENAI_MODEL", "RB_HOST_RUNNER"):
        monkeypatch.delenv(key, raising=False)

    with patch("rb_cli.cli.shutil.which", return_value="/usr/local/bin/rb-ask"):
        with patch("rb_cli.cli.subprocess.run", side_effect=_git_run_with_lag(0)):
            with _mock_provider_ok():
                result = runner.invoke(app, ["doctor", "--workspace", str(tmp_path)])

    assert result.exit_code == 0
    assert "✓ Engine install: rb-ask at /usr/local/bin/rb-ask" in result.output
    assert "OPENAI_API_KEY=sk-t...7890" in result.output
    assert "✓ Provider reachability: GET https://api.example.test/v1/models ok" in result.output
    assert "✓ Knowledge base health:" in result.output
    assert "0 commit(s) behind HEAD" in result.output


def test_doctor_provider_uses_urllib_when_requests_missing(
    tmp_path: Path,
    monkeypatch,
) -> None:
    """Provider check falls back to urllib if requests is unavailable."""
    _write_env(tmp_path)
    _write_knowledge(tmp_path)
    for key in ("OPENAI_BASE_URL", "OPENAI_API_KEY", "OPENAI_MODEL", "RB_HOST_RUNNER"):
        monkeypatch.delenv(key, raising=False)

    with patch("rb_cli.cli.shutil.which", return_value="/usr/local/bin/rb-ask"):
        with patch("rb_cli.cli.subprocess.run", side_effect=_git_run_with_lag(0)):
            with patch("builtins.__import__", side_effect=_import_without_requests):
                with patch("rb_cli.cli.urllib.request.urlopen", return_value=nullcontext()):
                    result = runner.invoke(app, ["doctor", "--workspace", str(tmp_path)])

    assert result.exit_code == 0
    assert "✓ Provider reachability: GET https://api.example.test/v1/models ok" in result.output


def test_doctor_missing_env_is_blocking(tmp_path: Path, monkeypatch) -> None:
    """Missing workspace .env is a blocking doctor failure."""
    _write_knowledge(tmp_path)
    for key in ("OPENAI_BASE_URL", "OPENAI_API_KEY", "OPENAI_MODEL", "RB_HOST_RUNNER"):
        monkeypatch.delenv(key, raising=False)

    with patch("rb_cli.cli.shutil.which", return_value="/usr/local/bin/rb-ask"):
        with patch("rb_cli.cli.subprocess.run", side_effect=_git_run_with_lag(0)):
            result = runner.invoke(app, ["doctor", "--workspace", str(tmp_path)])

    assert result.exit_code == 1
    assert "✗ .env config: .env missing; run rb-setup" in result.output
    assert "⚠ Provider reachability:" in result.output


def test_doctor_accepts_process_env_without_dotenv(tmp_path: Path, monkeypatch) -> None:
    """Process-level provider configuration is valid without a workspace .env."""
    _write_knowledge(tmp_path)
    monkeypatch.setenv("OPENAI_BASE_URL", "https://api.example.test/v1")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test-1234567890")
    monkeypatch.setenv("OPENAI_MODEL", "gpt-test")
    monkeypatch.delenv("RB_HOST_RUNNER", raising=False)

    with patch("rb_cli.cli.shutil.which", return_value="/usr/local/bin/rb-ask"):
        with patch("rb_cli.cli.subprocess.run", side_effect=_git_run_with_lag(0)):
            with _mock_provider_ok():
                result = runner.invoke(app, ["doctor", "--workspace", str(tmp_path)])

    assert result.exit_code == 0
    assert "✓ process env config:" in result.output
    assert "OPENAI_API_KEY=sk-t...7890" in result.output


def test_doctor_engine_not_installed_is_blocking(tmp_path: Path, monkeypatch) -> None:
    """Doctor reports a blocking failure when no engine path is available."""
    _write_env(tmp_path)
    _write_knowledge(tmp_path)
    for key in ("OPENAI_BASE_URL", "OPENAI_API_KEY", "OPENAI_MODEL", "RB_HOST_RUNNER"):
        monkeypatch.delenv(key, raising=False)

    with patch("rb_cli.cli.shutil.which", return_value=None):
        with patch("rb_cli.cli.find_spec", return_value=None):
            with patch("rb_cli.cli.subprocess.run", side_effect=_git_run_with_lag(0)):
                with _mock_provider_ok():
                    result = runner.invoke(app, ["doctor", "--workspace", str(tmp_path)])

    assert result.exit_code == 1
    assert "✗ Engine install: not found; install:" in result.output


def test_doctor_reports_stale_knowledge(tmp_path: Path, monkeypatch) -> None:
    """Doctor reports stale knowledge when .last_refresh_sha is behind HEAD."""
    _write_env(tmp_path)
    _write_knowledge(tmp_path)
    for key in ("OPENAI_BASE_URL", "OPENAI_API_KEY", "OPENAI_MODEL", "RB_HOST_RUNNER"):
        monkeypatch.delenv(key, raising=False)

    with patch("rb_cli.cli.shutil.which", return_value="/usr/local/bin/rb-ask"):
        with patch("rb_cli.cli.subprocess.run", side_effect=_git_run_with_lag(3)):
            with _mock_provider_ok():
                result = runner.invoke(app, ["doctor", "--workspace", str(tmp_path)])

    assert result.exit_code == 0
    assert "⚠ Knowledge base health:" in result.output
    assert "3 commit(s) behind HEAD" in result.output
