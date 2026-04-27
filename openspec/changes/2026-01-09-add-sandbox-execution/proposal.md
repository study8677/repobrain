# Proposal: Sandbox Code Execution Environment

**Date:** 2026-01-09  
**Status:** Proposed  
**Related Issue:** #9 — Sandbox Environment Dilemma  
**Phase:** 9A (Enterprise Core - Sandbox)

## Problem Statement

The project currently lacks safe code execution capabilities:
- Agent-generated code runs directly on the host with full privileges
- No isolation for potentially untrusted operations
- Risk of filesystem/network/resource abuse
- Blocks enterprise adoption for security-sensitive use cases

However, forcing Docker as a mandatory dependency would break the Zero-Config philosophy that defines this project.

## Proposed Solution

Introduce an **execution environment abstraction** using the Strategy Pattern:

- **Default:** `LocalSandbox` (subprocess) — preserves Zero-Config
- **Opt-in:** `DockerSandbox` — strong isolation for production
- **Future:** `E2BSandbox` / cloud providers — multi-tenant enterprise

The agent remains agnostic; runtime selection happens via configuration (`SANDBOX_TYPE`).

## Why This Approach

### Preserves Zero-Config
- `git clone` + `pip install` + `python src/agent.py` still works immediately
- No daemon requirements, no image pulls by default
- Docker becomes optional for users who need stronger isolation

### Enables Progressive Security
- Local mode: fast iteration, acceptable for trusted/local development
- Docker mode: production-grade isolation for CI/CD and enterprise
- Cloud mode: future multi-tenant support (Phase 9 vision)

### Clean Architecture
- Single interface (`CodeSandbox` Protocol)
- Factory pattern (`get_sandbox()`) resolves implementation
- New runtimes don't require agent changes

## Key Design Decisions

### 1. Interface-First Design
```python
class CodeSandbox(Protocol):
    def execute(code: str, language: str, timeout: int) -> ExecutionResult
```

### 2. Structured Results
```python
@dataclass
class ExecutionResult:
    stdout: str
    stderr: str
    exit_code: int
    duration: float
    meta: dict  # runtime, limits, blocked_imports, etc.
```

### 3. Configuration-Driven
```bash
SANDBOX_TYPE=local|docker|e2b
SANDBOX_TIMEOUT_SEC=30
SANDBOX_BLOCK_DANGEROUS_IMPORTS=true
SANDBOX_STORE_CODE=on_error|always|never
```

## Implementation Scope

### MVP (Phase 1) — Local Sandbox
- Subprocess execution with timeout
- Output truncation (prevent spam)
- Working directory isolation
- Basic AST import blocking (optional)
- Tool: `src/tools/execution_tool.py` → `run_python_code()`

### Phase 2 — Docker Sandbox
- Container-based isolation
- Network isolation (`--network=none`)
- Resource limits (CPU/mem)
- Filesystem read-only mounts
- Graceful fallback if daemon unavailable

### Phase 3 — Cloud Sandbox
- E2B/K8s integration
- Credential/quota management
- Audit trail persistence
- Multi-region support

## Security Model

### LocalSandbox (Default)
**Risk:** Code runs on host with agent's privileges  
**Mitigations:**
- Strict timeout + process kill
- Output size limits
- AST-based import blocking (os, subprocess, shutil, socket)
- Isolated temp working directory
- **Not RCE-proof** — documented limitation

### DockerSandbox (Opt-in)
**Risk:** Container escape (low but not zero)  
**Mitigations:**
- `--network=none` by default
- Drop capabilities (`--cap-drop=ALL`)
- Read-only filesystem + minimal mounts
- CPU/memory limits
- Non-root user inside container

### Future Cloud Sandbox
**Risk:** Credential leaks, quota abuse  
**Mitigations:**
- API key rotation
- Per-execution quotas
- Full audit logging
- Regional isolation

## Observability

