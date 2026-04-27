from typing import Any

from antigravity_engine.skills.agent_repo_init_core import (
    InitMode,
    LlmProvider,
    RepoInitOptions,
    SandboxRuntime,
    initialize_agent_repo,
)


def init_agent_repo(
    project_name: str,
    destination_root: str = ".",
    mode: str = "quick",
    llm_provider: str = "gemini",
    enable_mcp: bool = False,
    enable_swarm: bool = True,
    sandbox_runtime: str = "local",
    init_git: bool = False,
) -> dict[str, Any]:
    """Initialize a new project from the template in quick or full mode.

    Args:
        project_name: Destination project directory name.
        destination_root: Parent directory where project should be created.
        mode: Initialization mode (`quick` or `full`).
        llm_provider: LLM profile (`gemini` or `openai`) used in full mode.
        enable_mcp: Enable MCP defaults in full mode.
        enable_swarm: Enable swarm preference profile in full mode.
        sandbox_runtime: Sandbox runtime (`local` or `microsandbox`) in full mode.
        init_git: Initialize git repository in the destination project.

    Returns:
        Initialization result payload with project path and next steps.

    Raises:
        ValueError: If arguments are invalid.
        OSError: If copy or git operations fail.
    """

    options = RepoInitOptions(
        project_name=project_name,
        destination_root=destination_root,
        mode=InitMode(mode),
        llm_provider=LlmProvider(llm_provider),
        enable_mcp=enable_mcp,
        enable_swarm=enable_swarm,
        sandbox_runtime=SandboxRuntime(sandbox_runtime),
        init_git=init_git,
    )

    result = initialize_agent_repo(options)
    return result.model_dump()
