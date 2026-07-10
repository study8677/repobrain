"""Tests for the Claude plugin CLI and engine install hook."""

from __future__ import annotations

import subprocess
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
from types import ModuleType


REPO_ROOT = Path(__file__).resolve().parents[2]


def _load_hook_module() -> ModuleType:
    hook_path = REPO_ROOT / "hooks" / "install_engine.py"
    spec = spec_from_file_location("install_engine_hook", hook_path)
    if spec is None or spec.loader is None:
        raise RuntimeError("Failed to load hook module")
    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _write_plugin_packages(
    plugin_root: Path,
    *,
    engine_version: str = "0.2.1",
    cli_version: str = "2.0.1",
) -> tuple[Path, Path]:
    engine_dir = plugin_root / "engine"
    cli_dir = plugin_root / "cli"
    engine_dir.mkdir(parents=True)
    cli_dir.mkdir(parents=True)
    (engine_dir / "pyproject.toml").write_text(
        f'[project]\nname = "repobrain-engine"\nversion = "{engine_version}"\n',
        encoding="utf-8",
    )
    (cli_dir / "pyproject.toml").write_text(
        f'[project]\nname = "repobrain-cli"\nversion = "{cli_version}"\n',
        encoding="utf-8",
    )
    return engine_dir, cli_dir


def _patch_path_helpers(hook, monkeypatch) -> None:
    monkeypatch.setattr(hook, "prepend_path", lambda path: None)
    monkeypatch.setattr(hook, "user_scripts_bin", lambda: None)


def test_read_project_version(tmp_path: Path) -> None:
    hook = _load_hook_module()
    engine_dir, _ = _write_plugin_packages(tmp_path / "plugin")

    assert hook.read_project_version(engine_dir) == "0.2.1"


def test_get_installed_engine_version_parses_rb_mcp_version(monkeypatch) -> None:
    hook = _load_hook_module()
    monkeypatch.setattr(hook.shutil, "which", lambda cmd: "/tmp/rb-mcp")
    monkeypatch.setattr(
        hook.subprocess,
        "run",
        lambda *args, **kwargs: subprocess.CompletedProcess(
            args=args[0], returncode=0, stdout="rb-mcp 0.2.1\n", stderr=""
        ),
    )

    assert hook.get_installed_engine_version() == "0.2.1"


def test_get_installed_cli_version_parses_rb_version(monkeypatch) -> None:
    hook = _load_hook_module()
    monkeypatch.setattr(hook.shutil, "which", lambda cmd: "/tmp/rb")
    monkeypatch.setattr(
        hook.subprocess,
        "run",
        lambda *args, **kwargs: subprocess.CompletedProcess(
            args=args[0], returncode=0, stdout="rb v2.0.1\n", stderr=""
        ),
    )

    assert hook.get_installed_cli_version() == "2.0.1"


def test_installation_is_current_requires_versions_and_commands(monkeypatch) -> None:
    hook = _load_hook_module()
    monkeypatch.setattr(hook, "required_commands_available", lambda: True)
    assert hook.installation_is_current("0.2.1", "0.2.1", "2.0.1", "2.0.1") is True
    assert hook.installation_is_current("0.2.0", "0.2.1", "2.0.1", "2.0.1") is False
    assert hook.installation_is_current("0.2.1", "0.2.1", None, "2.0.1") is False

    monkeypatch.setattr(hook, "required_commands_available", lambda: False)
    assert hook.installation_is_current("0.2.1", "0.2.1", "2.0.1", "2.0.1") is False


def test_old_engine_install_triggers_pipx_upgrade_and_cli_injection(
    tmp_path: Path, monkeypatch
) -> None:
    hook = _load_hook_module()
    plugin_root = tmp_path / "plugin"
    engine_dir, cli_dir = _write_plugin_packages(plugin_root)
    calls: list[list[str]] = []
    commands = {"rb-mcp"}
    versions = {"engine": "0.2.0", "cli": None}

    def fake_has(command: str) -> bool:
        return command == "pipx" or command in commands

    def fake_pipx(args: list[str]) -> int:
        calls.append(args)
        if args[0] == "install":
            commands.update({"rb-ask", "rb-refresh", "rb-mcp"})
            versions["engine"] = "0.2.1"
        elif args[0] == "inject":
            commands.add("rb")
            versions["cli"] = "2.0.1"
        return 0

    monkeypatch.setenv("CLAUDE_PLUGIN_ROOT", str(plugin_root))
    _patch_path_helpers(hook, monkeypatch)
    monkeypatch.setattr(hook, "has", fake_has)
    monkeypatch.setattr(hook, "get_installed_engine_version", lambda: versions["engine"])
    monkeypatch.setattr(hook, "get_installed_cli_version", lambda: versions["cli"])
    monkeypatch.setattr(hook, "ensure_pipx", lambda: True)
    monkeypatch.setattr(hook, "pipx", fake_pipx)

    assert hook.main() == 0
    assert ["install", "--force", str(engine_dir)] in calls
    assert [
        "inject",
        "--force",
        "--include-apps",
        "repobrain-engine",
        str(cli_dir),
    ] in calls