Every execution produces:
- Structured `ExecutionResult` with meta (runtime, duration, limits)
- Optional artifact: `artifacts/executions/<timestamp>_<hash>.json`
- Tool result stored in `agent_memory.json` (existing flow)
- Configurable code storage policy (privacy/audit balance)

## Integration Points

### With Agent
- Agent calls tool `run_python_code(code, timeout)`
- Tool uses `get_sandbox()` → returns configured instance
- Result returned as compact string (existing tool pattern)

### With Memory System
- Execution metadata stored in tool message
- Optional separate artifact for audit
- No changes to `memory.py` required

### With Tools Discovery
- New tool auto-discovered from `src/tools/execution_tool.py`
- No changes to discovery mechanism

## Testing Strategy

### Unit Tests
- LocalSandbox: timeout, exit codes, output truncation
- DockerSandbox: container lifecycle, network isolation
- Factory: configuration resolution
- AST blocking: dangerous imports detection

### Integration Tests
- Agent → tool → sandbox → result flow
- Error handling (missing Docker daemon)
- Memory persistence of execution results

### Smoke Tests
- Agent generates simple script → executes → returns result
- Agent generates multi-step pipeline → orchestrates execution

## Success Metrics

- ✅ Zero-Config preserved (local mode works without extra deps)
- ✅ Docker mode functional with hardening controls
- ✅ <100ms overhead for local execution
- ✅ <2s overhead for Docker execution (warm container)
- ✅ Test coverage >80% for sandbox module
- ✅ Documentation complete (setup, security model, configuration)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| LocalSandbox not secure enough | Users run untrusted code unsafely | Clear docs, AST blocking, recommend Docker for production |
| Docker adoption friction | Users skip sandbox entirely | Make local default good enough, document Docker benefits |
| E2B/cloud costs | Enterprise users face unexpected bills | Clear quota docs, cost estimation tools |
| Performance regression | Execution too slow for iteration | Benchmark and optimize, cache warm containers |

## Timeline

- **Week 1-2:** MVP LocalSandbox + tests + tool integration
- **Week 3:** Hardening (AST blocking, artifacts, docs)
- **Week 4:** DockerSandbox implementation
- **Week 5:** CI/CD integration, documentation
- **Future:** E2B/cloud (depends on community demand)

## Alternatives Considered

### 1. Docker-Only (No Local Mode)
**Rejected:** Breaks Zero-Config, high friction for newcomers

### 2. Local-Only (No Abstraction)
**Rejected:** Blocks enterprise adoption, no upgrade path

### 3. PyPy Sandbox / RestrictedPython
**Rejected:** Limited language support, maintenance burden, still not RCE-proof

### 4. WASM Runtime
**Interesting:** Future consideration for browser-compatible execution

## Open Questions

1. Should AST import blocking be default-on or opt-in?
   - **Recommendation:** Opt-in with clear warning when disabled
   
2. How to handle code that needs specific packages (numpy, pandas)?
   - **Recommendation:** Document requirement to install in venv for local mode, pre-build Docker image with common libs

3. Should we support languages beyond Python in MVP?
   - **Recommendation:** No, add via explicit allowlist later

4. Artifact storage: always, on-error, or opt-in?
   - **Recommendation:** `on_error` by default, configurable via env

## Next Steps

1. ✅ Formalize OpenSpec change (this proposal)
2. Create tasks.md with implementation checklist
3. Define spec scenarios in specs/sandbox/spec.md
4. Get community feedback (GitHub Discussion/Issue)
5. Begin Phase 1 implementation

## References

- Original proposal: [docs/en/SANDBOX_CODE_EXEC_ENV_PROPOSAL.md](../../../docs/en/SANDBOX_CODE_EXEC_ENV_PROPOSAL.md)
- Roadmap Phase 9A: [docs/en/ROADMAP.md](../../../docs/en/ROADMAP.md#phase-9a-sandbox-environment-)
- Issue #9: Sandbox Environment Dilemma
