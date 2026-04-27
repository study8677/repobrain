"""Host-provided LLM capability for Knowledge Hub refresh.

The engine owns scanning, orchestration, persistence, and validation. The
semantic code-understanding step is delegated through this adapter to the
embedding host's LLM capability. No OpenAI/Gemini-style model environment is
read here.
"""
from __future__ import annotations

import inspect
from typing import Any, Callable, Protocol

from pydantic import BaseModel, ConfigDict, Field


HOST_LLM_UNAVAILABLE_MESSAGE = (
    "Host LLM capability is unavailable. The embedding host must register a "
    "HostLlmCapability before running semantic refresh stages."
)


class HostLlmUnavailable(RuntimeError):
    """Raised when the host has not exposed an LLM capability."""


class HostLlmRequest(BaseModel):
    """A structured LLM request sent from the engine to the host capability."""

    model_config = ConfigDict(populate_by_name=True)

    task: str = Field(description="Refresh task type, such as conventions or module_knowledge.")
    workspace: str = Field(description="Absolute workspace path.")
    prompt: str = Field(description="Instruction prompt for the host LLM.")
    module: str | None = Field(default=None, description="Module id for module tasks.")
    group: str | None = Field(default=None, description="Module group id for grouped tasks.")
    output_schema: dict[str, Any] = Field(
        default_factory=dict,
        alias="schema",
        description="Expected output schema.",
    )
    context: dict[str, Any] = Field(default_factory=dict, description="Machine context for the request.")


class HostLlmResponse(BaseModel):
    """A structured response returned by the host LLM capability."""

    content: str = Field(default="", description="Text or JSON content returned by the host LLM.")
    data: dict[str, Any] = Field(default_factory=dict, description="Structured response data.")
    metadata: dict[str, Any] = Field(default_factory=dict, description="Host-side metadata.")


class HostLlmCapability(Protocol):
    """Protocol implemented by the embedding host."""

    def complete(self, request: HostLlmRequest) -> HostLlmResponse | dict[str, Any] | str:
        """Complete one LLM request."""


_registered_capability: HostLlmCapability | Callable[[HostLlmRequest], Any] | None = None


def set_host_llm_capability(
    capability: HostLlmCapability | Callable[[HostLlmRequest], Any] | None,
) -> None:
    """Register or clear the process-local host LLM capability.

    Args:
        capability: Object with ``complete(request)`` or a callable accepting a
            :class:`HostLlmRequest`. ``None`` clears the registration.
    """
    global _registered_capability
    _registered_capability = capability


def has_host_llm_capability() -> bool:
    """Return whether a host LLM capability is registered."""
    return _registered_capability is not None


async def call_host_llm(request: HostLlmRequest) -> HostLlmResponse:
    """Call the registered host LLM capability.

    Args:
        request: Structured request to send to the host.

    Returns:
        Normalized host LLM response.

    Raises:
        HostLlmUnavailable: If no capability is registered.
        TypeError: If the host returns an unsupported payload.
    """
    capability = _registered_capability
    if capability is None:
        raise HostLlmUnavailable(HOST_LLM_UNAVAILABLE_MESSAGE)

    complete = getattr(capability, "complete", None)
    if complete is None:
        complete = capability

    result = complete(request)
    if inspect.isawaitable(result):
        result = await result

    if isinstance(result, HostLlmResponse):
        return result
    if isinstance(result, dict):
        return HostLlmResponse.model_validate(result)
    if isinstance(result, str):
        return HostLlmResponse(content=result)
    raise TypeError(f"unsupported host LLM response type: {type(result).__name__}")
