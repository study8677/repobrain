from typing import Optional
import os

from antigravity_engine.sandbox.factory import get_sandbox


def run_python_code(code: str, timeout: Optional[int] = None) -> str:
    """
    Execute Python code using the configured sandbox.

    Args:
        code: Python source code to execute
        timeout: Max execution time in seconds (defaults to env or 30)

    Returns:
        Stdout on success, or a compact formatted error message.
    """
    sandbox = get_sandbox()

    try:
        effective_timeout = (
            int(timeout) if timeout is not None else int(os.getenv("SANDBOX_TIMEOUT_SEC", "30"))
        )
    except Exception:
        effective_timeout = 30

    result = sandbox.execute(code=code, language="python", timeout=effective_timeout)

    if result.exit_code != 0:
        err = (result.stderr or "").strip()
        if not err:
            err = "Unknown error"
        return f"Error (exit_code={result.exit_code}): {err}"

    out = (result.stdout or "").strip()
    return out if out else "(no output)"
