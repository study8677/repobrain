import os
from .base import CodeSandbox
from .local import LocalSandbox


def get_sandbox() -> CodeSandbox:
    """Factory method to obtain the configured executor.

    Supported types: local (default), microsandbox (opt-in), e2b (future)
    Falls back to local if the requested type module is unavailable.
    """
    mode = os.getenv("SANDBOX_TYPE", "local").lower()

    if mode == "microsandbox":
        try:
            from .microsandbox_exec import MicrosandboxSandbox  # type: ignore

            return MicrosandboxSandbox()
        except Exception:
            # If Microsandbox runtime module can't be imported, fallback to local
            return LocalSandbox()

    if mode == "e2b":
        try:
            from .e2b_exec import E2BSandbox  # type: ignore

            return E2BSandbox()
        except Exception:
            return LocalSandbox()

    return LocalSandbox()
