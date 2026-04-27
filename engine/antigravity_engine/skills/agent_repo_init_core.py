"""Reusable project initialization core for agent-repo-init skill."""

from __future__ import annotations

import re
import shutil
import subprocess
from enum import Enum
from pathlib import Path
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class InitMode(str, Enum):
    """Initialization mode."""

    QUICK = "quick"
    FULL = "full"


class LlmProvider(str, Enum):
    """LLM provider preference for generated project defaults."""

    GEMINI = "gemini"
    OPENAI = "openai"


class SandboxRuntime(str, Enum):
    """Sandbox runtime preference for generated project defaults."""

    LOCAL = "local"
    MICROSANDBOX = "microsandbox"


class RepoInitOptions(BaseModel):
    """Options for initializing a new project from template.

    Args:
        project_name: Name of destination project directory.
        destination_root: Parent directory for the destination project.
        mode: Initialization mode, either quick or full.
        llm_provider: Preferred LLM provider profile for full mode.
        enable_mcp: Whether MCP should be enabled in generated `.env` for full mode.
        enable_swarm: Whether swarm workflow should be recommended in generated context.
        sandbox_runtime: Sandbox runtime preference for full mode.
        init_git: Whether to run `git init` in destination project.
    """

    project_name: str = Field(..., min_length=1)
    destination_root: str = Field(default=".")
    mode: InitMode = Field(default=InitMode.QUICK)
    llm_provider: LlmProvider = Field(default=LlmProvider.GEMINI)
    enable_mcp: bool = Field(default=False)
    enable_swarm: bool = Field(default=True)
    sandbox_runtime: SandboxRuntime = Field(default=SandboxRuntime.LOCAL)
    init_git: bool = Field(default=False)

    @field_validator("project_name")
    @classmethod
    def validate_project_name(cls, value: str) -> str:
        """Validate project name pattern.

        Args:
            value: Raw project name.

        Returns:
            Sanitized project name.

        Raises:
            ValueError: If project name includes unsupported characters.
        """

        if not re.fullmatch(r"[A-Za-z0-9._-]+", value):
            raise ValueError(
                "project_name must contain only letters, numbers, '.', '_', or '-'."
            )
        return value


class RepoInitResult(BaseModel):
    """Result payload for repository initialization.

    Args:
        project_name: Destination project name.
        project_path: Absolute destination path.
        mode: Mode used for initialization.
        copied_entries: Number of copied entries under destination.
        next_steps: Recommended commands after initialization.
    """

    project_name: str
    project_path: str
    mode: InitMode
    copied_entries: int
    next_steps: List[str]


def _is_within(child: Path, parent: Path) -> bool:
    """Return whether `child` is inside `parent`.

    Args:
        child: Potential child path.
        parent: Potential parent path.

    Returns:
        True when `child` resolves under `parent`.
    """

    try:
        child.relative_to(parent)
        return True
    except ValueError:
        return False


def _count_entries(path: Path) -> int:
    """Count filesystem entries recursively.

    Args:
        path: Directory path.

    Returns:
        Number of files and directories below the path.
    """

    return sum(1 for _ in path.rglob("*"))


def _upsert_env_var(lines: List[str], key: str, value: str) -> List[str]:
    """Set or append an environment variable line.

    Args:
        lines: Existing `.env` file lines.
        key: Environment variable key.
        value: Environment variable value.

    Returns:
        Updated `.env` lines.
    """

    updated: List[str] = []
    replaced = False
    prefix_pattern = re.compile(rf"^\s*{re.escape(key)}\s*=")

    for line in lines:
        if not replaced and not line.lstrip().startswith("#") and prefix_pattern.match(line):
            updated.append(f"{key}={value}")
            replaced = True
            continue
        updated.append(line)

    if not replaced:
        updated.append(f"{key}={value}")

    return updated


def _configure_env_file(target_path: Path, options: RepoInitOptions) -> None:
    """Create or update `.env` for destination project.

    Args:
        target_path: Destination project path.
        options: Initialization options.
    """

    env_example = target_path / ".env.example"
    env_file = target_path / ".env"

    if not env_file.exists() and env_example.exists():
        shutil.copy2(env_example, env_file)

    if not env_file.exists():
        env_file.write_text("", encoding="utf-8")

    if options.mode == InitMode.QUICK:
        return

    lines = env_file.read_text(encoding="utf-8").splitlines()

    # <thought>
    # Full mode should establish a practical default runtime profile while still
    # allowing users to override values later. Keep edits minimal by only upserting
    # core operational flags instead of rewriting the whole environment file.
    # </thought>
    lines = _upsert_env_var(lines, "MCP_ENABLED", "true" if options.enable_mcp else "false")
    lines = _upsert_env_var(
        lines,
        "SANDBOX_TYPE",
        options.sandbox_runtime.value,
    )
    lines = _upsert_env_var(lines, "AGENT_NAME", options.project_name)

    if options.llm_provider == LlmProvider.OPENAI:
        lines = _upsert_env_var(lines, "OPENAI_BASE_URL", "https://api.openai.com/v1")
        lines = _upsert_env_var(lines, "OPENAI_MODEL", "gpt-4o-mini")
    else:
        lines = _upsert_env_var(lines, "GEMINI_MODEL_NAME", "gemini-2.0-flash-exp")

    env_file.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _write_mission_file(target_path: Path, options: RepoInitOptions) -> None:
    """Write mission file in full mode.

    Args:
        target_path: Destination project path.
        options: Initialization options.
    """

    if options.mode != InitMode.FULL:
        return

    mission_content = (
        f"# Agent Mission\n\n"
        f"**Project:** {options.project_name}\n\n"
        f"## Objective\n"
        f"Build a production-ready multi-agent workflow tailored to this repository.\n\n"
        f"## Initial Runtime Profile\n"
        f"- Mode: {options.mode.value}\n"
        f"- LLM Provider: {options.llm_provider.value}\n"
        f"- MCP Enabled: {options.enable_mcp}\n"
        f"- Swarm Preferred: {options.enable_swarm}\n"
        f"- Sandbox Runtime: {options.sandbox_runtime.value}\n"
    )
    (target_path / "mission.md").write_text(mission_content, encoding="utf-8")


