#!/usr/bin/env python3
"""SessionStart hook: ensure the RepoBrain CLI and engine are on PATH.

Single cross-platform installer for Claude Code's plugin SessionStart hook.
Idempotent and silent on the happy path. All output goes to stderr (stdout
on a hook is interpreted as injected context).

Strategy:
  1. If all RepoBrain commands are on PATH at the bundled versions, exit 0.
  2. Ensure pipx exists:
       - macOS with Homebrew → `brew install pipx`
       - Otherwise → `python -m pip install --user pipx`
     Both paths require no sudo.
  3. `pipx ensurepath` and prepend the pipx bin dir to PATH for the current
     process so the next `pipx install` finds the freshly placed shim.
  4. `pipx install --force <plugin_root>/engine`, then inject the bundled CLI
     into the same environment with `--include-apps`.
  5. If pipx remains unavailable, fall back to `pip install --user --upgrade`.
  6. On total failure, print a clear manual-install message and exit 1.
"""
from __future__ import annotations

import os
import re
import shutil
import subprocess
import sys
from pathlib import Path


ENGINE_PACKAGE = "repobrain-engine"
REQUIRED_COMMANDS = ("rb", "rb-ask", "rb-refresh", "rb-mcp")


def log(msg: str) -> None:
    print(msg, file=sys.stderr, flush=True)


def has(cmd: str) -> bool:
    return shutil.which(cmd) is not None


def user_scripts_bin() -> Path | None:
    """Resolve site.USER_BASE bin/Scripts dir from the current Python."""
    try:
        import site
        base = Path(site.USER_BASE)
    except Exception:
        return None
    candidate = base / ("Scripts" if os.name == "nt" else "bin")
    return candidate if candidate.is_dir() else None


def prepend_path(p: Path) -> None:
    if not p.is_dir():
        return
    cur = os.environ.get("PATH", "")
    parts = cur.split(os.pathsep)
    if str(p) in parts:
        return
    os.environ["PATH"] = str(p) + os.pathsep + cur


def run(cmd: list[str]) -> int:
    try:
        return subprocess.run(cmd, stderr=sys.stderr, stdout=sys.stderr).returncode
    except FileNotFoundError:
        return 127


def ensure_pipx() -> bool:
    """Install pipx if missing. Returns True if pipx is available afterwards."""
    if has("pipx"):
        return True

    # macOS with Homebrew: cleanest path, no sudo.
    if sys.platform == "darwin" and has("brew"):
        log("[repobrain] Installing pipx via Homebrew...")
        run(["brew", "install", "pipx"])

    # Cross-platform fallback: pip install --user pipx.
    if not has("pipx"):
        py = sys.executable or ("python" if has("python") else "python3")
        log(f"[repobrain] Installing pipx via pip --user ({py})...")
        run([py, "-m", "pip", "install", "--user", "--quiet", "pipx"])
        # User-base scripts/bin needs to be on PATH for `pipx` to be findable.
        ub = user_scripts_bin()
        if ub:
            prepend_path(ub)

    return has("pipx") or _has_pipx_module()


