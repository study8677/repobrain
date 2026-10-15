## 1. Implementation
- [x] 1.1 Record and discover completed local knowledge generations.
- [x] 1.2 Select exact versions or ancestor baselines and clone the selected source.
- [x] 1.3 Pin exact/ancestor knowledge, allow uncommitted edits, and supply live
      source context without regenerating knowledge; reject unrelated history.
- [x] 1.4 Align doctor diagnostics and document branch/commit behavior.

## 2. Validation
- [x] 2.1 Exercise real Git branch round trips, rollback, missing/corrupt versions,
      selected-baseline cloning, configuration changes, and recovery.
- [x] 2.2 Run updated engine/CLI regression suites (439 passed after syncing main), targeted live-source
      checks (2 passed), and the repository contract checker (passed).
- [x] 2.3 Validate the updated OpenSpec change with the strict CLI validator.
- [x] 2.4 Run real local Trae acceptance (11 calls, 50 checks), then verify
      branch selection and dirty asks after syncing upstream (4 calls, 16 checks).
