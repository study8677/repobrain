# Spec: Sandbox Code Execution

**Capability:** sandbox  
**Status:** Proposed  
**Version:** 1.0.0  
**Last Updated:** 2026-01-09

## Purpose

Provide safe, configurable code execution environments for agent-generated scripts while preserving the project's Zero-Config philosophy.

## Requirements

### R1: Zero-Config Default
The system MUST work immediately after `git clone` + `pip install` without requiring Docker or any daemon setup.

### R2: Progressive Security
Users MUST be able to opt into stronger isolation (Docker, cloud) via configuration without code changes.

### R3: Consistent Interface
All execution environments MUST return results with identical structure (`ExecutionResult`) regardless of runtime.

### R4: Timeout Enforcement
All execution environments MUST respect timeout limits and kill runaway processes.

### R5: Output Management
Execution results MUST truncate stdout/stderr to prevent resource exhaustion.

### R6: Error Transparency
Failures (timeout, syntax error, blocked import, runtime error) MUST produce clear, actionable error messages.

---

## Scenarios

### Scenario 1: Local Execution (Default)

**Given** the user has cloned the repo and installed dependencies  
**When** the agent calls `run_python_code("print('Hello')")`  
**Then** the code executes in a subprocess  
**And** the result contains `stdout="Hello\n"`, `exit_code=0`, `duration < 1s`  
**And** no Docker daemon is required

**Acceptance Criteria:**
- ✓ Execution completes successfully
- ✓ Output matches expected value
- ✓ No external dependencies required
- ✓ Duration measured and returned

---

### Scenario 2: Docker Execution (Opt-In)

**Given** the user sets `SANDBOX_TYPE=docker`  
**And** Docker daemon is running  
**When** the agent calls `run_python_code("import os; print(os.uname())")`  
**Then** the code executes inside a container  
**And** network access is disabled by default  
**And** the result contains isolated execution metadata  

**Acceptance Criteria:**
- ✓ Code runs in container
- ✓ Network isolated (`--network=none`)
- ✓ Result structure identical to local mode
- ✓ Container cleaned up after execution

---

### Scenario 3: Timeout Enforcement

**Given** any execution environment (local or docker)  
**When** the agent executes code with an infinite loop:
```python
while True:
    pass
```
**And** timeout is set to 5 seconds  
**Then** execution terminates after 5 seconds  
**And** `exit_code=-1` or timeout-specific code  
**And** `stderr` contains "timed out" message  

**Acceptance Criteria:**
- ✓ Process killed after timeout
- ✓ No zombie processes left
- ✓ Clear timeout error message
- ✓ Duration ≈ timeout value

---

### Scenario 4: Output Truncation

**Given** any execution environment  
**When** the agent executes code that prints >10KB of output (configurable):
```python
for i in range(100000):
    print(f"Line {i}: " + "X" * 100)
```
**Then** output is truncated to configured limit (default 10KB)  
**And** `meta.truncated=true`  
**And** result includes "... (output truncated)" message  

**Acceptance Criteria:**
- ✓ Output size limited to configuration
- ✓ Truncation clearly indicated
- ✓ No memory exhaustion
- ✓ Metadata flag set correctly

---

### Scenario 5: Non-Zero Exit Code

**Given** any execution environment  
**When** the agent executes code that raises an exception:
```python
raise ValueError("Something went wrong")
```
**Then** `exit_code=1`  
**And** `stderr` contains the traceback  
**And** the tool returns formatted error message  

**Acceptance Criteria:**
- ✓ Exit code captured correctly
- ✓ Stderr contains full traceback
- ✓ Error formatted for agent consumption
- ✓ Execution marked as failed

---

### Scenario 6: Dangerous Import Blocking (Optional)

**Given** `SANDBOX_BLOCK_DANGEROUS_IMPORTS=true`  
**When** the agent attempts to execute:
```python
import subprocess
subprocess.run(["rm", "-rf", "/"])
```
**Then** execution is blocked before running  
**And** error message indicates blocked import: `subprocess`  
**And** suggested imports are logged  

**Acceptance Criteria:**
- ✓ Code analyzed with AST before execution
- ✓ Dangerous import detected
- ✓ Execution prevented
- ✓ Clear security error message
- ✓ Configurable blocklist (os, subprocess, shutil, socket)

---

### Scenario 7: Missing Docker Daemon

**Given** `SANDBOX_TYPE=docker`  
**And** Docker daemon is NOT running  
**When** the agent attempts to execute code  
**Then** system detects missing daemon  
**And** returns clear error: "Docker daemon not available"  
**And** suggests fallback: "Set SANDBOX_TYPE=local or start Docker daemon"  

**Acceptance Criteria:**
- ✓ Graceful error handling (no crash)
- ✓ Clear diagnostic message
- ✓ Actionable suggestions provided
- ✓ Optional: automatic fallback to local mode

---

### Scenario 8: Working Directory Isolation

**Given** local execution mode  
**When** the agent executes code that creates a file:
```python
with open("test.txt", "w") as f:
    f.write("data")
```
**Then** the file is created in an isolated temp directory  
**And** NOT in the project root  
**And** temp directory is cleaned up after execution  

**Acceptance Criteria:**
- ✓ Isolated working directory created
- ✓ File operations contained
- ✓ Project files not affected
- ✓ Cleanup after execution

