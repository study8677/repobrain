# Implementation Tasks: Sandbox Code Execution

**Change ID:** 2026-01-09-add-sandbox-execution  
**Status:** Planning  
**Owner:** TBD

## Phase 1: MVP LocalSandbox (Priority: High)

### Core Infrastructure
- [ ] Create `src/sandbox/` module structure
  - [ ] `__init__.py` — public exports
  - [ ] `base.py` — Protocol definition + ExecutionResult dataclass
  - [ ] `factory.py` — get_sandbox() implementation
  - [ ] `local.py` — LocalSandbox subprocess implementation

### LocalSandbox Implementation
- [ ] Implement `LocalSandbox.execute()` with:
  - [ ] Subprocess spawning with timeout
  - [ ] Stdout/stderr capture
  - [ ] Exit code handling
  - [ ] Duration tracking
  - [ ] Output truncation (configurable, default 10KB)
  - [ ] Working directory isolation (tempdir)

### Configuration
- [ ] Add environment variables to `.env.example`:
  - [ ] `SANDBOX_TYPE=local` (default)
  - [ ] `SANDBOX_TIMEOUT_SEC=30`
  - [ ] `SANDBOX_MAX_OUTPUT_KB=10`
  - [ ] `SANDBOX_BLOCK_DANGEROUS_IMPORTS=false`
  - [ ] `SANDBOX_STORE_CODE=on_error`

### Tool Integration
- [ ] Create `src/tools/execution_tool.py`
  - [ ] `run_python_code(code: str, timeout: int) -> str`
  - [ ] Factory usage: `get_sandbox()`
  - [ ] Compact output formatting
  - [ ] Error handling with clear messages

### Testing
- [ ] Unit tests for LocalSandbox:
  - [ ] `test_local_sandbox.py`
    - [ ] Test successful execution
    - [ ] Test timeout enforcement
    - [ ] Test non-zero exit code
    - [ ] Test output truncation
    - [ ] Test stderr capture
    - [ ] Test duration measurement
    - [ ] Test working directory isolation

- [ ] Factory tests:
  - [ ] `test_factory.py`
    - [ ] Test default local resolution
    - [ ] Test configuration override
    - [ ] Test invalid mode handling

- [ ] Integration tests:
  - [ ] `test_execution_tool.py`
    - [ ] Test agent → tool → sandbox flow
    - [ ] Test result formatting
    - [ ] Test error messages

### Documentation
- [ ] Update README.md with sandbox feature mention
- [ ] Create `docs/en/SANDBOX.md`:
  - [ ] Overview and motivation
  - [ ] Configuration guide
  - [ ] Security model explanation
  - [ ] Examples (local vs docker)
- [ ] Add docstrings to all sandbox classes/functions

## Phase 2: Hardening (Priority: Medium)

### AST Import Blocking (Optional)
- [ ] Create `src/sandbox/security.py`
  - [ ] `analyze_code(code: str) -> SecurityReport`
  - [ ] AST-based import detection
  - [ ] Configurable blocklist (os, subprocess, shutil, socket, pathlib)
  - [ ] Warning vs blocking mode

- [ ] Integrate into LocalSandbox:
  - [ ] Pre-execution analysis
  - [ ] Clear error messages
  - [ ] Bypass flag for trusted code

- [ ] Tests:
  - [ ] Test dangerous imports detection
  - [ ] Test safe code passes
  - [ ] Test bypass mechanism

### Observability
- [ ] Implement execution artifacts:
  - [ ] Create `artifacts/executions/` directory
  - [ ] Store code + result as JSON
  - [ ] Timestamp + hash naming
  - [ ] Respect `SANDBOX_STORE_CODE` policy

- [ ] Add metadata to ExecutionResult:
  - [ ] `meta.runtime` (local/docker/e2b)
  - [ ] `meta.blocked_imports` (if AST enabled)
  - [ ] `meta.truncated` (bool)
  - [ ] `meta.resource_limits` (timeout, max_output)

### Error Handling
- [ ] Improve error messages:
  - [ ] Timeout → "Code execution timed out after {N}s"
  - [ ] Syntax error → "Python syntax error: {details}"
  - [ ] Blocked import → "Security policy blocked import: {module}"
  - [ ] Runtime error → "Execution failed: {stderr}"

