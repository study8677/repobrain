# Plan: graph refresh export + retrieval fallback

1. Inspect refresh pipeline and graph retrieval skill behavior.
2. Add normalized graph JSONL export in refresh stage after knowledge_graph.json write.
3. Add fallback in graph retrieval skill to load knowledge_graph.json when JSONL is absent.
4. Add tests validating fallback and refresh-only graph query behavior.
5. Run focused tests and capture log artifact.
