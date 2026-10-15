# Change: Select local knowledge by committed code version

## Why
A single current.json pointer follows the most recently refreshed branch. After
checkout, asking can therefore read another branch's knowledge, and refresh can
regenerate a version already saved locally.

## What Changes
- Retain publication identity alongside each local generation and discover
  complete older generations without publication receipts.
- Reuse compatible exact-commit generations; incremental updates clone the
  nearest usable ancestor rather than a sibling branch's latest generation.
- Pin exact or ancestor knowledge for asks, allow uncommitted edits, and supply
  current-source changes with freshness notices. Reject unrelated history or a
  checkout during an answer. Ask does not publish pointers or refresh knowledge.
- Align doctor diagnostics and document the committed-code behavior.
- Keep legacy flat-layout behavior, force-full, and interrupted recovery.

## Impact
- Affected capability: knowledge-hub.
- Affected code: storage, versions, refresh lifecycle/selection, incremental
  cloning, ask, CLI diagnostics, and regression tests.
- Public baseline packages, remote storage, and CI publishing are excluded.
