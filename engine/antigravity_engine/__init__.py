"""Antigravity Engine — Dynamic multi-agent Knowledge Hub.

Public API:
    - ``refresh_pipeline``  — scan project, generate knowledge docs
    - ``ask_pipeline``      — answer questions via Router → ModuleAgent cluster
    - ``Settings``          — Pydantic configuration
"""

from antigravity_engine.config import Settings

__all__ = [
    "Settings",
    "refresh_pipeline",
    "ask_pipeline",
]


def refresh_pipeline(*args, **kwargs):
    """Lazily import and run the refresh pipeline.

    See :func:`antigravity_engine.hub.pipeline.refresh_pipeline` for full docs.
    """
    from antigravity_engine.hub.pipeline import refresh_pipeline as _refresh

    return _refresh(*args, **kwargs)


def ask_pipeline(*args, **kwargs):
    """Lazily import and run the ask pipeline.

    See :func:`antigravity_engine.hub.pipeline.ask_pipeline` for full docs.
    """
    from antigravity_engine.hub.pipeline import ask_pipeline as _ask

    return _ask(*args, **kwargs)
