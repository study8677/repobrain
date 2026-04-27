## 1. Command Contract
- [x] 1.1 Replace CLI runtime calls to `ag-hub` and `ag-engine` with canonical
      engine entrypoints.
- [x] 1.2 Implement a shared engine dispatcher for `python -m antigravity_engine`
      and `python -m antigravity_engine.hub`.
- [x] 1.3 Remove repo-managed references to unsupported command names from
      runtime messages and inline guidance.

## 2. Runtime Surfaces
- [x] 2.1 Update Docker to start a supported knowledge-hub runtime command.
- [x] 2.2 Update repo-init next steps and generated onboarding guidance to use
      supported commands.
- [x] 2.3 Add or update tests covering direct engine invocation paths and clear
      missing-install error messages.

## 3. CI and Developer Workflow
- [x] 3.1 Fix CLI package test execution so `cli/tests/` runs in a clean
      install context.
- [x] 3.2 Extend GitHub Actions to run both `engine/tests/` and `cli/tests/`.
- [x] 3.3 Add command-smoke verification for supported entrypoints instead of
      verifying only `ag version`.

## 4. Documentation
- [x] 4.1 Rewrite README install/run sections to reflect the split-package
      workflow and canonical commands.
- [x] 4.2 Rewrite AGENTS.md setup/test guidance so every documented command maps
      to a real package or file.
- [x] 4.3 Update any remaining knowledge-hub help text that still says
      `ag-hub` or `ag-engine`.
