from __future__ import annotations

from typing import Any
from unittest.mock import patch

import requests

from antigravity_engine.sandbox.microsandbox_exec import MicrosandboxSandbox


class _MockResponse:
    def __init__(self, status_code: int, payload: dict[str, Any], text: str = "") -> None:
        self.status_code = status_code
        self._payload = payload
        self.text = text

    def json(self) -> dict[str, Any]:
        return self._payload


def test_microsandbox_server_unavailable(monkeypatch) -> None:
    monkeypatch.setenv("SANDBOX_TYPE", "microsandbox")
    sandbox = MicrosandboxSandbox()

    with patch(
        "antigravity_engine.sandbox.microsandbox_exec.requests.post",
        side_effect=requests.ConnectionError("connection refused"),
    ):
        result = sandbox.execute("print('hi')", timeout=2)

    assert result.exit_code == 1
    assert "microsandbox server" in result.stderr.lower()
    assert "msb server start --dev" in result.stderr
    assert result.meta.get("runtime") == "microsandbox"


def test_microsandbox_success_execution(monkeypatch) -> None:
    monkeypatch.setenv("SANDBOX_MAX_OUTPUT_KB", "10")
    sandbox = MicrosandboxSandbox()

    responses = [
        _MockResponse(200, {"jsonrpc": "2.0", "result": "started"}),
        _MockResponse(
            200,
            {
                "jsonrpc": "2.0",
                "result": {
                    "status": "success",
                    "language": "python",
                    "output": [{"stream": "stdout", "text": "Hello from Microsandbox"}],
                },
            },
        ),
        _MockResponse(200, {"jsonrpc": "2.0", "result": "stopped"}),
    ]

    with patch("antigravity_engine.sandbox.microsandbox_exec.requests.post", side_effect=responses):
        result = sandbox.execute("print('Hello from Microsandbox')", timeout=5)

    assert result.exit_code == 0
    assert "Hello from Microsandbox" in result.stdout
    assert result.stderr == ""
    assert result.meta.get("runtime") == "microsandbox"
    assert result.meta.get("timed_out") is False


def test_microsandbox_timeout(monkeypatch) -> None:
    monkeypatch.setenv("SANDBOX_MAX_OUTPUT_KB", "10")
    sandbox = MicrosandboxSandbox()

    def _post_with_timeout(url: str, **_: Any) -> _MockResponse:
        if url.endswith("/api/v1/rpc"):
            raise requests.Timeout("request timed out")
        return _MockResponse(200, {"jsonrpc": "2.0", "result": "ok"})

    with patch("antigravity_engine.sandbox.microsandbox_exec.requests.post", side_effect=_post_with_timeout):
        result = sandbox.execute("import time; time.sleep(10)", timeout=2)

    assert result.exit_code == -1
    assert "timed out" in result.stderr.lower()
    assert result.meta.get("timed_out") is True


def test_microsandbox_stderr_marks_failure(monkeypatch) -> None:
    sandbox = MicrosandboxSandbox()

    responses = [
        _MockResponse(200, {"jsonrpc": "2.0", "result": "started"}),
        _MockResponse(
            200,
            {
                "jsonrpc": "2.0",
                "result": {
                    "status": "error",
                    "language": "python",
                    "output": [{"stream": "stderr", "text": "Traceback: boom"}],
                },
            },
        ),
        _MockResponse(200, {"jsonrpc": "2.0", "result": "stopped"}),
    ]

    with patch("antigravity_engine.sandbox.microsandbox_exec.requests.post", side_effect=responses):
        result = sandbox.execute("raise RuntimeError('boom')", timeout=5)

    assert result.exit_code == 1
    assert "boom" in result.stderr.lower()
