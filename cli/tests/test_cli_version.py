"""Tests for the public RepoBrain CLI version contract."""

from __future__ import annotations

from typer.testing import CliRunner

from rb_cli import __version__
from rb_cli.cli import app


def test_version_command_matches_package_version() -> None:
    """``rb version`` must report the version shipped by the CLI package."""
    result = CliRunner().invoke(app, ["version"])

    assert result.exit_code == 0
    assert f"rb v{__version__}" in result.output
