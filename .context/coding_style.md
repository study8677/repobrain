# Antigravity Coding Standards & Best Practices

## Architecture
1.  **Tool Isolation**: All external interactions (API calls, file I/O, system commands) MUST be encapsulated in functions within the `tools/` directory.
    - *Why?* This allows the agent to easily "see" and "use" these capabilities as distinct tools.
2.  **Pydantic Everywhere**: Use `pydantic` models for function arguments and return values where complex data is involved.
    - *Why?* This ensures strict schema validation and provides clear type definitions for the LLM.

## Python Style
1.  **Type Hints**: Mandatory for all function signatures.
    - `def my_func(a: int, b: str) -> bool:`
2.  **Docstrings**: Google-style docstrings are required.
    - Include `Args:`, `Returns:`, and `Raises:` sections.
    - *Why?* The agent uses these docstrings to understand how to use the tools.

## Agent Design Patterns
1.  **Stateless Tools**: Tools should generally be stateless. Pass necessary context (like IDs or tokens) as arguments.
2.  **Fail Gracefully**: Tools should return error messages or status codes rather than crashing, allowing the agent to recover.
3.  **Deep Think Simulation**: When writing complex logic, include comments or a separate design document that outlines the "thought process" or decision tree.
