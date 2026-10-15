"""Tests for rb doctor diagnostics."""
from __future__ import annotations

import json
import subprocess
import builtins
import pytest
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


def test_versioned_doctor_follows_checked_out_commit(tmp_path: Path, monkeypatch) -> None:
    """Doctor uses an older exact generation, not the last-refreshed branch."""
    pytest.importorskip("repobrain_engine")
    from repobrain_engine.config import reset_settings
    from repobrain_engine.hub.incremental import build_workspace_snapshot, save_snapshot
    from repobrain_engine.hub.refresh_lifecycle import generation_config
    from repobrain_engine.hub.storage import atomic_write_json, atomic_write_text, create_generation, promote_generation
    from rb_cli.cli import _active_knowledge_root, _git_commit_lag

    def git(*args):
        return subprocess.check_output(["git", *args], cwd=tmp_path, text=True).strip()

    git("init", "-q")
    git("config", "user.email", "test@example.com")
    git("config", "user.name", "Test")
    git("config", "core.hooksPath", str(tmp_path / ".git" / "no-hooks"))
    monkeypatch.setenv("WORKSPACE_PATH", str(tmp_path))
    monkeypatch.setenv("RB_REFRESH_SCAN_ONLY", "0")
    reset_settings()

    def save_version(value):
        (tmp_path / "app.py").write_text(f"def value(): return {value}\n")
        git("add", "app.py")
        git("commit", "-qm", f"修改数值为 {value}")
        head = git("rev-parse", "HEAD")
        root = create_generation(tmp_path, f"version-{value}", clone_active=False)
        snapshot = build_workspace_snapshot(tmp_path, head)
        save_snapshot(root, snapshot)
        for group in snapshot["groups"].values():
            atomic_write_text(root / group["artifact_path"], "# Knowledge\n")
        atomic_write_text(root / "map.md", "# Map\n")
        atomic_write_json(root / "status.json", {
            "refresh_run_id": "test", "overall_status": "success", "head_sha": head,
            "stages": {"module_docs": "success"},
        })
        atomic_write_json(root / "refresh_config.json", generation_config())
        promote_generation(tmp_path, generation=root.name, head_sha=head,
                           merkle_root=snapshot["merkle_root"])
        return head, root

    try:
        first, root = save_version(1)
        save_version(2)
        git("checkout", "-q", "--detach", first)
        other = tmp_path.parent / "other-project"
        other.mkdir(exist_ok=True)
        (other / ".env").write_text("RB_HOST_COMMAND=unrelated-runner\n")
        monkeypatch.setenv("WORKSPACE_PATH", str(other))
        reset_settings()
        assert _active_knowledge_root(tmp_path) == root
        assert "knowledge matches current commit" in _git_commit_lag(tmp_path)
        git("commit", "--allow-empty", "-qm", "尚未生成知识的新提交")
        assert _active_knowledge_root(tmp_path) == root
        assert "knowledge from ancestor commit" in _git_commit_lag(tmp_path)
    finally:
        reset_settings()
