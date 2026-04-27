"""OpenAI-compatible LLM tool for the Antigravity agent.

This module provides a thin wrapper around any OpenAI-format chat
completion endpoint (including OpenAI, Azure OpenAI, or self-hosted
providers like Ollama/Llama.cpp that expose the same API).
"""

from typing import Optional, List, Dict, Any
import requests

from antigravity_engine.config import settings


def call_openai_chat(
    prompt: str,
    system: Optional[str] = None,
    model: Optional[str] = None,
    temperature: float = 0.7,
    max_tokens: int = 512,
) -> str:
    """Call an OpenAI-compatible chat completion API.

    Args:
        prompt: User prompt to send to the LLM.
        system: Optional system prompt to set behavior or constraints.
        model: Optional model override; defaults to settings.OPENAI_MODEL.
        temperature: Sampling temperature.
        max_tokens: Maximum tokens to generate (as supported by the backend).

    Returns:
        The text content returned by the LLM, or an error message on failure.
    """
    base_url = settings.OPENAI_BASE_URL.rstrip("/")
    api_key = settings.OPENAI_API_KEY
    target_model = model or settings.OPENAI_MODEL

    if not base_url:
        return "Error: OPENAI_BASE_URL is not configured."
    if not target_model:
        return "Error: OPENAI_MODEL is not configured."

    url = f"{base_url}/chat/completions"
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    messages: List[Dict[str, Any]] = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": target_model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()
        choice = data.get("choices", [{}])[0]
        message = choice.get("message", {})
        content = message.get("content")
        if content:
            return content
        return str(data)
    except requests.RequestException as exc:
        return f"Error calling OpenAI-compatible API: {exc}"
    except ValueError:
        # JSON decode failed
        return f"Error: Could not parse JSON response: {response.text[:500]}"
