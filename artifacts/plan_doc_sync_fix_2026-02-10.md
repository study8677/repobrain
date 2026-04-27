# Plan: EN/ZH Documentation Sync Fix (2026-02-10)

## Objective
Align English and Chinese docs with actual implementation and remove misleading instructions/examples.

## Files updated
- docs/en/QUICK_START.md
- docs/zh/QUICK_START.md
- docs/en/SWARM_PROTOCOL.md
- docs/zh/SWARM_PROTOCOL.md
- docs/en/MCP_INTEGRATION.md
- docs/zh/MCP_INTEGRATION.md
- docs/en/ZERO_CONFIG.md
- docs/zh/ZERO_CONFIG.md
- docs/en/ROADMAP.md
- docs/en/SANDBOX.md
- docs/es/QUICK_START.md
- docs/es/SWARM_PROTOCOL.md
- docs/es/MCP_INTEGRATION.md
- docs/es/ZERO_CONFIG.md
- README.md
- README_CN.md
- README_ES.md

## Validation
- Keyword checks for removed inaccurate API names/usages.
- Test baseline:
  - ./antigravity_workspace_template_venv/bin/python -m pytest -q
