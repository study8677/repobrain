"""Skill discovery and tool registration helpers."""

import importlib.util
import inspect
import os
from pathlib import Path
from typing import Any, Callable


_SKILLS_CACHE: dict[str, tuple[dict[str, Callable[..., Any]], str]] = {}


def _verbose() -> bool:
    """Return whether skill loading should print diagnostics."""
    return os.environ.get("AG_SKILLS_VERBOSE", "0").strip().lower() in {"1", "true", "yes"}


def load_skills(agent_tools: dict[str, Callable[..., Any]]) -> str:
    """
    Scans antigravity_engine/skills/ directory for skill packages.

    For each subfolder in antigravity_engine/skills/:
    1. Looks for tools.py: Registers public functions as tools.
    2. Looks for SKILL.md: Reads documentation content.
    
    Args:
        agent_tools: The dictionary of tools to update with new skill-based tools.
        
    Returns:
        A combined string of all SKILL.md contents to be injected into context.
    """
    skills_dir = Path(__file__).parent.resolve()
    cache_key = str(skills_dir)
    cached = _SKILLS_CACHE.get(cache_key)
    if cached is not None:
        cached_tools, cached_docs = cached
        agent_tools.update(cached_tools)
        return cached_docs

    skill_docs: list[str] = []
    discovered_tools: dict[str, Callable[..., Any]] = {}
    verbose = _verbose()
    
    if not skills_dir.exists():
        if verbose:
            print(f"⚠️ Skills directory not found: {skills_dir}")
        return ""

    if verbose:
        print(f"📦 Scanning for skills in {skills_dir}...")

    # Iterate over directories in antigravity_engine/skills/
    for skill_path in skills_dir.iterdir():
        if not skill_path.is_dir() or skill_path.name.startswith("_") or skill_path.name == "__pycache__":
            continue
            
        skill_name = skill_path.name
        if verbose:
            print(f"   ► Found skill: {skill_name}")
        
        # 1. Load Tools (tools.py)
        tools_file = skill_path / "tools.py"
        if tools_file.exists():
            try:
                spec = importlib.util.spec_from_file_location(
                    f"antigravity_engine.skills.{skill_name}.tools", tools_file
                )
                if spec and spec.loader:
                    module = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(module)
                    
                    count = 0
                    for name, obj in inspect.getmembers(module, inspect.isfunction):
                        if not name.startswith("_") and obj.__module__ == module.__name__:
                            discovered_tools[name] = obj
                            count += 1
                    if verbose:
                        print(f"     ✓ Loaded {count} tools from tools.py")
            except Exception as e:
                if verbose:
                    print(f"     ❌ Failed to load tools: {e}")
        
        # 2. Load Documentation (SKILL.md)
        doc_file = skill_path / "SKILL.md"
        if doc_file.exists():
            try:
                content = doc_file.read_text(encoding="utf-8").strip()
                if content:
                    skill_docs.append(f"\n--- SKILL: {skill_name} ---\n{content}")
                    if verbose:
                        print(f"     ✓ Loaded documentation from SKILL.md")
            except Exception as e:
                if verbose:
                    print(f"     ❌ Failed to load docs: {e}")

    docs = "\n".join(skill_docs)
    _SKILLS_CACHE[cache_key] = (discovered_tools, docs)
    agent_tools.update(discovered_tools)
    return docs
