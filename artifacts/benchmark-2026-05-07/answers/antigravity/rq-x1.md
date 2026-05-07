LLM answering timed out. Here are the most relevant knowledge snippets:

**Question:** Trace what happens when a user calls `requests.get(url)` end-to-end: from module-level helper to actual socket I/O.

## Project Conventions (relevant excerpts)

## Project structure overview
- `src/requests/` — main package source, using a **src layout**.
- `tests/` — pytest-based test suite and doctests.
- `docs/` — documentation build sources.
- `ext/` — excluded from linting; likely auxiliary/vendor material.
- Root config lives in `pyproject.toml`, `Makefile`, and GitHub workflow files.

## Testing approach
- Test runner: **pytest**
- Configured in `pyproject.toml` with:
  - `testpaths = ["tests"]`
  - `--doctest-modules`
  - doctest whitespace/ellipsis normalization
- Make targets:
  - `make test` — local test run
  - `make ci` — CI-oriented run with JUnit XML
  - `make coverage` — coverage + XML report
- Test dependencies include `pytest-cov`, `pytest-mock`, `pytest-xdist`, `httpbin`, `pytest-httpbin`, and `trustme`.

## Code style observations
- Formatting/linting is centered on **Ruff** with:
  - pycodestyle (`E`, `W`)
  - pyflakes (`F`)
  - isort (`I`)
  - pyupgrade (`UP`)
  - debugger checks (`T10`)
- Formatting is **Black-compatible**:
  - double quotes
  - spaces for indentation
- Notable lint choices:
  - `E501` ignored, so strict line-length enforcement is relaxed.
  - Some per-file ignores for import/export compatibility modules.
- Imports are organized with `requests` marked as first-party.
- Type checking uses **Pyright** in **strict** mode for `src/requests`.

## Primary language and frameworks
- **Language:** Python 3.10+
- **Packaging/build:** `setuptools` via `pyproject.toml` (`setuptools.build_meta`), with legacy `setup.py` support still present.
- **Core tools:** `pytest`, `pyright`, `ruff`, `Make`, `tox`, GitHub Actions.
- **Library type:** Stable Python HTTP client library (`requests`).

## Code Structure (relevant excerpts)

## .github/  (6 files, 200 lines)
- `.github/CODE_OF_CONDUCT.md` [Markdown] (6 lines)
- `.github/CONTRIBUTING.md` [Markdown] (54 lines)
- `.github/FUNDING.yml` [YAML] (1 lines)
- `.github/ISSUE_TEMPLATE.md` [Markdown] (28 lines)
- `.github/SECURITY.md` [Markdown] (84 lines)
- `.github/dependabot.yml` [YAML] (27 lines)

## tests/  (13 files, 4909 lines)
- `tests/__init__.py` [Python] (14 lines)
- `tests/compat.py` [Python] (23 lines)
- `tests/conftest.py` [Python] (58 lines)
- `tests/test_adapters.py` [Python] (8 lines)
- `tests/test_help.py` [Python] (27 lines)
- `tests/test_hooks.py` [Python] (22 lines)
- `tests/test_lowlevel.py` [Python] (428 lines)
- `tests/test_packages.py` [Python] (13 lines)
- `tests/test_requests.py` [Python] (3053 lines)
- `tests/test_structures.py` [Python] (91 lines)
- `tests/test_testserver.py` [Python] (165 lines)
- `tests/test_utils.py` [Python] (990 lines)
- `tests/utils.py` [Python] (17 lines)

## src/requests/  (19 files, 6371 lines)
- `src/requests/__init__.py` [Python] (219 lines)
- `src/requests/__version__.py` [Python] (14 lines)
- `src/requests/_internal_utils.py` [Python] (51 lines)
- `src/requests/_types.py` [Python] (176 lines)
- `src/requests/adapters.py` [Python] (750 lines)
- `src/requests/api.py` [Python] (180 lines)
- `src/requests/auth.py` [Python] (354 lines)
- `src/requests/certs.py` [Python] (18 lines)
- `src/requests/compat.py` [Python] (113 lines)
- `src/requests/cookies.py` [Python] (625 lines)
- `src/requests/exceptions.py` [Python] (162 lines)
- `src/requests/help.py` [Python] (134 lines)
- `src/requests/hooks.py` [Python] (48 lines)
- `src/requests/models.py` [Python] (1180 lines)
- `src/requests/packages.py` [Python] (23 lines)
- `src/requests/sessions.py` [Python] (913 lines)
- `src/requests/status_codes.py` [Python] (128 lines)
- `src/requests/structures.py` [Python] (130 lines)
- `src/requests/utils.py` [Python] (1153 lines)

## Knowledge Graph (relevant excerpts)

# Knowledge Graph

- workspace: /private/tmp/ag-bench/requests
- created_at_utc: 2026-05-07T03:15:48.185272+00:00
- nodes: 456
- edges: 634

## Sample Nodes
- workspace: requests
- language: Python
- language: Markdown
- language: YAML
- language: TOML
- language: HTML
- language: CSS
- framework: Python (pyproject.toml)
- framework: Python (setup.py)
- framework: Make
- framework: GitHub Actions
- framework: Tox
- directory: docs
- directory: ext
- directory: src
- directory: tests
- other: .git-blame-ignore-revs
- other: LICENSE
- code: .pre-commit-config.yaml
- other: Makefile

## Sample Edges
- workspace:/private/tmp/ag-bench/requests --uses_language--> language:python
- workspace:/private/tmp/ag-bench/requests --uses_language--> language:markdown
- workspace:/private/tmp/ag-bench/requests --uses_language--> language:yaml
- workspace:/private/tmp/ag-bench/requests --uses_language--> language:toml
- workspace:/private/tmp/ag-bench/requests --uses_language--> language:html
- workspace:/private/tmp/ag-bench/requests --uses_language--> language:css
- workspace:/private/tmp/ag-bench/requests --uses_framework--> framework:python_(pyproject.toml)
- workspace:/private/tmp/ag-bench/requests --uses_framework--> framework:python_(setup.py)
- workspace:/private/tmp/ag-bench/requests --uses_framework--> framework:make
- workspace:/private/tmp/ag-bench/requests --uses_framework--> framework:github_actions
- workspace:/private/tmp/ag-bench/requests --uses_framework--> framework:tox
- workspace:/private/tmp/ag-bench/requests --contains--> dir:docs
- workspace:/private/tmp/ag-bench/requests --contains--> dir:ext
- workspace:/private/tmp/ag-bench/requests --contains--> dir:src
- workspace:/private/tmp/ag-bench/requests --contains--> dir:tests
- workspace:/private/tmp/ag-bench/requests --contains--> file:.git-blame-ignore-revs
- workspace:/private/tmp/ag-bench/requests --contains--> file:LICENSE
- workspace:/private/tmp/ag-bench/requests --contains--> file:.pre-commit-config.yaml
- workspace:/private/tmp/ag-bench/requests --contains--> file:Makefile
- workspace:/private/tmp/ag-bench/requests --contains--> file:HISTORY.md

