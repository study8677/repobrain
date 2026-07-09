"""Local host-backed runners for experimental no-API-key workflows."""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any


DEFAULT_CODEX_HOST_MODEL = "gpt-5.3-codex-spark"
DEFAULT_HOST_TIMEOUT_SECONDS = 240.0
DEFAULT_HOST_MAX_CONTEXT_CHARS = 60000


class HostRunnerError(ValueError):
    """Raised when a local host runner cannot produce an answer."""


@dataclass(frozen=True)
class HostRunnerAnswer:
    """Structured answer returned by a local host runner."""

    answer: str
    sources: list[str]
    limitations: list[str]

    def to_markdown(self) -> str:
        """Render the structured payload as user-facing Markdown."""
        parts = [self.answer.strip()]
        if self.sources:
            parts.append(
                "Sources:\n" + "\n".join(f"- {source}" for source in self.sources)
            )
        if self.limitations:
            parts.append(
                "Limitations:\n"
                + "\n".join(f"- {limitation}" for limitation in self.limitations)
            )
        return "\n\n".join(part for part in parts if part.strip())


def normalize_host_runner_name(value: str | None) -> str:
    """Normalize a host runner name from env/settings."""
    return (value or "").strip().lower()


def is_host_runner_enabled(value: str | None) -> bool:
    """Return whether a supported local host runner was requested."""
    return normalize_host_runner_name(value) in {"codex"}


async def run_host_runner(
    *,
    runner: str,
    workspace: Path,
    question: str,
    context: str,
    retrieval_evidence: str | None = None,
    graph_context: str | None = None,
    model: str | None = None,
    timeout_seconds: float | None = None,
    max_context_chars: int | None = None,
) -> str:
    """Run the configured local host runner and return Markdown output."""
    runner_name = normalize_host_runner_name(runner)
    if runner_name != "codex":
        raise HostRunnerError(f"Unsupported host runner: {runner or '<empty>'}")

    answer = await run_codex_host_runner(
        workspace=workspace,
        question=question,
        context=context,
        retrieval_evidence=retrieval_evidence,
        graph_context=graph_context,
        model=model,
        timeout_seconds=timeout_seconds,
        max_context_chars=max_context_chars,
    )
    return answer.to_markdown()


async def run_codex_host_runner(
    *,
    workspace: Path,
    question: str,
    context: str,
    retrieval_evidence: str | None = None,
    graph_context: str | None = None,
    model: str | None = None,
    timeout_seconds: float | None = None,
    max_context_chars: int | None = None,
) -> HostRunnerAnswer:
    """Answer with ``codex exec`` using the user's local Codex login."""
    import asyncio

    return await asyncio.to_thread(
        _run_codex_host_runner_sync,
        workspace=workspace,
        question=question,
        context=context,
        retrieval_evidence=retrieval_evidence,
        graph_context=graph_context,
        model=model,
        timeout_seconds=timeout_seconds,
        max_context_chars=max_context_chars,
    )


def build_codex_command(
    *,
    workspace: Path,
    model: str,
    schema_path: Path,
    output_path: Path,
    prompt: str,
) -> list[str]:
    """Build the ``codex exec`` command for a read-only host-runner ask."""
    return [
        "codex",
        "exec",
        "--cd",
        str(workspace),
        "--sandbox",
        "read-only",
        "--ephemeral",
        "--skip-git-repo-check",
        "--model",
        model,
        "--output-schema",
        str(schema_path),
        "--output-last-message",
        str(output_path),
        prompt,
    ]