def test_missing_commands_use_fresh_pipx_install_path(tmp_path: Path, monkeypatch) -> None:
    hook = _load_hook_module()
    plugin_root = tmp_path / "plugin"
    engine_dir, cli_dir = _write_plugin_packages(plugin_root)
    calls: list[list[str]] = []
    commands: set[str] = set()
    versions = {"engine": None, "cli": None}

    def fake_has(command: str) -> bool:
        return command == "pipx" or command in commands

    def fake_pipx(args: list[str]) -> int:
        calls.append(args)
        if args[0] == "install":
            commands.update({"rb-ask", "rb-refresh", "rb-mcp"})
            versions["engine"] = "0.2.1"
        elif args[0] == "inject":
            commands.add("rb")
            versions["cli"] = "2.0.1"
        return 0

    monkeypatch.setenv("CLAUDE_PLUGIN_ROOT", str(plugin_root))
    _patch_path_helpers(hook, monkeypatch)
    monkeypatch.setattr(hook, "has", fake_has)
    monkeypatch.setattr(hook, "get_installed_engine_version", lambda: versions["engine"])
    monkeypatch.setattr(hook, "get_installed_cli_version", lambda: versions["cli"])
    monkeypatch.setattr(hook, "ensure_pipx", lambda: True)
    monkeypatch.setattr(hook, "pipx", fake_pipx)

    assert hook.main() == 0
    assert calls == [
        ["ensurepath"],
        ["install", "--force", str(engine_dir)],
        [
            "inject",
            "--force",
            "--include-apps",
            "repobrain-engine",
            str(cli_dir),
        ],
    ]


def test_matching_complete_install_skips_work(tmp_path: Path, monkeypatch) -> None:
    hook = _load_hook_module()
    plugin_root = tmp_path / "plugin"
    _write_plugin_packages(plugin_root)
    calls: list[list[str]] = []

    monkeypatch.setenv("CLAUDE_PLUGIN_ROOT", str(plugin_root))
    _patch_path_helpers(hook, monkeypatch)
    monkeypatch.setattr(
        hook,
        "has",
        lambda command: command in {"rb", "rb-ask", "rb-refresh", "rb-mcp"},
    )
    monkeypatch.setattr(hook, "get_installed_engine_version", lambda: "0.2.1")
    monkeypatch.setattr(hook, "get_installed_cli_version", lambda: "2.0.1")
    monkeypatch.setattr(hook, "pipx", lambda args: calls.append(args) or 0)

    assert hook.main() == 0
    assert calls == []


def test_matching_engine_but_missing_cli_repairs_install(tmp_path: Path, monkeypatch) -> None:
    hook = _load_hook_module()
    plugin_root = tmp_path / "plugin"
    _write_plugin_packages(plugin_root)
    commands = {"rb-ask", "rb-refresh", "rb-mcp"}
    versions = {"engine": "0.2.1", "cli": None}

    def fake_has(command: str) -> bool:
        return command == "pipx" or command in commands

    def fake_pipx(args: list[str]) -> int:
        if args[0] == "inject":
            commands.add("rb")
            versions["cli"] = "2.0.1"
        return 0

    monkeypatch.setenv("CLAUDE_PLUGIN_ROOT", str(plugin_root))
    _patch_path_helpers(hook, monkeypatch)
    monkeypatch.setattr(hook, "has", fake_has)
    monkeypatch.setattr(hook, "get_installed_engine_version", lambda: versions["engine"])
    monkeypatch.setattr(hook, "get_installed_cli_version", lambda: versions["cli"])
    monkeypatch.setattr(hook, "ensure_pipx", lambda: True)
    monkeypatch.setattr(hook, "pipx", fake_pipx)

    assert hook.main() == 0
    assert "rb" in commands


