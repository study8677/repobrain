#!/usr/bin/env python3
"""SessionStart hook: ensure `ag-mcp` is on PATH.

Single cross-platform installer for Claude Code's plugin SessionStart hook.
Idempotent and silent on the happy path. All output goes to stderr (stdout
on a hook is interpreted as injected context).

Strategy:
  1. If ag-mcp is already on PATH at the bundled engine version, exit 0.
  2. Ensure pipx exists:
       - macOS with Homebrew → `brew install pipx`
       - Otherwise → `python -m pip install --user pipx`
     Both paths require no sudo.
  3. `pipx ensurepath` and prepend the pipx bin dir to PATH for the current
     process so the next `pipx install` finds the freshly placed shim.
  4. `pipx install --force <plugin_root>/engine`.
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
        log("[antigravity] Installing pipx via Homebrew...")
        run(["brew", "install", "pipx"])

    # Cross-platform fallback: pip install --user pipx.
    if not has("pipx"):
        py = sys.executable or ("python" if has("python") else "python3")
        log(f"[antigravity] Installing pipx via pip --user ({py})...")
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


def read_project_version(engine_dir: Path) -> str | None:
    """Read the plugin-bundled engine version from pyproject.toml."""
    try:
        text = (engine_dir / "pyproject.toml").read_text(encoding="utf-8")
    except OSError:
        return None
    match = re.search(r'^version\s*=\s*"([^"]+)"', text, flags=re.MULTILINE)
    return match.group(1) if match else None


def get_installed_engine_version() -> str | None:
    """Return the installed ag-mcp engine version, if it can be queried."""
    ag_mcp = shutil.which("ag-mcp")
    if ag_mcp is None:
        return None
    try:
        completed = subprocess.run(
            [ag_mcp, "--version"],
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


def needs_engine_install_or_upgrade(installed: str | None, expected: str | None) -> bool:
    """Return True unless the installed engine is exactly the bundled version."""
    return not (installed and expected and installed == expected)


def main() -> int:
    plugin_root = os.environ.get("CLAUDE_PLUGIN_ROOT") or str(Path(__file__).resolve().parent.parent)
    engine_path = Path(plugin_root) / "engine"
    cli_path = Path(plugin_root) / "cli"
    engine_dir = str(engine_path)
    cli_dir = str(cli_path)

    # Claude Code starts hooks with a minimal PATH that often excludes user bin
    # dirs, so an already-installed ag-mcp can look "missing". Prepend the
    # common user-level shim locations BEFORE the fast-path check so a previous
    # successful install short-circuits cleanly.
    prepend_path(Path.home() / ".local" / "bin")
    ub = user_scripts_bin()
    if ub:
        prepend_path(ub)
    if os.name == "nt":
        prepend_path(Path.home() / "AppData" / "Roaming" / "Python" / "Scripts")

    target_version = read_project_version(engine_path)
    current_version = get_installed_engine_version()
    if has("ag-mcp") and not needs_engine_install_or_upgrade(current_version, target_version):
        return 0

    if has("ag-mcp"):
        log(
            "[antigravity] ag-mcp is installed but engine version "
            f"{current_version or 'unknown'} != bundled {target_version or 'unknown'}. "
            "Attempting upgrade..."
        )
    else:
        log("[antigravity] ag-mcp not found. Attempting auto-install...")

    if ensure_pipx():
        # After install or ensurepath, ~/.local/bin (POSIX) or %APPDATA%/Python/Scripts (Windows)
        # may host the pipx shims. Prepend so the install runs and verifies in one process.
        pipx(["ensurepath"])
        local_bin = Path.home() / (".local/bin" if os.name != "nt" else "AppData/Roaming/Python/Scripts")
        prepend_path(local_bin)
        ub = user_scripts_bin()
        if ub:
            prepend_path(ub)

        if pipx(["install", "--force", engine_dir]) == 0 and has("ag-mcp"):
            log("[antigravity] Installed/upgraded via pipx.")
            log("[antigravity] Next: run /antigravity:ag-setup, then /antigravity:ag-refresh.")
            log("[antigravity] If the MCP tool is not connected in this session, restart Claude Code once.")
            return 0

    # Fallback: pip --user
    py = sys.executable or ("python" if has("python") else "python3")
    log(f"[antigravity] Falling back to pip --user ({py})...")
    if run([py, "-m", "pip", "install", "--user", "--upgrade", "--quiet", engine_dir, cli_dir]) == 0:
        ub = user_scripts_bin()
        if ub:
            prepend_path(ub)
        if has("ag-mcp"):
            log(f"[antigravity] Installed via pip --user. To persist on future shells, add this dir to PATH: {ub}")
            log("[antigravity] Next: run /antigravity:ag-setup, then /antigravity:ag-refresh.")
            log("[antigravity] If the MCP tool is not connected in this session, restart Claude Code once.")
            return 0

    log("")
    log("[antigravity] AUTO-INSTALL FAILED. Run ONE of these manually:")
    log("")
    log("  Option A (recommended, requires pipx):")
    log("    macOS:   brew install pipx && pipx ensurepath")
    log("    Linux:   python3 -m pip install --user pipx && python3 -m pipx ensurepath")
    log("    Windows: python -m pip install --user pipx && python -m pipx ensurepath")
    log(f"    pipx install --force \"{engine_dir}\"")
    log("")
    log("  Option B (no pipx):")
    log(f"    python -m pip install --user --upgrade \"{engine_dir}\" \"{cli_dir}\"")
    log("")
    log("Then restart your Claude Code session.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
