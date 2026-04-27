# Plan: Merge PR #30 and Add Tests

## Goal
Merge GitHub PR #30 into the local workspace and add regression tests for the new skill-based graph and knowledge-layer behavior.

## Steps
1. Inspect PR #30 commits and determine the safest local integration method.
2. Fetch and apply the PR changes without disturbing unrelated local untracked files.
3. Add failing tests for:
   - `graph-retrieval.query_graph`
   - `knowledge-layer.refresh_filesystem` and `ask_filesystem`
   - `skills.loader.load_skills` caching behavior
4. Run targeted tests, fix integration issues, and summarize remaining risks.
