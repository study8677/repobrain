"""Tests for CLI discovery logic for engine-backed commands."""
from pathlib import Path
from unittest.mock import MagicMock, call, patch

import pytest
from typer.testing import CliRunner

runner = CliRunner()


def test_run_hub_ask_console_script_found() -> None:
    """When rb-ask is on PATH, the ask command uses it directly."""
    from rb_cli.cli import _run_hub

    def fake_which(name: str) -> str | None:
        if name == "rb-ask":
            return "/usr/local/bin/rb-ask"
        return None

    with patch("shutil.which", side_effect=fake_which) as mock_which:
        with patch("subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(returncode=0)
            code = _run_hub(Path("/tmp/project"), "ask", "What?")

    assert code == 0
    cmd = mock_run.call_args[0][0]
    assert cmd[0] == "/usr/local/bin/rb-ask"
    assert "What?" in cmd
    assert "--workspace" in cmd
    assert mock_which.call_args_list == [call("rb-ask")]


def test_run_hub_refresh_console_script_found() -> None:
    """When rb-refresh is on PATH, the refresh command uses it directly."""
    from rb_cli.cli import _run_hub

    def fake_which(name: str) -> str | None:
        if name == "rb-refresh":
            return "/usr/local/bin/rb-refresh"
        return None

    with patch("shutil.which", side_effect=fake_which) as mock_which:
        with patch("subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(returncode=0)
            code = _run_hub(Path("/tmp/project"), "refresh", "--full")

    assert code == 0
    cmd = mock_run.call_args[0][0]
    assert cmd[0] == "/usr/local/bin/rb-refresh"
    assert "--full" in cmd
    assert "--workspace" in cmd
    assert mock_which.call_args_list == [call("rb-refresh")]


def test_run_hub_fallback_to_python_m(tmp_path: Path) -> None:
    """When no console script but monorepo dir exists, falls back to python -m."""
    from rb_cli.cli import _run_hub, _REPO_ROOT

    # Create the marker file at the expected location
    hub_main = _REPO_ROOT / "engine" / "repobrain_engine" / "hub" / "__main__.py"
    # This file actually exists in our repo, so this should work
    if hub_main.exists():
        with patch("shutil.which", return_value=None):
            with patch("subprocess.run") as mock_run:
                mock_run.return_value = MagicMock(returncode=0)
                code = _run_hub(Path("/tmp/project"), "refresh")

        assert code == 0
        cmd = mock_run.call_args[0][0]
        assert "-m" in cmd
        assert "repobrain_engine" in cmd


def test_run_hub_neither_found(tmp_path: Path) -> None:
    """Returns 1 when neither console script nor monorepo dir found."""
    from rb_cli.cli import _run_hub

    with patch("shutil.which", return_value=None):
        with patch("rb_cli.cli._REPO_ROOT", tmp_path):
            code = _run_hub(Path("/tmp/project"), "ask", "test")

    assert code == 1


def test_help_lists_supported_commands_only() -> None:
    """The public CLI help should only list the supported command surface."""
    from rb_cli.cli import app

    result = runner.invoke(app, ["--help"])

    assert result.exit_code == 0
    assert "ask" in result.output
    assert "refresh" in result.output
    assert "report" in result.output
    assert "log-decision" in result.output
    assert "start-engine" not in result.output


@pytest.mark.parametrize('arguments, expected', [([], ('refresh',)), (['--full'], ('refresh', '--full'))])
def test_refresh_command_forwards_only_full(arguments, expected, monkeypatch, tmp_path):
    from rb_cli import cli
    calls = []
    monkeypatch.setattr(cli, '_run_hub', lambda workspace, *args: calls.append((workspace, args)) or 0)
    result = runner.invoke(cli.app, ['refresh', '--workspace', str(tmp_path), *arguments])
    assert result.exit_code == 0
    assert calls == [(tmp_path.resolve(), expected)]


@pytest.mark.parametrize('old_flag', ['--quick', '--failed-only'])
def test_refresh_command_rejects_removed_flags(old_flag, monkeypatch):
    from rb_cli import cli
    monkeypatch.setattr(cli, '_run_hub', lambda *args: pytest.fail('Must not run refresh'))
    result = runner.invoke(cli.app, ['refresh', old_flag])
    assert result.exit_code == 2
