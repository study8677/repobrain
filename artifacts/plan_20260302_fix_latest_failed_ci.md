# Plan: Fix Latest Failed GitHub CI (2026-03-02)

## Goal
Pull latest code, identify the latest failing GitHub Actions CI for this repo, implement the minimal safe fix, and verify locally.

## Steps
1. Verify GitHub CLI auth and sync local branch with remote main.
2. Inspect failing checks:
   - Prefer PR checks for current branch via gh-fix-ci script.
   - Fallback to latest failing workflow run at repo level if no PR exists.
3. Reproduce/validate failure locally with targeted tests.
4. Implement minimal patch for root cause.
5. Run relevant tests and save logs under `artifacts/logs/`.
6. Summarize changes and suggest re-checking remote CI.

## Evidence Targets
- CI inspection logs in `artifacts/logs/`.
- Test output logs in `artifacts/logs/`.
