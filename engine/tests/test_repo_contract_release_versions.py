"""Tests for release-version checks in the repository contract."""

from __future__ import annotations

from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
from types import ModuleType

import pytest


REPO_ROOT = Path(__file__).resolve().parents[2]


def _load_contract_module() -> ModuleType:
    script = REPO_ROOT / "scripts" / "check_repo_contract.py"
    spec = spec_from_file_location("repo_contract", script)
    if spec is None or spec.loader is None:
        raise RuntimeError("Failed to load repository contract checker")
    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _configure_release_state(
    contract,
    monkeypatch,
    *,
    current_engine: str = "0.3.1",
    current_cli: str = "2.0.1",
    tagged_engine: str = "0.3.0",
    tagged_cli: str = "2.0.0",
    engine_changes: str = "engine/repobrain_engine/runtime.py",
    cli_changes: str = "cli/src/rb_cli/cli.py",
) -> None:
    current_files = {
        "engine/pyproject.toml": f'[project]\nversion = "{current_engine}"\n',
        "cli/pyproject.toml": f'[project]\nversion = "{current_cli}"\n',
    }
    monkeypatch.setattr(contract, "read_text", lambda path: current_files[path])

    def fake_git_output(*args: str) -> str | None:
        if args[:4] == ("describe", "--tags", "--abbrev=0", "--match"):
            return "v0.3.0"
        if args[:2] == ("show", "v0.3.0:engine/pyproject.toml"):
            return f'[project]\nversion = "{tagged_engine}"\n'
        if args[:2] == ("show", "v0.3.0:cli/pyproject.toml"):
            return f'[project]\nversion = "{tagged_cli}"\n'
        if args[:3] == ("diff", "--name-only", "v0.3.0"):
            requested_paths = set(args[4:])
            if "engine/repobrain_engine" in requested_paths:
                return engine_changes
            if "cli/src" in requested_paths:
                return cli_changes
        raise AssertionError(f"unexpected git query: {args}")

    monkeypatch.setattr(contract, "git_output", fake_git_output)


def test_release_check_accepts_runtime_changes_with_version_bumps(monkeypatch) -> None:
    contract = _load_contract_module()
    _configure_release_state(contract, monkeypatch)

    contract.check_release_versions()


def test_release_check_rejects_engine_change_without_bump(monkeypatch) -> None:
    contract = _load_contract_module()
    _configure_release_state(contract, monkeypatch, current_engine="0.3.0")

    with pytest.raises(SystemExit):
        contract.check_release_versions()


def test_release_check_rejects_cli_downgrade(monkeypatch) -> None:
    contract = _load_contract_module()
    _configure_release_state(contract, monkeypatch, current_cli="1.9.9")

    with pytest.raises(SystemExit):
        contract.check_release_versions()


def test_release_check_ignores_non_runtime_changes(monkeypatch) -> None:
    contract = _load_contract_module()
    _configure_release_state(
        contract,
        monkeypatch,
        current_engine="0.3.0",
        current_cli="2.0.0",
        engine_changes="",
        cli_changes="",
    )

    contract.check_release_versions()
