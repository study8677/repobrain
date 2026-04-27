---
title: "Architecture Proposal: Execution Environment Abstraction (Sandbox)"
status: "RFC (Request for Comments)"
date: "2025-12-25"
context: "Issue #9 — Sandbox Environment Dilemma"
owners:
  - "(Fill in)"
---

# Architecture Proposal: Execution Environment Abstraction (Sandbox)

> Note: This document is a technical proposal (not an implementation). To turn
> it into code in this repo, it is best to formalize it as an OpenSpec change
> (a new capability or an extension to `deployment`/`security`), following
> `openspec/AGENTS.md`.

## Index

- [1. Executive summary](#1-executive-summary)
- [2. Problem and context](#2-problem-and-context)
- [3. Key decision](#3-key-decision)
- [4. Goals and non-goals](#4-goals-and-non-goals)
- [5. Conceptual architecture](#5-conceptual-architecture)
    - [5.1. Class diagram (Strategy + Factory)](#51-class-diagram-strategy--factory)
    - [5.2. Execution flow](#52-execution-flow)
- [6. Technical specification](#6-technical-specification)
    - [6.1. Proposed directory structure](#61-proposed-directory-structure)
    - [6.2. Data contracts](#62-data-contracts)
    - [6.3. Interface (Protocol)](#63-interface-protocol)
    - [6.4. Default implementation: LocalSandbox](#64-default-implementation-localsandbox)
    - [6.5. Factory: configuration resolution](#65-factory-configuration-resolution)
    - [6.6. Opt-in implementation: DockerSandbox](#66-opt-in-implementation-dockersandbox)
    - [6.7. Future implementation: Cloud/E2B](#67-future-implementation-cloude2b)
- [7. Integration with the agent (repo alignment)](#7-integration-with-the-agent-repo-alignment)
- [8. Security model](#8-security-model)
    - [8.1. Risks by mode](#81-risks-by-mode)
    - [8.2. Minimum mitigations for LocalSandbox (MVP)](#82-minimum-mitigations-for-localsandbox-mvp)
    - [8.3. Recommended controls for DockerSandbox](#83-recommended-controls-for-dockersandbox)
- [9. Observability and audit](#9-observability-and-audit)
- [10. Implementation plan (by phases)](#10-implementation-plan-by-phases)

---

## 1. Executive summary

There is tension between:

- The need to run code more **safely** (sandboxing / isolation).
- The template's **Zero-Config** philosophy (lowering friction: "clone and go").

Forcing Docker as a default dependency breaks the initial experience (daemon
installation, permissions, image pulls, etc.).

This proposal rejects the "Docker yes/no" dichotomy and instead recommends an
interface-based architecture (Factory Pattern). This allows the execution
engine to be agnostic to the Agent; the concrete implementation (Local,
Docker, E2B) is chosen via configuration.

## 2. Problem and context

Today this repository:

- Discovers tools locally from `antigravity_engine/tools/*.py` (dynamic loading).
- Can integrate MCP as external tools.
- Does not include a formal "sandbox": running potentially untrusted code is
  an open gap (Issue #9).

This proposal introduces an **execution abstraction** so that:

- The agent/tools do not need to know "where" code runs.
- Users can choose the level of isolation (local fast vs docker secure).

## 3. Key decision

**Default = LocalSandbox (subprocess)** to preserve Zero-Config.

**DockerSandbox = opt-in** for stronger isolation.

This avoids the binary choice by providing one interface and a factory to
select the implementation.

## 4. Goals and non-goals

**Goals**

- Provide a stable `CodeSandbox.execute(...)` interface with typed results.
- Allow runtime selection by configuration (`SANDBOX_TYPE`) without code
  changes.
- Preserve the "clone → run" path (no mandatory extra dependencies).
- Support timeouts and consistent capture of stdout/stderr.

**Non-goals (for now)**

- Not aiming for a local RCE-proof solution (that requires OS-level sandboxing).
- Not designing a multi-tenant scheduler.
- Not executing arbitrary languages without an explicit policy (allowlist).

---

## 5. Conceptual architecture

The design decouples the intent to run code from the underlying infrastructure
required to do so.

### 5.1. Class diagram (Strategy + Factory)

```mermaid
classDiagram
    namespace Core {
        class SandboxProtocol {
            <<Interface>>
            +execute(code: str, language: str) ExecutionResult
        }
        class SandboxFactory {
            +get_sandbox() SandboxProtocol
        }
    }

    namespace Implementations {
        class LocalSandbox {
            +execute()
        }
        class DockerSandbox {
            +execute()
        }
        class CloudSandbox {
            +execute()
        }
    }

    class Agent {
        -tools
    }

    Agent ..> SandboxFactory : Requests instance
    SandboxFactory --> LocalSandbox : Creates (Default)
    SandboxFactory --> DockerSandbox : Creates (If ENV=docker)
    LocalSandbox ..|> SandboxProtocol : Implements
    DockerSandbox ..|> SandboxProtocol : Implements
    CloudSandbox ..|> SandboxProtocol : Implements (Future/E2B)

```


### 5.2. Execution flow

```mermaid
sequenceDiagram
    participant User
    participant Agent
    participant Tool as CodeExecutionTool
    participant Factory as SandboxFactory
    participant Env as .env Config
    participant Runtime as Local/Docker

    User->>Agent: "Generate and execute a Python script"
    Agent->>Agent: Generates code
    Agent->>Tool: call(code="print('hi')")
    
    rect rgb(240, 248, 255)
    Note over Tool, Env: Dynamic resolution
    Tool->>Factory: get_sandbox()
    Factory->>Env: Read SANDBOX_TYPE
    Env-->>Factory: "local" (default)
    Factory-->>Tool: Returns LocalSandbox instance
    end

    Tool->>Runtime: execute(code)
    Runtime-->>Tool: Stdout: "hi"
    Tool-->>Agent: Result
    Agent-->>User: Final Response

```


## 6. Technical specification

### 6.1. Proposed directory structure

Add a dedicated module to isolate execution logic:

```text
antigravity_engine/
├── sandbox/              # NEW MODULE
│   ├── __init__.py
│   ├── base.py           # Protocol definition (Interface)
│   ├── factory.py        # Instantiation logic
│   ├── local.py          # venv/subprocess implementation
│   └── docker_exec.py    # Docker SDK implementation
├── tools/
│   └── execution_tool.py # Tool exposed to the Agent (Consumer)

```

### 6.2. Data contracts

The runtime (local/docker/cloud) should always return a structured result.

- `stdout`: standard output
- `stderr`: standard error
- `exit_code`: exit code
- `duration`: duration in seconds
- (recommended) `truncated`: whether output was trimmed due to size
- (recommended) `timed_out`: boolean
- (recommended) `meta`: dict with details (runtime, versions, limits)


### 6.3. Interface (Protocol)

Use `typing.Protocol` for structural typing without complex inheritance.

```python
from typing import Protocol
from dataclasses import dataclass

@dataclass
class ExecutionResult:
    stdout: str
    stderr: str
    exit_code: int
    duration: float

class CodeSandbox(Protocol):
    """Abstract interface for any execution environment."""
    
    def execute(
        self, 
        code: str, 
        language: str = "python", 
        timeout: int = 30
    ) -> ExecutionResult:
        """
        Execute the provided code synchronously.
        Must handle timeouts and capture Stdout/Stderr.
        """
        ...
```


### 6.4. Default implementation: LocalSandbox

Key to preserving Zero-Config. Uses the same virtualenv where the agent runs.

```python
import subprocess
import sys
import time
from .base import CodeSandbox, ExecutionResult

class LocalSandbox(CodeSandbox):
    def execute(self, code: str, language: str = "python", timeout: int = 30) -> ExecutionResult:
        start_time = time.time()
        try:
            # Run in a subprocess using the same interpreter
            process = subprocess.run(
                [sys.executable, "-c", code],
                capture_output=True,
                text=True,
                timeout=timeout
            )
            return ExecutionResult(
                stdout=process.stdout,
                stderr=process.stderr,
                exit_code=process.returncode,
                duration=time.time() - start_time
            )
        except subprocess.TimeoutExpired:
            return ExecutionResult("", "Execution timed out", -1, timeout)
```

Recommendation: instead of `python -c <code>` (which hinders auditing and
limits), write a temporary file under a controlled directory and run
`python <tmpfile>`.


### 6.5. Factory: configuration resolution

Controlled purely by environment variables so behavior can change without
code edits.

```python
import os
from .base import CodeSandbox
from .local import LocalSandbox

def get_sandbox() -> CodeSandbox:
    """Factory method to obtain the configured executor."""
    mode = os.getenv("SANDBOX_TYPE", "local").lower()
    
    if mode == "docker":
        # Lazy import so docker-py is not required unless used
        from .docker_exec import DockerSandbox 
        return DockerSandbox()
        
    elif mode == "e2b":
        # Future support for Cloud Sandbox (Phase 9 Roadmap)
        from .e2b_exec import E2BSandbox
        return E2BSandbox()
        
    return LocalSandbox()
```

Recommendation: support `SANDBOX_TYPE=local|docker|e2b` and
`SANDBOX_TIMEOUT_SEC` as a global override.


### 6.6. Opt-in implementation: DockerSandbox

**Goal:** strong isolation (filesystem, permissions, network) while keeping
the same interface.

This repo already uses Docker to run the agent (`Dockerfile`,
`docker-compose.yml`). For execution sandboxing, DockerSandbox should:

- Run code in a dedicated "runner" container (not necessarily the agent
  container).
- Mount a temporary directory read-only where appropriate.
- Limit resources (CPU/mem), time, and optionally network.

**Dependencies note:** prefer lazy import (`docker-py` only if used) to keep
Zero-Config.

### 6.7. Future implementation: Cloud/E2B

**Goal:** run code remotely (more secure by isolating execution off-host) via
the same interface.

- Ideal for enterprise/multi-tenant setups.
- Must include authentication, quotas, and auditing.

---

## 7. Integration with the agent (repo alignment)

The Agent does not need to know which sandbox is used. It only needs a
"Tool" that acts as a bridge.

This repo exposes tools to the agent via `antigravity_engine/tools/*.py` (dynamic loading).
Therefore, the ideal integration is a simple tool, e.g. `antigravity_engine/tools/execution_tool.py`, that:

1) Accepts code + language
2) Uses `get_sandbox()`
3) Returns stdout/stderr safely and truncated

Example:

```python
from antigravity_engine.sandbox.factory import get_sandbox


def run_python_code(code: str, timeout: int = 30) -> str:
    """Execute Python code using the configured sandbox.

    Note: In this repo, tools are public functions in `antigravity_engine/tools/*.py`.
    The agent runs at most one tool per iteration, so output should be
    compact (e.g. truncated) and self-contained.
    """
    sandbox = get_sandbox()
    result = sandbox.execute(code=code, language="python", timeout=timeout)

    if result.exit_code != 0:
        return f"Error (exit_code={result.exit_code}): {result.stderr}"

    return result.stdout
```

**Alignment with `antigravity_engine/agent.py`:**

- The agent currently runs **at most one tool** per iteration and then does a
  follow-up.
- Therefore, the tool should return compact and reliable output (including
  well-formatted errors).

---

## 8. Security model

Security depends on the mode. This section proposes a progressive approach
without breaking Zero-Config.

### 8.1. Risks by mode

**LocalSandbox (default)**
- Risk: code runs on the user's host with the agent's process privileges.
- Impact: filesystem, network, resource consumption.

**DockerSandbox (opt-in)**
- Risk: container escape (low but not zero), misconfigured mounts/caps.
- Impact: depends on hardening.

### 8.2. Minimum mitigations for LocalSandbox (MVP)

Preserving UX, recommend lightweight controls:

- **Strict timeout** (already considered) and subprocess kill.
- **Output limits**: truncate stdout/stderr to N KB to avoid spam.
- **Heuristic blocking** (optional, configurable):
    - AST parsing to block obvious imports (`os`, `subprocess`, `shutil`, `pathlib`, `socket`) or dangerous calls.
    - Not perfect security, but reduces accidents.
- **Isolated working directory**: run in a dedicated temp dir.

### 8.3. Recommended controls for DockerSandbox

- `--network=none` by default (if the use case allows)
- limit CPU/memory (`--cpus`, `--memory`)
- filesystem read-only and minimal mounts
- drop capabilities; do not run privileged

---

## 9. Observability and audit

Minimum proposal:

- Each execution returns `ExecutionResult` + meta (duration, runtime, limits).
- The tool can serialize a summary for persistence (e.g. it is already stored
  as a `tool` message in `agent_memory.json`).
- For advanced auditing: emit an artifact with the executed code + result,
  when environment policy permits.

---

## 10. Implementation plan (by phases)

**Phase 1 (MVP, Zero-Config):**

- [ ] Create `antigravity_engine/sandbox/` and base contracts.
- [ ] Implement `LocalSandbox` with subprocess + timeout + output truncation.
- [ ] Implement `SandboxFactory` reading `SANDBOX_TYPE`.
- [ ] Expose tool `antigravity_engine/tools/execution_tool.py` (e.g. `run_python_code`).
- [ ] Add minimal tests for: timeout, exit_code != 0, output truncation.

**Phase 2 (opt-in Docker):**

- [ ] Implement `DockerSandbox` with basic hardening.
- [ ] Document requirements (docker daemon) as opt-in.

**Phase 3 (cloud sandbox):**

- [ ] Define credential/quota/audit interface.
- [ ] Integrate E2B/K8s/other provider.

---

## Appendix: Impact (Pros/Cons)


### Advantages (Pros)

Zero Friction Initial: git clone works immediately. No docker pull nor daemon
setup required to get started.

Extensible: Enables adding E2BSandbox or KubernetesSandbox in the future
(Phase 9 of the Roadmap) without refactoring the agent.

Better DX: For simple tasks (testing a function, mathematical computation),
local execution is milliseconds faster than spinning up a container.

Progressive Security: Enterprise users can set `SANDBOX_TYPE=docker` in their
CI/CD or production environment without changing agent logic.

### Disadvantages (Cons)

Local Risk: In default local mode, a malicious script generated by an LLM
could affect the host (e.g. `rm -rf`).

Mitigation: add a simple static analysis (AST) in LocalSandbox to block
dangerous imports (os, shutil) or warn the user.

Added code complexity: introduces an abstraction layer versus simply calling
`exec()`.

## Conclusion and next steps

This architecture resolves the conflict in the original Issue by not
committing to a single technology: it creates a stable interface and lets the
isolation choice be a configuration decision.

Recommended next step for this repo: formalize an **OpenSpec change**
(`add-sandbox-execution` or similar) with:

- `proposal.md` (Why/What/Impact)
- `tasks.md` (checklist)
- spec delta for a new capability, e.g. `openspec/changes/<id>/specs/sandbox/spec.md` with scenarios:
    - Local default
    - Docker opt-in
    - Missing Docker error path
    - Timeout behavior
