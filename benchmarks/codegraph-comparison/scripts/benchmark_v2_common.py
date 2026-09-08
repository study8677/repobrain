#!/usr/bin/env python3
"""Shared manifest and artifact helpers for the v2 benchmark scripts."""

from __future__ import annotations

import json
import re
from pathlib import Path


BENCH_ROOT = Path(__file__).resolve().parents[1]
WORK_ROOT = BENCH_ROOT / ".work" / "v2"
RESULTS_ROOT = BENCH_ROOT / "results" / "runs"
SAFE_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")


def safe_name(value: str, label: str) -> str:
    if not SAFE_NAME.fullmatch(value):
        raise ValueError(
            f"{label} must match {SAFE_NAME.pattern!r}; got {value!r}"
        )
    return value


def resolve_path(value: str | Path, *, base: Path = BENCH_ROOT) -> Path:
    path = Path(value).expanduser()
    return path if path.is_absolute() else (base / path).resolve()


def load_manifest(path: Path) -> dict:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if payload.get("schema_version") != 2:
        raise ValueError(f"expected schema_version 2 in {path}")
    repositories = payload.get("repositories")
    if not isinstance(repositories, dict) or not repositories:
        raise ValueError("manifest repositories must be a non-empty object")
    for repository, config in repositories.items():
        safe_name(repository, "repository id")
        if not isinstance(config, dict):
            raise ValueError(f"repository {repository!r} config must be an object")
    return payload


def selected_repositories(
    manifest: dict,
    requested: list[str] | None,
    track: str = "unrestricted_native",
) -> list[str]:
    repositories = manifest["repositories"]
    if requested:
        unknown = sorted(set(requested) - repositories.keys())
        if unknown:
            raise ValueError(f"unknown repositories: {', '.join(unknown)}")
        return list(dict.fromkeys(requested))
    return [
        name
        for name, config in repositories.items()
        if config.get("enabled", True)
        and track in config.get("tracks", [])
    ]


def repository_corpus_paths(
    manifest_path: Path,
    repository: str,
    config: dict,
) -> tuple[Path, Path]:
    """Return source-free RepoBrain and CodeGraph query corpus paths.

    Explicit paths win. The manifest-stem fallback keeps compatibility with the
    first v2 preparation layout while the stable default lives under .work/v2.
    """

    explicit = (
        config.get("corpora")
        or config.get("query_corpora")
        or config.get("benchmark_corpora")
        or {}
    )
    rb_explicit = explicit.get("repobrain") or explicit.get("repobrain_query")
    cg_explicit = explicit.get("codegraph") or explicit.get("codegraph_query")
    if rb_explicit and cg_explicit:
        return resolve_path(rb_explicit), resolve_path(cg_explicit)

    stable_root = WORK_ROOT / "corpora" / repository
    stem_root = BENCH_ROOT / ".work" / "corpora" / manifest_path.stem / repository
    rb_candidates = [
        stable_root / "repobrain-query",
        stem_root / "repobrain-source-free",
    ]
    cg_candidates = [
        stable_root / "codegraph-query",
        stem_root / "codegraph-source-free",
    ]
    rb = next((path for path in rb_candidates if path.exists()), rb_candidates[0])
    cg = next((path for path in cg_candidates if path.exists()), cg_candidates[0])
    return rb, cg


def question_files(manifest: dict, explicit: list[Path] | None) -> list[Path]:
    if explicit:
        return [path.resolve() for path in explicit]
    configured = manifest.get("question_files") or manifest.get("questions")
    if isinstance(configured, str):
        configured = [configured]
    if configured:
        return [resolve_path(item) for item in configured]
    v2 = BENCH_ROOT / "config" / "questions-v2.json"
    if v2.is_file():
        return [v2]
    return [
        path
        for path in (
            BENCH_ROOT / "config" / "questions.json",
            BENCH_ROOT / "config" / "questions-expanded.json",
        )
        if path.is_file()
    ]


def load_questions(paths: list[Path]) -> list[dict]:
    questions: list[dict] = []
    seen: set[tuple[str, str]] = set()
    for path in paths:
        payload = json.loads(path.read_text(encoding="utf-8"))
        default_repository = payload.get("repository")
        corpus = str(payload.get("corpus") or "")
        for item in payload.get("questions") or []:
            question = dict(item)
            repository = question.get("repository") or default_repository
            if not repository and corpus:
                repository = corpus.split("-", 1)[0]
            if not repository:
                repository = str(question.get("id", "")).split("-", 1)[0]
            question["repository"] = safe_name(repository, "question repository")
            question["id"] = safe_name(str(question["id"]), "question id")
            question.setdefault("expected_files", [])
            question.setdefault("expected_symbols", [])
            key = (question["repository"], question["id"])
            if key in seen:
                continue
            seen.add(key)
            questions.append(question)
    return questions


def artifact_dir(
    run_id: str,
    repository: str,
    repeat: int,
    product: str,
    track: str | None = None,
) -> Path:
    safe_name(run_id, "run id")
    safe_name(repository, "repository id")
    safe_name(product, "product")
    if track is not None:
        safe_name(track, "track")
    if repeat < 1:
        raise ValueError("repeat must be at least 1")
    root = RESULTS_ROOT / run_id
    if track is not None:
        root /= track
    return root / repository / f"repeat-{repeat:03d}" / product


def atomic_write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.tmp")
    temporary.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    temporary.replace(path)


def normalize_string_list(value: object) -> list[str]:
    """Normalize a model-produced scalar or list into non-empty strings."""
    if value is None:
        return []
    if isinstance(value, str):
        return [value] if value else []
    if isinstance(value, list):
        return [str(item) for item in value if item is not None and str(item)]
    return [str(value)]


def normalize_answer_payload(payload: dict) -> dict:
    """Normalize loosely typed model JSON to the benchmark answer contract."""
    answer = payload.get("answer")
    return {
        **payload,
        "answer": (
            answer
            if isinstance(answer, str)
            else "" if answer is None
            else str(answer)
        ),
        "sources": normalize_string_list(payload.get("sources")),
        "limitations": normalize_string_list(payload.get("limitations")),
    }


def normalize_answer_text(text: str) -> tuple[dict, bool]:
    """Return a JSON answer object, preserving non-JSON output without inference."""
    stripped = text.strip()
    try:
        payload = json.loads(stripped)
    except (json.JSONDecodeError, TypeError):
        payload = None
    if isinstance(payload, dict):
        return normalize_answer_payload(payload), False
    return {
        "answer": text,
        "sources": [],
        "limitations": [
            "Normalized plain-text Trae output; no sources were inferred."
        ],
    }, True