def _write_runtime_profile(target_path: Path, options: RepoInitOptions) -> None:
    """Write context profile for generated project.

    Args:
        target_path: Destination project path.
        options: Initialization options.
    """

    profile_path = target_path / ".context" / "agent_runtime_profile.md"
    profile_path.parent.mkdir(parents=True, exist_ok=True)
    content = (
        "# Agent Runtime Profile\n\n"
        "This file is generated by `agent-repo-init` full mode.\n\n"
        f"- Preferred LLM provider: `{options.llm_provider.value}`\n"
        f"- MCP enabled by default: `{options.enable_mcp}`\n"
        f"- Swarm workflow preference: `{options.enable_swarm}`\n"
        f"- Default sandbox mode: `{options.sandbox_runtime.value}`\n"
    )
    profile_path.write_text(content, encoding="utf-8")


def _write_init_report(target_path: Path, options: RepoInitOptions) -> None:
    """Write initialization report artifact.

    Args:
        target_path: Destination project path.
        options: Initialization options.
    """

    report_path = target_path / "artifacts" / "logs" / "agent_repo_init_report.md"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    content = (
        "# Agent Repo Init Report\n\n"
        f"- Mode: `{options.mode.value}`\n"
        f"- Project Name: `{options.project_name}`\n"
        f"- LLM Provider: `{options.llm_provider.value}`\n"
        f"- MCP Enabled: `{options.enable_mcp}`\n"
        f"- Swarm Preferred: `{options.enable_swarm}`\n"
        f"- Sandbox Runtime: `{options.sandbox_runtime.value}`\n"
        f"- Git Initialized: `{options.init_git}`\n"
    )
    report_path.write_text(content, encoding="utf-8")


def _init_git_repo(target_path: Path) -> None:
    """Initialize git repository for destination project.

    Args:
        target_path: Destination project path.

    Raises:
        OSError: If git initialization fails.
    """

    try:
        subprocess.run(
            ["git", "init"],
            cwd=target_path,
            check=True,
            capture_output=True,
            text=True,
        )
    except subprocess.CalledProcessError as exc:
        raise OSError(f"git init failed: {exc.stderr.strip()}") from exc


def initialize_agent_repo(
    options: RepoInitOptions,
    template_root: Optional[Path] = None,
) -> RepoInitResult:
    """Initialize a clean project from template root.

    Args:
        options: Initialization options.
        template_root: Optional override for template root path.

    Returns:
        Structured initialization result.

    Raises:
        ValueError: If destination is invalid.
        OSError: If filesystem operations fail.
    """

    resolved_template_root = (
        template_root.resolve() if template_root is not None else Path(__file__).resolve().parents[2]
    )
    destination_parent = Path(options.destination_root).expanduser().resolve()
    destination_parent.mkdir(parents=True, exist_ok=True)

    target_path = (destination_parent / options.project_name).resolve()

    if target_path.exists():
        raise ValueError(f"Target path already exists: {target_path}")

    if _is_within(target_path, resolved_template_root):
        raise ValueError(
            "Destination must be outside the current template repository to avoid recursive copies."
        )

    ignore = shutil.ignore_patterns(
        ".git",
        ".pytest_cache",
        "__pycache__",
        "venv",
        ".venv",
        "antigravity_workspace_template_venv",
        "agent_memory.json",
        "memory",
        "artifacts",
        "*.pyc",
    )
    shutil.copytree(resolved_template_root, target_path, ignore=ignore)

    (target_path / "artifacts" / "logs").mkdir(parents=True, exist_ok=True)

    _configure_env_file(target_path, options)
    _write_mission_file(target_path, options)
    _write_runtime_profile(target_path, options)
    _write_init_report(target_path, options)

    if options.init_git:
        _init_git_repo(target_path)

    next_steps = [
        f"cd {target_path}",
        "python3 -m venv venv",
        "source venv/bin/activate",
        "pip install -e ./cli -e './engine[dev]'",
        "cp .env.example .env  # if .env not already created",
        "ag-refresh --workspace .",
    ]

    if options.mode == InitMode.FULL:
        next_steps.append("review .context/agent_runtime_profile.md")

    return RepoInitResult(
        project_name=options.project_name,
        project_path=str(target_path),
        mode=options.mode,
        copied_entries=_count_entries(target_path),
        next_steps=next_steps,
    )
