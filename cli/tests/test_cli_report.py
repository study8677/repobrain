"""Integration tests for ag report and ag log-decision commands."""
from pathlib import Path

from typer.testing import CliRunner

from ag_cli.cli import app

runner = CliRunner()


def test_report_creates_file(tmp_path: Path) -> None:
    """ag report writes a timestamped entry to reports.md."""
    result = runner.invoke(
        app, ["report", "Found a critical bug", "--workspace", str(tmp_path)]
    )
    assert result.exit_code == 0
    assert "Logged report" in result.output

    reports = tmp_path / ".antigravity" / "memory" / "reports.md"
    assert reports.exists()
    content = reports.read_text(encoding="utf-8")
    assert "Found a critical bug" in content


def test_log_decision_creates_file(tmp_path: Path) -> None:
    """ag log-decision writes a decision with rationale."""
    result = runner.invoke(
        app,
        [
            "log-decision",
            "Use PostgreSQL",
            "Team has deep expertise",
            "--workspace",
            str(tmp_path),
        ],
    )
    assert result.exit_code == 0
    assert "Logged decision" in result.output

    log = tmp_path / ".antigravity" / "decisions" / "log.md"
    assert log.exists()
    content = log.read_text(encoding="utf-8")
    assert "Use PostgreSQL" in content
    assert "Team has deep expertise" in content
