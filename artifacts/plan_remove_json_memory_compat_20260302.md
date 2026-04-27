# Plan: Remove JSON Memory Compatibility (2026-03-02)

## Objective
Drop legacy JSON compatibility from memory subsystem and keep markdown-only memory.

## Steps
1. Remove JSON load/save branches from `src/memory.py`.
2. Remove JSON payload fallback parsing from markdown loader.
3. Update tests that currently assert legacy JSON support.
4. Run full test suite.
