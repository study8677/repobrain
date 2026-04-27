"""
Test tool for demonstrating dynamic tool discovery.

This file demonstrates the zero-config capability - just drop this file
into antigravity_engine/tools/ and it becomes available to the agent automatically.
"""


def greet_user(name: str) -> str:
    """Greets the user by name with a friendly message.
    
    This is a demonstration tool showing how new tools can be added
    without modifying agent.py.
    
    Args:
        name: The user's name to greet.
        
    Returns:
        A friendly greeting message.
    """
    return f"Hello, {name}! 🎉 Welcome to the Antigravity Agent with dynamic tool loading!"


def reverse_text(text: str) -> str:
    """Reverses the given text string.
    
    Another demo tool to show multiple tools can be added in one file.
    
    Args:
        text: The text to reverse.
        
    Returns:
        The reversed text.
    """
    return text[::-1]
