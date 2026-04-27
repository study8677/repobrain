# Structured Debate Plan

## Task

Evaluate how Antigravity Knowledge Hub should evolve its scanner, memory, and ask-context strategy so `ag ask` can answer concrete project questions instead of guessing from shallow metadata.

## Constraints

- Pure Python scanner
- No vector database or embedding model
- Markdown-first knowledge format
- Multi-language project support
- Backward compatibility for existing `.antigravity/` users

## Steps

1. Read repository agent rules and OpenSpec guidance for proposal-oriented work.
2. Inspect current `knowledge-hub` spec, scanner, and ask pipeline behavior.
3. Produce three distinct architecture options with trade-offs.
4. Score the options on answer quality, language generality, complexity/ROI, and compatibility.
5. Synthesize a final recommendation that can be turned into an OpenSpec change proposal later.
