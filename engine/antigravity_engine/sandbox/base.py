from dataclasses import dataclass
from typing import Protocol, Dict


@dataclass
class ExecutionResult:
    stdout: str
    stderr: str
    exit_code: int
    duration: float
    meta: Dict[str, object]


class CodeSandbox(Protocol):
    """Abstract interface for any execution environment."""

    def execute(
        self,
        code: str,
        language: str = "python",
        timeout: int = 30,
    ) -> ExecutionResult:
        """
        Execute the provided code synchronously.
        Must handle timeouts and capture Stdout/Stderr.
        """
        ...
