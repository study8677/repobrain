"""Regression tests for refresh retry classification.

A bare ``asyncio.wait_for`` timeout means our own per-attempt deadline elapsed
(the model is slow/stalling). Retrying it just multiplies wall-clock by
(retries + 1) for the same outcome — the behaviour that made refresh appear to
hang. It must be treated as NON-retryable so the step falls back immediately.
Genuine transient provider failures (rate limits, 5xx, network, and
*messaged* gateway timeouts) must still be retried.
"""

from __future__ import annotations

import asyncio

from antigravity_engine.hub.refresh_pipeline import _is_retryable_error


def test_bare_wait_for_timeout_is_not_retryable() -> None:
    # asyncio.TimeoutError() and TimeoutError() carry an empty message.
    assert _is_retryable_error(asyncio.TimeoutError()) is False
    assert _is_retryable_error(TimeoutError()) is False


def test_messaged_gateway_timeout_is_retryable() -> None:
    # A provider-side timeout carries a message and stays retryable.
    assert _is_retryable_error(TimeoutError("504 Gateway Time-out")) is True


def test_transient_provider_errors_are_retryable() -> None:
    assert _is_retryable_error(RuntimeError("connection reset by peer")) is True
    assert _is_retryable_error(RuntimeError("rate limit exceeded")) is True
    assert _is_retryable_error(RuntimeError("503 Service Unavailable")) is True
    assert _is_retryable_error(RuntimeError("network is unreachable")) is True


def test_non_transient_errors_are_not_retryable() -> None:
    assert _is_retryable_error(ValueError("invalid api key")) is False
    assert _is_retryable_error(RuntimeError("bad request: malformed prompt")) is False