def test_pipx_unavailable_falls_back_to_pip_user_upgrade(
    tmp_path: Path, monkeypatch
) -> None:
    hook = _load_hook_module()
    plugin_root = tmp_path / "plugin"
    engine_dir, cli_dir = _write_plugin_packages(plugin_root)
    run_calls: list[list[str]] = []
    commands = {"rb-mcp"}
    versions = {"engine": "0.2.0", "cli": None}

    monkeypatch.setenv("CLAUDE_PLUGIN_ROOT", str(plugin_root))
    _patch_path_helpers(hook, monkeypatch)
    monkeypatch.setattr(hook, "has", lambda command: command in commands)
    monkeypatch.setattr(hook, "get_installed_engine_version", lambda: versions["engine"])
    monkeypatch.setattr(hook, "get_installed_cli_version", lambda: versions["cli"])
    monkeypatch.setattr(hook, "ensure_pipx", lambda: False)

    def fake_run(args: list[str]) -> int:
        run_calls.append(args)
        commands.update({"rb", "rb-ask", "rb-refresh", "rb-mcp"})
        versions.update({"engine": "0.2.1", "cli": "2.0.1"})
        return 0

    monkeypatch.setattr(hook, "run", fake_run)

    assert hook.main() == 0
    py = hook.sys.executable or ("python" if hook.has("python") else "python3")
    assert run_calls == [
        [
            py,
            "-m",
            "pip",
            "install",
            "--user",
            "--upgrade",
            "--quiet",
            str(engine_dir),
            str(cli_dir),
        ]
    ]


def test_failed_cli_injection_falls_back_to_pip_user(
    tmp_path: Path, monkeypatch
) -> None:
    hook = _load_hook_module()
    plugin_root = tmp_path / "plugin"
    _write_plugin_packages(plugin_root)
    commands: set[str] = set()
    run_calls: list[list[str]] = []
    versions = {"engine": None, "cli": None}

    def fake_has(command: str) -> bool:
        return command == "pipx" or command in commands

    def fake_pipx(args: list[str]) -> int:
        if args[0] == "install":
            commands.update({"rb-ask", "rb-refresh", "rb-mcp"})
            versions["engine"] = "0.2.1"
            return 0
        if args[0] == "inject":
            return 1
        return 0

    def fake_run(args: list[str]) -> int:
        run_calls.append(args)
        commands.add("rb")
        versions.update({"engine": "0.2.1", "cli": "2.0.1"})
        return 0

    monkeypatch.setenv("CLAUDE_PLUGIN_ROOT", str(plugin_root))
    _patch_path_helpers(hook, monkeypatch)
    monkeypatch.setattr(hook, "has", fake_has)
    monkeypatch.setattr(hook, "get_installed_engine_version", lambda: versions["engine"])
    monkeypatch.setattr(hook, "get_installed_cli_version", lambda: versions["cli"])
    monkeypatch.setattr(hook, "ensure_pipx", lambda: True)
    monkeypatch.setattr(hook, "pipx", fake_pipx)
    monkeypatch.setattr(hook, "run", fake_run)

    assert hook.main() == 0
    assert any(call[:4] == [hook.sys.executable, "-m", "pip", "install"] for call in run_calls)


def test_install_failure_returns_nonzero_and_prints_manual_commands(
    tmp_path: Path, monkeypatch, capsys
) -> None:
    hook = _load_hook_module()
    plugin_root = tmp_path / "plugin"
    engine_dir, cli_dir = _write_plugin_packages(plugin_root)

    monkeypatch.setenv("CLAUDE_PLUGIN_ROOT", str(plugin_root))
    _patch_path_helpers(hook, monkeypatch)
    monkeypatch.setattr(hook, "has", lambda command: False)
    monkeypatch.setattr(hook, "get_installed_engine_version", lambda: None)
    monkeypatch.setattr(hook, "get_installed_cli_version", lambda: None)
    monkeypatch.setattr(hook, "ensure_pipx", lambda: False)
    monkeypatch.setattr(hook, "run", lambda args: 1)

    assert hook.main() == 1
    err = capsys.readouterr().err
    assert "AUTO-INSTALL FAILED" in err
    assert f'pipx install --force "{engine_dir}"' in err
    assert (
        f'pipx inject --force --include-apps repobrain-engine "{cli_dir}"' in err
    )


def test_stale_versions_after_pipx_do_not_report_success(
    tmp_path: Path, monkeypatch
) -> None:
    hook = _load_hook_module()
    plugin_root = tmp_path / "plugin"
    _write_plugin_packages(plugin_root)
    commands = {"rb", "rb-ask", "rb-refresh", "rb-mcp"}
    fallback_calls: list[list[str]] = []

    monkeypatch.setenv("CLAUDE_PLUGIN_ROOT", str(plugin_root))
    _patch_path_helpers(hook, monkeypatch)
    monkeypatch.setattr(
        hook,
        "has",
        lambda command: command == "pipx" or command in commands,
    )
    monkeypatch.setattr(hook, "get_installed_engine_version", lambda: "0.2.0")
    monkeypatch.setattr(hook, "get_installed_cli_version", lambda: "2.0.0")
    monkeypatch.setattr(hook, "ensure_pipx", lambda: True)
    monkeypatch.setattr(hook, "pipx", lambda args: 0)
    monkeypatch.setattr(
        hook,
        "run",
        lambda args: fallback_calls.append(args) or 1,
    )

    assert hook.main() == 1
    assert any("pip" in call for call in fallback_calls)
