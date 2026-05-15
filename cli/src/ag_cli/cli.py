"""
Antigravity CLI – ag init <target_dir>

Copies portable Antigravity context files into any project directory so AI IDEs
can share the same repository knowledge entrypoints.
"""

from __future__ import annotations

import shutil
import sys
import time
from importlib import resources as importlib_resources
from pathlib import Path
from typing import Final

import typer
from rich.console import Console

from ag_cli.reader import append_to_memory, append_decision
from rich.panel import Panel
from rich.text import Text
from rich.tree import Tree

# Use a group (rich_markup_mode) so subcommands like `ag init` are not
# flattened into the root command by Typer's single-command optimisation.
app = typer.Typer(
    name="ag",
    help="Antigravity – inject portable AI repository context into any project.",
    add_completion=False,
    no_args_is_help=True,
    rich_markup_mode="rich",
)
console = Console()


# ── Helpers ─────────────────────────────────────────────────────────


def _get_templates_dir() -> Path:
    """Return the absolute path to the bundled templates/ directory.

    Works both in editable installs and built wheels because hatch
    force-includes the directory into the package.
    """
    pkg_root = importlib_resources.files("ag_cli")
    templates = pkg_root / "templates"
    # importlib.resources may return a Traversable; resolve to a real Path.
    return Path(str(templates))


def _copy_tree(src: Path, dst: Path, force: bool = False) -> list[str]:
    """Recursively copy *src* into *dst*, preserving dotfiles.

    Args:
        src: Source directory to copy from.
        dst: Destination directory to copy into.
        force: If True, overwrite existing files.

    Returns a list of relative paths that were created.
    """
    created: list[str] = []
    for item in sorted(src.rglob("*")):
        if item.name == "__pycache__":
            continue
        relative = item.relative_to(src)
        target = dst / relative
        if item.is_dir():
            target.mkdir(parents=True, exist_ok=True)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            if force or not target.exists():
                shutil.copy2(item, target)
            created.append(str(relative))
    return created


_REPO_ROOT = Path(__file__).resolve().parents[3]  # cli/src/ag_cli/cli.py → repo root
_ENGINE_SCRIPTS: Final[dict[str, str]] = {
    "ask": "ag-ask",
    "refresh": "ag-refresh",
    "mcp": "ag-mcp",
}


def _run_hub(workspace: Path, *args: str) -> int:
    """Run a supported engine-backed command.

    Args:
        workspace: Target project root.
        *args: Command name followed by command-specific arguments.

    Returns:
        Exit code from the delegated engine process.
    """
    import subprocess

    if not args:
        console.print("[red]No engine command provided.[/red]")
        return 1

    command = args[0]
    script_name = _ENGINE_SCRIPTS.get(command)
    if script_name is None:
        console.print(f"[red]Unsupported engine command: {command}[/red]")
        return 1

    script_path = shutil.which(script_name)
    if script_path:
        cmd = [script_path] + list(args[1:]) + ["--workspace", str(workspace)]
        return subprocess.run(cmd, check=False).returncode

    engine_dir = _REPO_ROOT / "engine"
    if (engine_dir / "antigravity_engine" / "__main__.py").exists():
        cmd = [
            sys.executable,
            "-m",
            "antigravity_engine",
            command,
            *args[1:],
            "--workspace",
            str(workspace),
        ]
        return subprocess.run(cmd, cwd=str(engine_dir), check=False).returncode

    console.print(
        "[red]Engine not installed. Install: pip install ./engine "
        "or pip install \"git+https://github.com/study8677/"
        "antigravity-workspace-template.git#subdirectory=engine\"[/red]"
    )
    return 1

# ── Commands ────────────────────────────────────────────────────────


@app.command("init")
def init_cmd(
    target_dir: str = typer.Argument(
        ...,
        help="Directory to inject Antigravity context into.",
    ),
    force: bool = typer.Option(
        False,
        "--force",
        "-f",
        help="Overwrite existing files instead of skipping them.",
    ),
) -> None:
    """Inject Antigravity context files into TARGET_DIR."""

    target = Path(target_dir).resolve()

    # ── Pre-flight checks ───────────────────────────────────────────
    if not target.exists():
        target.mkdir(parents=True, exist_ok=True)
        console.print(f"[dim]Created directory [bold]{target}[/bold][/dim]")

    templates = _get_templates_dir()
    if not templates.exists():
        console.print(
            "[bold red]✗[/bold red] Templates directory not found. "
            "Is the package installed correctly?",
        )
        raise typer.Exit(code=1)

    # ── Copy templates with spinner ─────────────────────────────────
    with console.status(
        "[cyan]⚛  Injecting Antigravity context files…[/cyan]",
        spinner="dots",
    ):
        created = _copy_tree(templates, target, force=force)
        # let the user enjoy the spinner for a beat
        time.sleep(0.6)

    # ── Create artifacts scaffold ───────────────────────────────────
    with console.status(
        "[magenta]📂  Scaffolding artifacts directory…[/magenta]",
        spinner="dots",
    ):
        (target / "artifacts" / "logs").mkdir(parents=True, exist_ok=True)
        (target / "artifacts" / ".gitkeep").touch()
        (target / "artifacts" / "logs" / ".gitkeep").touch()
        time.sleep(0.3)

    # ── Success panel ───────────────────────────────────────────────
    tree = Tree(f"[bold green]{target.name}/[/bold green]")
    for path_str in created:
        tree.add(f"[dim]{path_str}[/dim]")
    artifacts_node = tree.add("[bold green]artifacts/[/bold green]")
    artifacts_node.add("[dim]logs/[/dim]")

    console.print()
    console.print(tree)
    console.print()

    next_steps = Text.assemble(
        ("Next steps:\n\n", "bold"),
        ("  1. ", "bold cyan"),
        ("cd ", ""),
        (str(target), "bold"),
        ("\n", ""),
        ("  2. ", "bold cyan"),
        ("Open the directory in your AI IDE (Cursor, VS Code, Windsurf…)\n", ""),
        ("  3. ", "bold cyan"),
        ("Start prompting — Antigravity context is already loaded.\n", ""),
    )

    console.print(
        Panel(
            next_steps,
            title="[bold green]✔ Antigravity initialized[/bold green]",
            border_style="green",
            padding=(1, 2),
        ),
    )


