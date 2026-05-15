from __future__ import annotations

import json
import pathlib
import re
import sys


ROOT = pathlib.Path(__file__).resolve().parents[1]


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    sys.exit(1)


def read_text(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def read_json(path: str) -> dict:
    return json.loads(read_text(path))


def require_contains(path: str, needle: str) -> None:
    if needle not in read_text(path):
        fail(f"{path} must contain {needle!r}")


def require_absent(path: str, pattern: str) -> None:
    text = read_text(path)
    if re.search(pattern, text):
        fail(f"{path} still matches legacy pattern {pattern!r}")


def check_plugin_versions() -> None:
    claude_plugin = read_json(".claude-plugin/plugin.json")
    claude_marketplace = read_json(".claude-plugin/marketplace.json")
    codex_plugin = read_json(".codex-plugin/plugin.json")
    engine_pyproject = read_text("engine/pyproject.toml")
    engine_init = read_text("engine/antigravity_engine/__init__.py")
    engine_version_match = re.search(
        r'^version = "([^"]+)"$', engine_pyproject, re.MULTILINE
    )
    init_version_match = re.search(
        r'^__version__ = "([^"]+)"$', engine_init, re.MULTILINE
    )
    if not engine_version_match or not init_version_match:
        fail("engine version must be declared in pyproject.toml and __init__.py")

    versions = {
        "engine_pyproject": engine_version_match.group(1),
        "engine_init": init_version_match.group(1),
        "claude_plugin": claude_plugin["version"],
        "claude_marketplace": claude_marketplace["plugins"][0]["version"],
        "codex_plugin": codex_plugin["version"],
    }
    if len(set(versions.values())) != 1:
        fail(f"plugin versions are not aligned: {versions}")


def check_python_contract() -> None:
    for path in ("engine/pyproject.toml", "cli/pyproject.toml"):
        require_contains(path, 'requires-python = ">=3.10"')

    for path in (
        "docs/en/QUICK_START.md",
        "docs/zh/QUICK_START.md",
        "docs/es/QUICK_START.md",
    ):
        require_absent(path, r"Python 3\.9\+")
        require_contains(path, "Python 3.10+")


def check_llm_configuration_docs() -> None:
    quick_start_paths = (
        "docs/en/QUICK_START.md",
        "docs/zh/QUICK_START.md",
        "docs/es/QUICK_START.md",
    )
    for path in quick_start_paths:
        require_contains(path, "OPENAI_BASE_URL=")
        require_contains(path, "OPENAI_API_KEY=")
        require_absent(path, r"GOOGLE_API_KEY=.*your")
        require_absent(path, r"GEMINI_MODEL_NAME=gemini-2\.0-flash-exp")

    require_contains("engine/.env.example", "OPENAI_BASE_URL=")
    require_contains("engine/.env.example", "Gemini-compatible configuration")
    require_contains("docker-compose.yml", "OPENAI_BASE_URL=")
    require_absent("docker-compose.yml", r"\./\.context:/app/\.context")


def check_positioning_contract() -> None:
    require_contains(
        "README.md",
        "Cross-IDE repository knowledge engine for grounded codebase Q&A.",
    )
    require_contains("README.md", "## Support Matrix")
    require_contains(
        "docs/en/PHILOSOPHY.md",
        "Antigravity is that repository knowledge layer.",
    )
    require_contains("mission.md", "portable, evidence-grounded knowledge layer")
    require_contains("VERSIONING.md", "Plugin metadata must stay aligned")


def check_workflows() -> None:
    test_workflow = read_text(".github/workflows/test.yml")
    hygiene_workflow = read_text(".github/workflows/repo-hygiene.yml")
    combined = test_workflow + "\n" + hygiene_workflow
    require_contains(".github/workflows/test.yml", "actions/checkout@v5")
    require_contains(".github/workflows/test.yml", "actions/setup-python@v6")
    require_contains(
        ".github/workflows/test.yml",
        'python-version: ["3.10", "3.11", "3.12"]',
    )
    if "python scripts/check_repo_contract.py" not in hygiene_workflow:
        fail("repo hygiene workflow must run scripts/check_repo_contract.py")
    if "actions/checkout@v3" in combined or "actions/setup-python@v4" in combined:
        fail("workflows still use old checkout/setup-python actions")


def check_governance_assets() -> None:
    required_paths = (
        "CONTRIBUTING.md",
        "SECURITY.md",
        ".github/dependabot.yml",
        ".github/ISSUE_TEMPLATE/bug_report.yml",
        ".github/ISSUE_TEMPLATE/feature_request.yml",
        ".github/ISSUE_TEMPLATE/config.yml",
    )
    missing = [path for path in required_paths if not (ROOT / path).exists()]
    if missing:
        fail(f"missing governance assets: {', '.join(missing)}")


def main() -> None:
    check_plugin_versions()
    check_python_contract()
    check_llm_configuration_docs()
    check_positioning_contract()
    check_workflows()
    check_governance_assets()
    print("Repository contract check passed.")


if __name__ == "__main__":
    main()
