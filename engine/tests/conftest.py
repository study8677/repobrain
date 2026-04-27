"""Pytest configuration helpers.

This conftest ensures the engine root is on `sys.path` so tests can import
the `antigravity_engine` package regardless of how pytest is invoked.
"""
import os
import sys


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)