def _run_codex_host_runner_sync(
    *,
    workspace: Path,
    question: str,
    context: str,
    retrieval_evidence: str | None,
    graph_context: str | None,
    model: str | None,
    timeout_seconds: float | None,
    max_context_chars: int | None,
) -> HostRunnerAnswer:
    if shutil.which("codex") is None:
        raise HostRunnerError(
            "Codex CLI is not installed or not on PATH. Install Codex CLI and run "
            "`codex login` before using AG_HOST_RUNNER=codex."
        )

    model_name = (model or os.environ.get("AG_HOST_MODEL") or DEFAULT_CODEX_HOST_MODEL).strip()
    timeout = _coerce_float(
        timeout_seconds if timeout_seconds is not None else os.environ.get("AG_HOST_TIMEOUT_SECONDS"),
        DEFAULT_HOST_TIMEOUT_SECONDS,
    )
    max_chars = _coerce_int(
        max_context_chars if max_context_chars is not None else os.environ.get("AG_HOST_MAX_CONTEXT_CHARS"),
        DEFAULT_HOST_MAX_CONTEXT_CHARS,
    )

    prompt = _build_codex_prompt(
        workspace=workspace,
        question=question,
        context=context,
        retrieval_evidence=retrieval_evidence,
        graph_context=graph_context,
        max_context_chars=max_chars,
    )

    with tempfile.TemporaryDirectory(prefix="ag-host-runner-") as tmp_dir:
        tmp_path = Path(tmp_dir)
        schema_path = tmp_path / "codex_host_answer.schema.json"
        output_path = tmp_path / "codex_host_answer.json"
        schema_path.write_text(
            json.dumps(_host_answer_schema(), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        cmd = build_codex_command(
            workspace=workspace,
            model=model_name,
            schema_path=schema_path,
            output_path=output_path,
            prompt=prompt,
        )

        try:
            completed = subprocess.run(
                cmd,
                cwd=str(workspace),
                text=True,
                capture_output=True,
                timeout=timeout if timeout > 0 else None,
                check=False,
            )
        except subprocess.TimeoutExpired as exc:
            raise HostRunnerError(
                f"Codex host runner timed out after {timeout:g}s."
            ) from exc
        except OSError as exc:
            raise HostRunnerError(
                f"Failed to run Codex host runner: {_redact_secrets(str(exc))}"
            ) from exc

        if completed.returncode != 0:
            stderr = _redact_secrets((completed.stderr or completed.stdout or "").strip())
            raise HostRunnerError(
                "Codex host runner failed"
                + (f": {stderr[:1200]}" if stderr else ".")
            )

        raw_output = ""
        if output_path.is_file():
            raw_output = output_path.read_text(encoding="utf-8").strip()
        if not raw_output:
            raw_output = (completed.stdout or "").strip()
        return parse_host_runner_answer(raw_output)


def parse_host_runner_answer(raw_output: str) -> HostRunnerAnswer:
    """Parse a host runner JSON answer payload."""
    payload = _parse_json_object(raw_output)
    answer = str(payload.get("answer") or "").strip()
    if not answer:
        raise HostRunnerError("Codex host runner returned JSON without a non-empty answer.")
    return HostRunnerAnswer(
        answer=answer,
        sources=_coerce_string_list(payload.get("sources")),
        limitations=_coerce_string_list(payload.get("limitations")),
    )


def _parse_json_object(raw_output: str) -> dict[str, Any]:
    text = (raw_output or "").strip()
    if not text:
        raise HostRunnerError("Codex host runner returned no output.")

    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, flags=re.DOTALL)
        if fenced:
            try:
                payload = json.loads(fenced.group(1))
            except json.JSONDecodeError as exc:
                raise HostRunnerError(
                    "Codex host runner returned invalid JSON in a fenced block."
                ) from exc
        else:
            start = text.find("{")
            end = text.rfind("}")
            if start == -1 or end == -1 or end < start:
                raise HostRunnerError(
                    "Codex host runner returned non-JSON output. "
                    f"Preview: {_redact_secrets(text[:400])}"
                )
            try:
                payload = json.loads(text[start : end + 1])
            except json.JSONDecodeError as exc:
                raise HostRunnerError(
                    "Codex host runner returned malformed JSON. "
                    f"Preview: {_redact_secrets(text[:400])}"
                ) from exc

    if not isinstance(payload, dict):
        raise HostRunnerError("Codex host runner JSON output must be an object.")
    return payload


def _build_codex_prompt(
    *,
    workspace: Path,
    question: str,
    context: str,
    retrieval_evidence: str | None,
    graph_context: str | None,
    max_context_chars: int,
) -> str:
    sections = [
        (
            "You are Antigravity's local Codex host runner for read-only codebase Q&A.\n"
            "You may inspect files in the workspace, but you must not modify files, run "
            "formatters, create commits, or perform network or write-side effects.\n"
            "Use the supplied Antigravity context first, then verify with source files "
            "when needed. Cite concrete file paths and line numbers when possible.\n"
            "Return only JSON matching the provided output schema with keys: "
            "answer, sources, limitations."
        ),
        f"Workspace: {workspace}",
        f"Question:\n{question.strip()}",
    ]
    if context.strip():
        sections.append("Antigravity context:\n" + context.strip())
    if retrieval_evidence and retrieval_evidence.strip():
        sections.append("Retrieval evidence:\n" + retrieval_evidence.strip())
    if graph_context and graph_context.strip():
        sections.append("Graph context:\n" + graph_context.strip())

    prompt = "\n\n".join(sections)
    if max_context_chars > 0 and len(prompt) > max_context_chars:
        overflow_note = (
            "\n\n[Antigravity note: context was truncated to fit "
            f"AG_HOST_MAX_CONTEXT_CHARS={max_context_chars}.]"
        )
        prompt = prompt[: max(0, max_context_chars - len(overflow_note))] + overflow_note
    return prompt


def _host_answer_schema() -> dict[str, Any]:
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "answer": {"type": "string"},
            "sources": {
                "type": "array",
                "items": {"type": "string"},
                "default": [],
            },
            "limitations": {
                "type": "array",
                "items": {"type": "string"},
                "default": [],
            },
        },
        "required": ["answer", "sources", "limitations"],
    }


def _coerce_string_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [value] if value.strip() else []
    if not isinstance(value, list):
        return [str(value)]
    return [str(item).strip() for item in value if str(item).strip()]


def _coerce_float(value: object, default: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _coerce_int(value: object, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _redact_secrets(text: str) -> str:
    redacted = text
    for key, value in os.environ.items():
        key_upper = key.upper()
        if not value or len(value) < 4:
            continue
        if any(marker in key_upper for marker in ("KEY", "TOKEN", "SECRET", "PASSWORD")):
            redacted = redacted.replace(value, "<redacted>")
    redacted = re.sub(r"sk-[A-Za-z0-9_-]{12,}", "sk-<redacted>", redacted)
    return redacted
