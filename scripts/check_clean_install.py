#!/usr/bin/env python3
"""Exercise RepoBrain's real pipx fresh-install and upgrade paths.

This is intentionally an integration check, not a mocked unit test.  Each
scenario gets an isolated ``PIPX_HOME``, ``PIPX_BIN_DIR``, and ``HOME`` so it
cannot reuse RepoBrain packages installed on the developer machine.
"""

from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HOOK = ROOT / "hooks" / "install_engine.py"
REQUIRED_COMMANDS = ("rb", "rb-ask", "rb-refresh", "rb-mcp")


def project_version(package_dir: Path) -> str:
    """Read the x.y.z version from a package ``pyproject.toml``."""
    text = (package_dir / "pyproject.toml").read_text(encoding="utf-8")
    match = re.search(r'^version = "(\d+\.\d+\.\d+)"$', text, re.MULTILINE)
    if match is None:
        raise RuntimeError(f"No numeric project version in {package_dir / 'pyproject.toml'}")
    return match.group(1)


def run(
    command: list[str],
    *,
    env: dict[str, str],
    cwd: Path = ROOT,
    expect: int = 0,
) -> subprocess.CompletedProcess[str]:
    """Run a command and raise with captured diagnostics on unexpected exit."""
    completed = subprocess.run(
        command,
        cwd=str(cwd),
        env=env,
        capture_output=True,
        text=True,
        check=False,
        timeout=900,
    )
    if completed.returncode != expect:
        rendered = " ".join(command)
        raise RuntimeError(
            f"Command exited {completed.returncode}, expected {expect}: {rendered}\n"
            f"stdout:\n{completed.stdout}\nstderr:\n{completed.stderr}"
        )
    return completed


def isolated_environment(root: Path) -> tuple[dict[str, str], Path, Path]:
    """Return environment, bin directory, and diagnostic workspace paths."""
    pipx_home = root / "pipx-home"
    bin_dir = root / "bin"
    home = root / "home"
    workspace = root / "workspace"
    for path in (pipx_home, bin_dir, home, workspace):
        path.mkdir(parents=True, exist_ok=True)

    env = os.environ.copy()
    env.update(
        {
            "PIPX_HOME": str(pipx_home),
            "PIPX_BIN_DIR": str(bin_dir),
            "PIPX_DEFAULT_PYTHON": sys.executable,
            "PIP_CACHE_DIR": str(
                Path(tempfile.gettempdir()) / "repobrain-clean-install-pip-cache"
            ),
            "HOME": str(home),
            "CLAUDE_PLUGIN_ROOT": str(ROOT),
            "PATH": str(bin_dir) + os.pathsep + env.get("PATH", ""),
        }
    )
    return env, bin_dir, workspace


def command_path(bin_dir: Path, command: str) -> Path:
    """Resolve a pipx command, including Windows executable suffixes."""
    candidates = [bin_dir / command]
    if os.name == "nt":
        candidates.extend([bin_dir / f"{command}.exe", bin_dir / f"{command}.bat"])
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise RuntimeError(f"Missing expected command {command!r} under {bin_dir}")


def verify_current_install(env: dict[str, str], bin_dir: Path, workspace: Path) -> None:
    """Verify public commands, versions, and an env-only doctor invocation."""
    commands = {name: command_path(bin_dir, name) for name in REQUIRED_COMMANDS}
    engine_version = project_version(ROOT / "engine")
    cli_version = project_version(ROOT / "cli")

    rb_version = run([str(commands["rb"]), "version"], env=env).stdout
    if f"rb v{cli_version}" not in rb_version:
        raise RuntimeError(f"rb reported the wrong version: {rb_version!r}")

    mcp_version = run([str(commands["rb-mcp"]), "--version"], env=env).stdout
    if engine_version not in mcp_version:
        raise RuntimeError(f"rb-mcp reported the wrong version: {mcp_version!r}")

    for name in ("rb-ask", "rb-refresh", "rb-mcp"):
        run([str(commands[name]), "--help"], env=env)
    run([str(commands["rb"]), "doctor", "--help"], env=env)

    doctor_env = env.copy()
    doctor_env["RB_HOST_RUNNER"] = "codex"
    run(
        [str(commands["rb"]), "doctor", "--workspace", str(workspace)],
        env=doctor_env,
    )


def extract_tag(tag: str, target: Path, env: dict[str, str]) -> None:
    """Export a release tag without mutating the current worktree."""
    archive = target.parent / f"{tag}.tar"
    run(
        ["git", "archive", "--format=tar", f"--output={archive}", tag],
        env=env,
    )
    target.mkdir(parents=True, exist_ok=True)
    with tarfile.open(archive) as bundle:
        bundle.extractall(target)


def run_fresh_install() -> None:
    """Install the current plugin bundle into a completely empty pipx home."""
    with tempfile.TemporaryDirectory(prefix="repobrain-fresh-") as tmp:
        env, bin_dir, workspace = isolated_environment(Path(tmp))
        run([sys.executable, str(HOOK)], env=env)
        verify_current_install(env, bin_dir, workspace)
        # The second run exercises the exact-version idempotent fast path.
        second_run = run([sys.executable, str(HOOK)], env=env)
        if second_run.stdout or second_run.stderr:
            raise RuntimeError(
                "second hook run was not the silent idempotent fast path:\n"
                f"stdout:\n{second_run.stdout}\nstderr:\n{second_run.stderr}"
            )
    print("clean install: ok", flush=True)


def run_upgrade(tag: str) -> None:
    """Install an engine-only release, then repair/upgrade through today's hook."""
    with tempfile.TemporaryDirectory(prefix="repobrain-upgrade-") as tmp:
        temp_root = Path(tmp)
        env, bin_dir, workspace = isolated_environment(temp_root)
        old_root = temp_root / "old-release"
        extract_tag(tag, old_root, env)

        run(["pipx", "install", "--force", str(old_root / "engine")], env=env)
        old_engine = project_version(old_root / "engine")
        old_mcp = command_path(bin_dir, "rb-mcp")
        old_version_output = run([str(old_mcp), "--version"], env=env).stdout
        if old_engine not in old_version_output:
            raise RuntimeError(f"upgrade fixture reported the wrong version: {old_version_output!r}")
        if (bin_dir / "rb").exists():
            raise RuntimeError("upgrade fixture unexpectedly already exposes the rb CLI")

        run([sys.executable, str(HOOK)], env=env)
        verify_current_install(env, bin_dir, workspace)
    print(f"upgrade from {tag}: ok", flush=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--mode",
        choices=("all", "fresh", "upgrade"),
        default="all",
        help="Integration scenario to execute.",
    )
    parser.add_argument("--from-tag", default="v0.3.0", help="Upgrade baseline tag.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if shutil.which("pipx") is None:
        print("pipx is required: python -m pip install pipx", file=sys.stderr)
        return 2
    try:
        if args.mode in {"all", "fresh"}:
            run_fresh_install()
        if args.mode in {"all", "upgrade"}:
            run_upgrade(args.from_tag)
    except (OSError, RuntimeError, subprocess.TimeoutExpired, tarfile.TarError) as exc:
        print(f"clean-install check failed: {exc}", file=sys.stderr)
        return 1
    print("RepoBrain clean-install gate passed.", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
