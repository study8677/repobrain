# Plan: knowledge-layer workspace confinement fix

1. Verify vulnerability still exists in `engine/antigravity_engine/skills/knowledge-layer/tools.py` by checking path resolution and pipeline calls.
2. Implement minimal fix to constrain resolved workspace paths to the trusted project root.
3. Add/adjust tests to cover rejecting out-of-scope workspace paths.
4. Run targeted tests and capture output in `artifacts/logs/`.