def _has_pipx_module() -> bool:
    """Some installs put pipx on PATH only after `ensurepath`. Check for the
    module so we can invoke it via `python -m pipx` as a fallback."""
    try:
        subprocess.run(
            [sys.executable or "python", "-m", "pipx", "--version"],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        return True
    except Exception:
        return False


def pipx(args: list[str]) -> int:
    if has("pipx"):
        return run(["pipx", *args])
    return run([sys.executable or "python", "-m", "pipx", *args])


def read_project_version(package_dir: Path) -> str | None:
    """Read a bundled package version from its ``pyproject.toml``."""
    try:
        text = (package_dir / "pyproject.toml").read_text(encoding="utf-8")
    except OSError:
        return None
    match = re.search(r'^version\s*=\s*"([^"]+)"', text, flags=re.MULTILINE)
    return match.group(1) if match else None


def get_installed_engine_version() -> str | None:
    """Return the installed rb-mcp engine version, if it can be queried."""
    rb_mcp = shutil.which("rb-mcp")
    if rb_mcp is None:
        return None
    try:
        completed = subprocess.run(
            [rb_mcp, "--version"],
            check=False,
            capture_output=True,
            text=True,
            timeout=15,
        )
    except Exception:
        return None
    if completed.returncode != 0:
        return None
    output = (completed.stdout or completed.stderr).strip()
    match = re.search(r"(\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.]+)?)", output)
    return match.group(1) if match else None


def get_installed_cli_version() -> str | None:
    """Return the installed ``rb`` CLI version, if it can be queried."""
    rb = shutil.which("rb")
    if rb is None:
        return None
    try:
        completed = subprocess.run(
            [rb, "version"],
            check=False,
            capture_output=True,
            text=True,
            timeout=15,
        )
    except Exception:
        return None
    if completed.returncode != 0:
        return None
    output = (completed.stdout or completed.stderr).strip()
    match = re.search(r"(\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.]+)?)", output)
    return match.group(1) if match else None


def required_commands_available() -> bool:
    """Return whether every command promised by the plugin is on PATH."""
    return all(has(command) for command in REQUIRED_COMMANDS)


def installation_is_current(
    installed_engine: str | None,
    expected_engine: str | None,
    installed_cli: str | None,
    expected_cli: str | None,
) -> bool:
    """Return whether versions and all public commands match the bundle."""
    return (
        installed_engine == expected_engine
        and installed_cli == expected_cli
        and None not in (installed_engine, expected_engine, installed_cli, expected_cli)
        and required_commands_available()
    )


def installed_bundle_is_current(
    expected_engine: str | None,
    expected_cli: str | None,
) -> bool:
    """Query PATH and confirm the installed bundle matches expected versions."""
    return installation_is_current(
        get_installed_engine_version(),
        expected_engine,
        get_installed_cli_version(),
        expected_cli,
    )


def main() -> int:
    plugin_root = os.environ.get("CLAUDE_PLUGIN_ROOT") or str(Path(__file__).resolve().parent.parent)
    engine_path = Path(plugin_root) / "engine"
    cli_path = Path(plugin_root) / "cli"
    engine_dir = str(engine_path)
    cli_dir = str(cli_path)

    # Claude Code starts hooks with a minimal PATH that often excludes user bin
    # dirs, so an already-installed rb-mcp can look "missing". Prepend the
    # common user-level shim locations BEFORE the fast-path check so a previous
    # successful install short-circuits cleanly.
    configured_pipx_bin = os.environ.get("PIPX_BIN_DIR", "").strip()
    if configured_pipx_bin:
        prepend_path(Path(configured_pipx_bin).expanduser())
    prepend_path(Path.home() / ".local" / "bin")
    ub = user_scripts_bin()
    if ub:
        prepend_path(ub)
    if os.name == "nt":
        prepend_path(Path.home() / "AppData" / "Roaming" / "Python" / "Scripts")

    target_engine_version = read_project_version(engine_path)
    target_cli_version = read_project_version(cli_path)
    current_engine_version = get_installed_engine_version()
    current_cli_version = get_installed_cli_version()
    if installation_is_current(
        current_engine_version, target_engine_version, current_cli_version, target_cli_version
    ):
        return 0

    if has("rb-mcp") or has("rb"):
        log(
            "[repobrain] Existing install is incomplete or stale "
            f"(engine {current_engine_version or 'missing'} -> "
            f"{target_engine_version or 'unknown'}, CLI {current_cli_version or 'missing'} -> "
            f"{target_cli_version or 'unknown'}). "
            "Attempting upgrade..."
        )
    else:
        log("[repobrain] RepoBrain commands not found. Attempting auto-install...")

    if ensure_pipx():
        # After install or ensurepath, ~/.local/bin (POSIX) or %APPDATA%/Python/Scripts (Windows)
        # may host the pipx shims. Prepend so the install runs and verifies in one process.
        pipx(["ensurepath"])
        local_bin = Path.home() / (".local/bin" if os.name != "nt" else "AppData/Roaming/Python/Scripts")
        prepend_path(local_bin)
        ub = user_scripts_bin()
        if ub:
            prepend_path(ub)

        engine_installed = pipx(["install", "--force", engine_dir]) == 0
        cli_injected = False
        if engine_installed:
            cli_injected = (
                pipx(
                    [
                        "inject",
                        "--force",
                        "--include-apps",
                        ENGINE_PACKAGE,
                        cli_dir,
                    ]
                )
                == 0
            )
        if engine_installed and cli_injected and installed_bundle_is_current(
            target_engine_version, target_cli_version
        ):
            log("[repobrain] Installed/upgraded CLI and engine via pipx.")
            log("[repobrain] Next: run /repobrain:rb-setup, then /repobrain:rb-refresh.")
            log("[repobrain] If the MCP tool is not connected in this session, restart Claude Code once.")
            return 0

    # Fallback: pip --user
    py = sys.executable or ("python" if has("python") else "python3")
    log(f"[repobrain] Falling back to pip --user ({py})...")
    if run([py, "-m", "pip", "install", "--user", "--upgrade", "--quiet", engine_dir, cli_dir]) == 0:
        ub = user_scripts_bin()
        if ub:
            prepend_path(ub)
        if installed_bundle_is_current(target_engine_version, target_cli_version):
            log(f"[repobrain] Installed via pip --user. To persist on future shells, add this dir to PATH: {ub}")
            log("[repobrain] Next: run /repobrain:rb-setup, then /repobrain:rb-refresh.")
            log("[repobrain] If the MCP tool is not connected in this session, restart Claude Code once.")
            return 0

    log("")
    log("[repobrain] AUTO-INSTALL FAILED. Run ONE of these manually:")
    log("")
    log("  Option A (recommended, requires pipx):")
    log("    macOS:   brew install pipx && pipx ensurepath")
    log("    Linux:   python3 -m pip install --user pipx && python3 -m pipx ensurepath")
    log("    Windows: python -m pip install --user pipx && python -m pipx ensurepath")
    log(f"    pipx install --force \"{engine_dir}\"")
    log(f"    pipx inject --force --include-apps {ENGINE_PACKAGE} \"{cli_dir}\"")
    log("")
    log("  Option B (no pipx):")
    log(f"    python -m pip install --user --upgrade \"{engine_dir}\" \"{cli_dir}\"")
    log("")
    log("Then restart your Claude Code session.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