# ── Version ──────────────────────────────────────────────────────────


@app.command("version")
def version_cmd() -> None:
    """Print the CLI version."""
    from ag_cli import __version__

    console.print(f"[bold cyan]ag[/bold cyan] v{__version__}")


# ── Hub Commands ─────────────────────────────────────────────────────


@app.command("ask")
def ask_cmd(
    question: str = typer.Argument(..., help="Question about the project."),
    workspace: str = typer.Option(".", "--workspace", "-w", help="Project directory."),
) -> None:
    """Ask a question about the project (requires LLM)."""
    workspace_path = Path(workspace).resolve()
    code = _run_hub(workspace_path, "ask", question)
    raise typer.Exit(code=code)


@app.command("refresh")
def refresh_cmd(
    workspace: str = typer.Option(".", "--workspace", "-w", help="Project directory."),
    quick: bool = typer.Option(False, "--quick", help="Only scan changed files."),
    failed_only: bool = typer.Option(False, "--failed-only", help="Only re-run modules that failed in the previous refresh."),
) -> None:
    """Refresh project context in .antigravity/ (requires LLM)."""
    workspace_path = Path(workspace).resolve()
    args: list[str] = ["refresh"]
    if quick:
        args.append("--quick")
    if failed_only:
        args.append("--failed-only")
    code = _run_hub(workspace_path, *args)
    raise typer.Exit(code=code)


@app.command("report")
def report_cmd(
    message: str = typer.Argument(..., help="Report message to log."),
    workspace: str = typer.Option(".", "--workspace", "-w", help="Project directory."),
) -> None:
    """Log a report to .antigravity/memory/reports.md (no LLM needed)."""
    workspace_path = Path(workspace).resolve()
    target = append_to_memory(workspace_path, "reports.md", message)
    console.print(f"[green]Logged report to {target.relative_to(workspace_path)}[/green]")


@app.command("log-decision")
def log_decision_cmd(
    decision: str = typer.Argument(..., help="The decision made."),
    rationale: str = typer.Argument(..., help="Why this decision was made."),
    workspace: str = typer.Option(".", "--workspace", "-w", help="Project directory."),
) -> None:
    """Log an architectural decision to .antigravity/decisions/log.md (no LLM needed)."""
    workspace_path = Path(workspace).resolve()
    target = append_decision(workspace_path, decision, rationale)
    console.print(f"[green]Logged decision to {target.relative_to(workspace_path)}[/green]")


@app.command("clean")
def clean_cmd(
    workspace: str = typer.Option(".", "--workspace", "-w", help="Project directory."),
    force: bool = typer.Option(False, "--force", "-f", help="Force clean without prompting."),
) -> None:
    """Clean agent memory and logs to restore a pristine environment."""
    workspace_path = Path(workspace).resolve()

    if not force:
        if not typer.confirm(f"Are you sure you want to clean logs and memory in {workspace_path}?"):
            console.print("[dim]Aborted clean.[/dim]")
            raise typer.Exit()

    cleaned_count = 0

    # Directories to clean
    dirs_to_clean = [
        workspace_path / "artifacts" / "logs",
        workspace_path / ".antigravity" / "memory",
        workspace_path / "memory", # legacy
    ]

    for d in dirs_to_clean:
        if d.exists() and d.is_dir():
            for item in d.iterdir():
                if item.name == ".gitkeep":
                    continue
                try:
                    if item.is_file():
                        item.unlink(missing_ok=True)
                        cleaned_count += 1
                    elif item.is_dir():
                        shutil.rmtree(item, ignore_errors=True)
                        cleaned_count += 1
                except Exception:
                    pass

    console.print(f"[green]✔ Cleaned {cleaned_count} temporary files/directories.[/green]")


if __name__ == "__main__":
    app()
