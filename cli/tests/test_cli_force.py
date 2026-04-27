"""Tests for ag init --force flag."""
from pathlib import Path

from typer.testing import CliRunner

from ag_cli.cli import app

runner = CliRunner()


def test_init_skips_existing_without_force(tmp_path: Path) -> None:
    """Without --force, existing files are not overwritten."""
    # First init
    result = runner.invoke(app, ["init", str(tmp_path)])
    assert result.exit_code == 0

    # Write a marker into an existing file to check it stays intact
    ag_dir = tmp_path / ".antigravity"
    if ag_dir.exists():
        md_files = list(ag_dir.glob("*.md"))
        if md_files:
            target = md_files[0]
            target.write_text("CUSTOM CONTENT", encoding="utf-8")

            # Second init without --force
            result = runner.invoke(app, ["init", str(tmp_path)])
            assert result.exit_code == 0

            # Custom content should be preserved
            assert target.read_text(encoding="utf-8") == "CUSTOM CONTENT"


def test_init_overwrites_with_force(tmp_path: Path) -> None:
    """With --force, existing files are overwritten."""
    # First init
    result = runner.invoke(app, ["init", str(tmp_path)])
    assert result.exit_code == 0

    # Write a marker into an existing file
    ag_dir = tmp_path / ".antigravity"
    if ag_dir.exists():
        md_files = list(ag_dir.glob("*.md"))
        if md_files:
            target = md_files[0]
            original = target.read_text(encoding="utf-8")
            target.write_text("CUSTOM CONTENT", encoding="utf-8")

            # Second init with --force
            result = runner.invoke(app, ["init", "--force", str(tmp_path)])
            assert result.exit_code == 0

            # File should be restored to original template content
            assert target.read_text(encoding="utf-8") == original


def test_init_bootstrap_files_defer_to_agents_md(tmp_path: Path) -> None:
    """Injected bootstrap files should defer to AGENTS.md."""
    result = runner.invoke(app, ["init", str(tmp_path)])
    assert result.exit_code == 0

    agents = (tmp_path / "AGENTS.md").read_text(encoding="utf-8")
    claude = (tmp_path / "CLAUDE.md").read_text(encoding="utf-8")
    cursor = (tmp_path / ".cursorrules").read_text(encoding="utf-8")
    context = (tmp_path / "CONTEXT.md").read_text(encoding="utf-8")
    antigravity_rules = (tmp_path / ".antigravity" / "rules.md").read_text(
        encoding="utf-8"
    )

    assert "Beautiful is better than ugly." in agents
    assert "Namespaces are one honking great idea -- let's do more of those!" in agents
    assert "Authoritative behavior rules live in `AGENTS.md`." in claude
    assert "Use `AGENTS.md` as the single authoritative behavior file." in cursor
    assert "`AGENTS.md` is the single source of truth for agent behavior." in context
    assert "Behavioral rules are defined in `AGENTS.md`." in antigravity_rules
