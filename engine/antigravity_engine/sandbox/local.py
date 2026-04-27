import os
import sys
import time
import tempfile
import subprocess
from typing import Tuple

from .base import CodeSandbox, ExecutionResult


def _truncate_output(text: str, max_bytes: int) -> Tuple[str, bool]:
    if max_bytes <= 0:
        return text, False
    encoded = text.encode("utf-8", errors="ignore")
    if len(encoded) <= max_bytes:
        return text, False
    truncated = encoded[: max_bytes - 32].decode("utf-8", errors="ignore")
    return truncated + "\n... (output truncated)", True


class LocalSandbox(CodeSandbox):
    """Local subprocess-based sandbox.

    Runs code using the current Python interpreter inside an isolated temp directory.
    Applies timeout and output truncation.
    """

    def execute(self, code: str, language: str = "python", timeout: int = 30) -> ExecutionResult:
        if language.lower() != "python":
            return ExecutionResult(
                stdout="",
                stderr=f"Unsupported language: {language}",
                exit_code=1,
                duration=0.0,
                meta={"runtime": "local", "truncated": False, "timed_out": False},
            )

        max_output_kb = int(os.getenv("SANDBOX_MAX_OUTPUT_KB", "10"))
        max_bytes = max_output_kb * 1024

        start = time.time()
        timed_out = False
        stdout = ""
        stderr = ""
        exit_code = 0

        with tempfile.TemporaryDirectory(prefix="ag_sandbox_") as tmpdir:
            script_path = os.path.join(tmpdir, "main.py")
            with open(script_path, "w", encoding="utf-8") as f:
                f.write(code)

            try:
                proc = subprocess.run(
                    [sys.executable, script_path],
                    cwd=tmpdir,
                    capture_output=True,
                    text=True,
                    timeout=timeout,
                )
                stdout = proc.stdout or ""
                stderr = proc.stderr or ""
                exit_code = proc.returncode
            except subprocess.TimeoutExpired:
                timed_out = True
                exit_code = -1
                stderr = f"Execution timed out after {timeout}s"
            except Exception as exc:
                exit_code = 1
                stderr = f"Unexpected execution error: {exc}"

        duration = time.time() - start

        stdout, trunc_out = _truncate_output(stdout, max_bytes)
        stderr, trunc_err = _truncate_output(stderr, max_bytes)

        return ExecutionResult(
            stdout=stdout,
            stderr=stderr,
            exit_code=exit_code,
            duration=duration,
            meta={
                "runtime": "local",
                "truncated": bool(trunc_out or trunc_err),
                "timed_out": timed_out,
                "resource_limits": {
                    "timeout_sec": timeout,
                    "max_output_kb": max_output_kb,
                },
            },
        )
