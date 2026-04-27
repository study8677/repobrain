# Sandbox Code Execution

## Overview

The sandbox module provides configurable code execution environments for agent-generated Python code.

- `local` (default): zero-config subprocess execution.
- `microsandbox` (opt-in): execution via Microsandbox server.
- `e2b` (future): placeholder runtime.

## Quick Start

### Local Execution (Default)

```python
from antigravity_engine.sandbox.factory import get_sandbox

sandbox = get_sandbox()
result = sandbox.execute(code="print(2 + 2)", language="python", timeout=30)
print(result.stdout)
```

### Microsandbox Execution (Opt-In)

Install and start Microsandbox server first:

```bash
curl -sSL https://get.microsandbox.dev | sh
msb server start --dev
```

Then execute through the sandbox API with microsandbox runtime:

```bash
export SANDBOX_TYPE=microsandbox
export MSB_SERVER_URL=http://127.0.0.1:5555
export MSB_IMAGE=microsandbox/python
```

## Configuration

### Core Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SANDBOX_TYPE` | `local` | Runtime: `local`, `microsandbox`, `e2b` (future) |
| `SANDBOX_TIMEOUT_SEC` | `30` | Maximum execution time (seconds) |
| `SANDBOX_MAX_OUTPUT_KB` | `10` | Max stdout/stderr before truncation (KB) |

### Microsandbox Variables

These are only used when `SANDBOX_TYPE=microsandbox`.

| Variable | Default | Description |
|----------|---------|-------------|
| `MSB_SERVER_URL` | `http://127.0.0.1:5555` | Microsandbox server URL |
| `MSB_API_KEY` | (empty) | Optional server auth token |
| `MSB_IMAGE` | `microsandbox/python` | Sandbox image used on start |
| `MSB_CPU_LIMIT` | `1.0` | CPU hint used at sandbox start |
| `MSB_MEMORY_MB` | `512` | Memory hint (MB) used at sandbox start |
| `MSB_START_TIMEOUT_SEC` | `30` | Start-call timeout |

## Security Model

### Local Sandbox

- Process-level isolation only.
- Fast and zero-config for development.
- Not suitable for untrusted production workloads.

### Microsandbox Sandbox

- Runs code in Microsandbox-managed isolated runtime.
- Supports stronger isolation boundaries than local subprocess mode.
- Requires Microsandbox server availability.

## Using the Sandbox in Code

```python
from antigravity_engine.sandbox.factory import get_sandbox

sandbox = get_sandbox()
result = sandbox.execute(code="print('Hello')", language="python", timeout=30)

print(result.exit_code)
print(result.stdout)
print(result.stderr)
print(result.meta)
```

## Troubleshooting

### "Microsandbox server unavailable"

**Problem:** `SANDBOX_TYPE=microsandbox` is set, but server is not reachable.

**Solution:**

```bash
msb server start --dev
# verify URL in environment
export MSB_SERVER_URL=http://127.0.0.1:5555
```

### Timeout errors

Increase timeout for heavy tasks:

```bash
export SANDBOX_TIMEOUT_SEC=120
```

## Testing

Run sandbox-related tests:

```bash
pytest engine/tests/test_local_sandbox.py engine/tests/test_microsandbox_sandbox.py engine/tests/test_factory.py -v
```