## Phase 3: DockerSandbox (Priority: Medium)
## Phase 1: MVP LocalSandbox (Priority: High)
### Docker Implementation
 [x] Create `src/sandbox/` module structure
   - [x] `__init__.py` — public exports
   - [x] `base.py` — Protocol definition + ExecutionResult dataclass
   - [x] `factory.py` — get_sandbox() implementation
   - [x] `local.py` — LocalSandbox subprocess implementation
  - [ ] Timeout enforcement (container kill)
 [x] Implement `LocalSandbox.execute()` with:
   - [x] Subprocess spawning with timeout
   - [x] Stdout/stderr capture
   - [x] Exit code handling
   - [x] Duration tracking
   - [x] Output truncation (configurable, default 10KB)
   - [x] Working directory isolation (tempdir)
- [ ] Non-root user inside container
 [x] Tool Integration
   - [x] Create `src/tools/execution_tool.py`
   - [x] `run_python_code(code: str, timeout: int) -> str`
   - [x] Factory usage: `get_sandbox()`
   - [x] Compact output formatting
   - [x] Error handling with clear messages
  - [ ] `DOCKER_CPU_LIMIT=0.5`
 [x] Unit tests for LocalSandbox:
   - [x] `test_local_sandbox.py`
     - [x] Test successful execution
     - [x] Test timeout enforcement
     - [x] Test non-zero exit code
     - [x] Test output truncation
     - [x] Test stderr capture
     - [x] Test duration measurement
     - [x] Test working directory isolation
 [x] Factory tests:
   - [x] `test_factory.py`
     - [x] Test default local resolution
     - [x] Test configuration override
     - [ ] Test invalid mode handling
 [x] Integration tests:
   - [x] `test_execution_tool.py`
     - [x] Test agent → tool → sandbox flow
     - [x] Test result formatting
     - [x] Test error messages
    - [ ] Test container cleanup
    - [ ] Test timeout enforcement
    - [x] Test missing daemon handling

- [ ] Integration tests:
  - [x] Test factory resolution to Docker
  - [ ] Test fallback to local if Docker fails

### Documentation
- [ ] Document Docker setup:
  - [ ] Installation instructions
  - [ ] Permissions (docker group)
  - [ ] Image building
  - [ ] Troubleshooting
- [ ] Update security model docs
- [ ] Add examples comparing local vs docker performance

## Phase 4: Cloud/E2B (Priority: Low - Future)

### Future Tasks (Placeholder)
- [ ] Research E2B SDK integration
- [ ] Design credential management
- [ ] Implement quota system
- [ ] Add regional routing
- [ ] Multi-tenant isolation
- [ ] Cost estimation tools
- [ ] Audit logging

## CI/CD Integration

- [ ] Add GitHub Actions workflow:
  - [ ] Run tests for LocalSandbox
  - [ ] Run tests for DockerSandbox (if daemon available)
  - [ ] Security scanning (bandit, safety)
  - [ ] Coverage reporting (target >80%)

- [ ] Update existing workflows:
  - [ ] Include sandbox tests in main test suite

## Spec Validation

- [ ] Verify all scenarios in `specs/sandbox/spec.md`:
  - [ ] Local execution default
  - [ ] Docker opt-in
  - [ ] Timeout enforcement
  - [ ] Output truncation
  - [ ] Error handling
  - [ ] Missing Docker daemon
  - [ ] AST blocking (if enabled)

## Pre-Release Checklist

- [ ] All tests passing (local + docker)
- [ ] Documentation complete and reviewed
- [ ] Security model documented clearly
- [ ] Configuration guide validated
- [ ] Examples tested on fresh clone
- [ ] Performance benchmarks recorded
- [ ] GitHub issue #9 resolved
- [ ] Roadmap Phase 9A marked complete

## Post-Release Tasks

- [ ] Monitor community feedback
- [ ] Create GitHub Discussion for feature
- [ ] Update main README with sandbox highlight
- [ ] Write blog post / tutorial (optional)
- [ ] Consider presentation for project showcase

---

**Notes:**
- Tasks marked with high priority should be completed before announcing the feature
- Medium priority tasks enhance the feature but aren't blockers
- Low priority tasks are future enhancements based on demand
- Each checkbox should link to a PR when implemented