---

### Scenario 9: Execution Artifact Storage

**Given** `SANDBOX_STORE_CODE=on_error`  
**When** the agent executes code that fails  
**Then** an artifact is saved to `artifacts/executions/<timestamp>_<hash>.json`  
**And** artifact contains: code, result, timestamp, metadata  

**Given** `SANDBOX_STORE_CODE=always`  
**When** any code executes (success or failure)  
**Then** artifact is always saved  

**Given** `SANDBOX_STORE_CODE=never`  
**When** any code executes  
**Then** no artifact is saved (privacy mode)  

**Acceptance Criteria:**
- ✓ Policy respected correctly
- ✓ Artifact format is valid JSON
- ✓ Contains all relevant data
- ✓ Secure storage (no credentials in artifacts)

---

### Scenario 10: Multi-Language Support (Future)

**Status:** Not implemented in MVP  
**Given** `SANDBOX_SUPPORTED_LANGUAGES=python,javascript`  
**When** the agent calls `run_code("console.log('Hi')", language="javascript")`  
**Then** code executes in Node.js runtime  
**And** result structure is identical to Python execution  

**Note:** Initial implementation is Python-only. This scenario documents future extensibility.

---

## Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `SANDBOX_TYPE` | `local` | Runtime: `local`, `docker`, `e2b` |
| `SANDBOX_TIMEOUT_SEC` | `30` | Maximum execution time (seconds) |
| `SANDBOX_MAX_OUTPUT_KB` | `10` | Output truncation limit (KB) |
| `SANDBOX_BLOCK_DANGEROUS_IMPORTS` | `false` | Enable AST import blocking |
| `SANDBOX_STORE_CODE` | `on_error` | Artifact policy: `always`, `on_error`, `never` |
| `DOCKER_IMAGE` | `antigravity-sandbox:latest` | Docker runner image |
| `DOCKER_NETWORK_ENABLED` | `false` | Allow container network access |
| `DOCKER_CPU_LIMIT` | `0.5` | CPU limit (cores) |
| `DOCKER_MEMORY_LIMIT` | `256m` | Memory limit |

---

## Data Contracts

### ExecutionResult

```python
@dataclass
class ExecutionResult:
    stdout: str           # Standard output (truncated if needed)
    stderr: str           # Standard error
    exit_code: int        # Exit code (0 = success, -1 = timeout, 1 = error)
    duration: float       # Execution time in seconds
    meta: dict           # Additional metadata
        # meta.runtime: str           # "local" | "docker" | "e2b"
        # meta.truncated: bool        # Output truncation flag
        # meta.timed_out: bool        # Timeout flag
        # meta.blocked_imports: list  # AST-blocked modules (if any)
        # meta.resource_limits: dict  # Applied limits
```

### Tool Interface

```python
def run_python_code(code: str, timeout: int = 30) -> str:
    """
    Execute Python code using the configured sandbox.
    
    Args:
        code: Python source code to execute
        timeout: Maximum execution time (seconds), default from config
        
    Returns:
        Compact string with stdout or formatted error
        
    Raises:
        Never raises; all errors returned as strings
    """
```

---

## Security Model

### LocalSandbox (Default)
- **Threat Model:** Trusted environment, accidental errors
- **Isolation Level:** Process-level (subprocess)
- **Protection:** Timeout, output limits, optional AST blocking
- **Limitations:** NOT secure against malicious code
- **Recommended For:** Development, local testing, trusted code

### DockerSandbox (Opt-In)
- **Threat Model:** Untrusted code, production environments
- **Isolation Level:** Container-level (Docker)
- **Protection:** Network isolation, capability dropping, resource limits, read-only FS
- **Limitations:** Container escape possible (low probability)
- **Recommended For:** CI/CD, production, multi-user systems

### Future Cloud Sandbox
- **Threat Model:** Multi-tenant, enterprise, compliance-required
- **Isolation Level:** VM or cloud-native sandbox (E2B, Firecracker)
- **Protection:** Full virtualization, API quotas, audit logging
- **Limitations:** Latency, cost
- **Recommended For:** Enterprise production, regulated industries

---

## Testing Requirements

All implementations MUST pass:
- Unit tests for each scenario
- Integration tests (agent → tool → sandbox)
- Performance benchmarks (execution overhead <100ms local, <2s docker)
- Security tests (timeout kill, AST blocking, container escape prevention)

---

## Non-Goals

This spec explicitly does NOT cover:
- Multi-language support in MVP (Python-only initially)
- RCE-proof local execution (documented limitation)
- Multi-tenant scheduling (future Phase 9 work)
- Distributed execution orchestration (separate spec)

---

## Change History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-09 | 1.0.0 | Initial spec for sandbox capability |

---

## References

- Architecture Proposal: [docs/en/SANDBOX_CODE_EXEC_ENV_PROPOSALmd](../../../../docs/en/SANDBOX_CODE_EXEC_ENV_PROPOSALmd)
- Roadmap Phase 9A: [docs/en/ROADMAP.md](../../../../docs/en/ROADMAP.md)
- Change Proposal: [proposal.md](../../proposal.md)
- Implementation Tasks: [tasks.md](../../tasks.md)
