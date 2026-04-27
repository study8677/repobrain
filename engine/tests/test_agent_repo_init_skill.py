"""Tests for the agent-repo-init skill."""

import json
import subprocess
import sys
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
from types import ModuleType

import pytest


def _load_skill_module() -> ModuleType:
    """Load the skill tools module from its filesystem path.

    Returns:
        The loaded module object.

    Raises:
        RuntimeError: If the module spec or loader is missing.
    """

    skill_tools_path = (
        Path(__file__).resolve().parents[1]
        / "antigravity_engine"
        / "skills"
        / "agent-repo-init"
        / "tools.py"
    )
    spec = spec_from_file_location("antigravity_engine.skills.agent-repo-init.tools", skill_tools_path)
    if spec is None or spec.loader is None:
        raise RuntimeError("Failed to load skill module spec.")

    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_init_agent_repo_creates_clean_project(tmp_path: Path) -> None:
    """Initialize a new project and verify expected files are present.

    Args:
        tmp_path: Temporary directory managed by pytest.
    """

    module = _load_skill_module()

    result = module.init_agent_repo("demo-agent", str(tmp_path))

    target_path = tmp_path / "demo-agent"
    assert target_path.exists()
    assert result["project_name"] == "demo-agent"
    assert result["project_path"] == str(target_path.resolve())
    assert (target_path / "artifacts" / "logs").exists()

    # Runtime/cache data should not be copied from the template source.
    assert not (target_path / ".git").exists()
    assert not (target_path / "agent_memory.json").exists()
    assert "pip install -e ./cli -e './engine[dev]'" in result["next_steps"]
    assert "ag-refresh --workspace ." in result["next_steps"]
    assert "ag-engine" not in result["next_steps"]


def test_init_agent_repo_full_mode_writes_profile(tmp_path: Path) -> None:
    """Initialize with full mode and verify profile-related outputs.

    Args:
        tmp_path: Temporary directory managed by pytest.
    """

    module = _load_skill_module()

    result = module.init_agent_repo(
        "full-agent",
        str(tmp_path),
        mode="full",
        llm_provider="openai",
        enable_mcp=True,
        enable_swarm=False,
        sandbox_runtime="microsandbox",
        init_git=False,
    )

    target_path = tmp_path / "full-agent"
    assert target_path.exists()
    assert result["mode"] == "full"

    env_text = (target_path / ".env").read_text(encoding="utf-8")
    assert "MCP_ENABLED=true" in env_text
    assert "SANDBOX_TYPE=microsandbox" in env_text
    assert "OPENAI_BASE_URL=https://api.openai.com/v1" in env_text

    runtime_profile = (target_path / ".context" / "agent_runtime_profile.md")
    report_file = (target_path / "artifacts" / "logs" / "agent_repo_init_report.md")
    assert runtime_profile.exists()
    assert report_file.exists()
    assert "Swarm workflow preference: `False`" in runtime_profile.read_text(
        encoding="utf-8"
    )


def test_init_agent_repo_rejects_invalid_project_name(tmp_path: Path) -> None:
    """Reject project names that contain unsupported characters.

    Args:
        tmp_path: Temporary directory managed by pytest.
    """

    module = _load_skill_module()

    with pytest.raises(ValueError):
        module.init_agent_repo("invalid project name", str(tmp_path))


def test_init_agent_repo_rejects_destination_inside_template_repo() -> None:
    """Reject destination roots that point inside the template repository."""

    module = _load_skill_module()

    template_root = Path(__file__).resolve().parents[1]
    with pytest.raises(ValueError):
        module.init_agent_repo("nested-project", str(template_root))


def test_portable_script_runs_with_template_override(tmp_path: Path) -> None:
    """Run portable init script against a synthetic template root.

    Args:
        tmp_path: Temporary directory managed by pytest.
    """

    template_root = tmp_path / "template"
    destination_root = tmp_path / "out"
    template_root.mkdir(parents=True, exist_ok=True)
    destination_root.mkdir(parents=True, exist_ok=True)

    (template_root / "pyproject.toml").write_text("[project]\nname='test'", encoding="utf-8")
    (template_root / ".env.example").write_text("# sample env\n", encoding="utf-8")
    (template_root / "antigravity_engine").mkdir(parents=True, exist_ok=True)
    (template_root / "antigravity_engine" / "agent.py").write_text("print('ok')\n", encoding="utf-8")

    script_path = (
        Path(__file__).resolve().parents[2]
        / "skills"
        / "agent-repo-init"
        / "scripts"
        / "init_project.py"
    )
    completed = subprocess.run(
        [
            sys.executable,
            str(script_path),
            "--project-name",
            "portable-demo",
            "--destination-root",
            str(destination_root),
            "--mode",
            "full",
            "--template-root",
            str(template_root),
            "--llm-provider",
            "openai",
            "--enable-mcp",
            "--disable-swarm",
        ],
        check=True,
        capture_output=True,
        text=True,
    )

    payload = json.loads(completed.stdout)
    project_path = Path(payload["project_path"])
    assert payload["mode"] == "full"
    assert project_path.exists()
    assert (project_path / "mission.md").exists()
    assert (project_path / ".context" / "agent_runtime_profile.md").exists()
    assert "pip install -e ./cli -e './engine[dev]'" in payload["next_steps"]
    assert "ag-refresh --workspace ." in payload["next_steps"]
    assert "ag-engine" not in payload["next_steps"]
