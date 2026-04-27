import os
import time
import uuid
from typing import Any, Dict, Optional, Tuple

import requests

from .base import CodeSandbox, ExecutionResult


def _truncate_output(text: str, max_bytes: int) -> Tuple[str, bool]:
    """Truncate output text to at most `max_bytes` UTF-8 bytes.

    Args:
        text: Output text.
        max_bytes: Maximum byte length allowed.

    Returns:
        Tuple of truncated text and truncation flag.
    """

    if max_bytes <= 0:
        return text, False
    encoded = text.encode("utf-8", errors="ignore")
    if len(encoded) <= max_bytes:
        return text, False
    truncated = encoded[: max_bytes - 32].decode("utf-8", errors="ignore")
    return truncated + "\n... (output truncated)", True


class MicrosandboxSandbox(CodeSandbox):
    """Microsandbox server-backed sandbox implementation."""

    def __init__(self) -> None:
        """Initialize runtime configuration from environment variables."""

        self._server_url = os.getenv("MSB_SERVER_URL", "http://127.0.0.1:5555").rstrip("/")
        self._api_key = os.getenv("MSB_API_KEY", "").strip() or None
        self._image = os.getenv("MSB_IMAGE", "microsandbox/python")
        self._memory_mb = int(os.getenv("MSB_MEMORY_MB", "512"))
        self._cpu_limit = float(os.getenv("MSB_CPU_LIMIT", "1.0"))
        self._start_timeout_sec = float(os.getenv("MSB_START_TIMEOUT_SEC", "30"))

    def _headers(self) -> Dict[str, str]:
        """Build request headers for Microsandbox server calls.

        Returns:
            HTTP headers including optional auth.
        """

        headers = {"Content-Type": "application/json"}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"
        return headers

    def _post_json_rpc(
        self, path: str, payload: Dict[str, Any], timeout_sec: float
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Send JSON-RPC request to Microsandbox server.

        Args:
            path: API path.
            payload: JSON-RPC payload.
            timeout_sec: Request timeout in seconds.

        Returns:
            Tuple of parsed JSON payload and optional error message.
        """

        url = f"{self._server_url}{path}"
        try:
            response = requests.post(
                url,
                json=payload,
                headers=self._headers(),
                timeout=timeout_sec,
            )
        except requests.Timeout:
            return None, f"Microsandbox request timed out after {timeout_sec:.0f}s."
        except requests.RequestException as exc:
            return (
                None,
                f"Failed to connect to Microsandbox server at {self._server_url}: {exc}",
            )

        if response.status_code != 200:
            message = (response.text or "").strip() or "Unknown error"
            return None, f"Microsandbox server returned HTTP {response.status_code}: {message}"

        try:
            data: Dict[str, Any] = response.json()
        except ValueError as exc:
            return None, f"Microsandbox server returned invalid JSON: {exc}"

        error_payload = data.get("error")
        if isinstance(error_payload, dict):
            return None, f"Microsandbox RPC error: {error_payload.get('message', 'Unknown error')}"

        return data, None

    def _start_sandbox(self, sandbox_name: str, timeout: int) -> Optional[str]:
        """Start a Microsandbox runtime instance.

        Args:
            sandbox_name: Sandbox name.
            timeout: Execution timeout in seconds.

        Returns:
            Error string when startup fails; otherwise `None`.
        """

        payload = {
            "jsonrpc": "2.0",
            "method": "sandbox.start",
            "params": {
                "sandbox": sandbox_name,
                "config": {
                    "image": self._image,
                    "memory": self._memory_mb,
                    "cpus": max(1, int(round(self._cpu_limit))),
                },
            },
            "id": str(uuid.uuid4()),
        }
        _, error = self._post_json_rpc(
            path="/api/v1/sandbox/start",
            payload=payload,
            timeout_sec=max(self._start_timeout_sec, float(timeout) + 5.0),
        )
        return error

    def _stop_sandbox(self, sandbox_name: str) -> Optional[str]:
        """Stop a Microsandbox runtime instance.

        Args:
            sandbox_name: Sandbox name.

        Returns:
            Error string when stop fails; otherwise `None`.
        """

        payload = {
            "jsonrpc": "2.0",
            "method": "sandbox.stop",
            "params": {"sandbox": sandbox_name},
            "id": str(uuid.uuid4()),
        }
        _, error = self._post_json_rpc(
            path="/api/v1/sandbox/stop",
            payload=payload,
            timeout_sec=10.0,
        )
        return error

    def execute(self, code: str, language: str = "python", timeout: int = 30) -> ExecutionResult:
        """Execute Python code inside Microsandbox.

        Args:
            code: Python source code to run.
            language: Language identifier. Only `python` is supported.
            timeout: Maximum execution time in seconds.

        Returns:
            Structured execution result.
        """

        start = time.time()
        if language.lower() != "python":
            return ExecutionResult(
                stdout="",
                stderr=f"Unsupported language: {language}",
                exit_code=1,
                duration=0.0,
                meta={"runtime": "microsandbox", "timed_out": False, "truncated": False},
            )

        sandbox_name = f"ag-msb-{uuid.uuid4().hex[:8]}"
        timed_out = False
        stdout = ""
        stderr = ""
        exit_code = 0
        started = False

        start_error = self._start_sandbox(sandbox_name=sandbox_name, timeout=timeout)
        if start_error:
            return ExecutionResult(
                stdout="",
                stderr=f"{start_error} Start the server with: msb server start --dev",
                exit_code=1,
                duration=time.time() - start,
                meta={"runtime": "microsandbox", "timed_out": False, "truncated": False},
            )
        started = True

        try:
            payload = {
                "jsonrpc": "2.0",
                "method": "sandbox.repl.run",
                "params": {
                    "sandbox": sandbox_name,
                    "language": "python",
                    "code": code,
                },
                "id": str(uuid.uuid4()),
            }
            data, run_error = self._post_json_rpc(
                path="/api/v1/rpc",
                payload=payload,
                timeout_sec=float(timeout) + 5.0,
            )

            if run_error:
                if "timed out" in run_error.lower():
                    timed_out = True
                    exit_code = -1
                    stderr = f"Execution timed out after {timeout}s"
                else:
                    exit_code = 1
                    stderr = run_error
            else:
                result = data.get("result", {}) if isinstance(data, dict) else {}
                if not isinstance(result, dict):
                    exit_code = 1
                    stderr = "Microsandbox RPC returned unexpected result payload."
                else:
                    output_lines = result.get("output", [])
                    status = str(result.get("status", "unknown")).lower()
                    stdout_parts = []
                    stderr_parts = []
                    if isinstance(output_lines, list):
                        for line in output_lines:
                            if not isinstance(line, dict):
                                continue
                            stream = str(line.get("stream", "stdout"))
                            text = str(line.get("text", ""))
                            if stream == "stderr":
                                stderr_parts.append(text)
                            else:
                                stdout_parts.append(text)

                    stdout = "\n".join(part for part in stdout_parts if part)
                    stderr = "\n".join(part for part in stderr_parts if part)
                    if status in {"error", "exception", "failed"} or bool(stderr):
                        exit_code = 1
        finally:
            if started:
                stop_error = self._stop_sandbox(sandbox_name=sandbox_name)
                # <thought>
                # Stopping the sandbox is best-effort cleanup. If execution itself was
                # successful but cleanup fails, surface it as an execution error so the
                # caller can decide whether to retry or inspect server state.
                # </thought>
                if stop_error and exit_code == 0:
                    exit_code = 1
                    stderr = (
                        f"Execution finished, but sandbox cleanup failed: {stop_error}"
                    )

        max_output_kb = int(os.getenv("SANDBOX_MAX_OUTPUT_KB", "10"))
        max_bytes = max_output_kb * 1024
        stdout, trunc_out = _truncate_output(stdout, max_bytes)
        stderr, trunc_err = _truncate_output(stderr, max_bytes)

        return ExecutionResult(
            stdout=stdout,
            stderr=stderr,
            exit_code=exit_code,
            duration=time.time() - start,
            meta={
                "runtime": "microsandbox",
                "timed_out": timed_out,
                "truncated": bool(trunc_out or trunc_err),
                "resource_limits": {
                    "timeout_sec": timeout,
                    "max_output_kb": max_output_kb,
                },
                "server_url": self._server_url,
            },
        )
