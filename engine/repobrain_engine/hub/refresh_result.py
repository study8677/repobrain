"""Shared user-facing refresh outcomes for CLI and tool entry points."""
from __future__ import annotations

from repobrain_engine.hub.contracts import RefreshStatus


def format_refresh_result(status: RefreshStatus) -> str:
    """Describe the actual outcome without claiming incomplete work was published."""
    if status.overall_status == "success":
        if status.mode == "noop":
            return "Knowledge base is already up to date; no update needed."
        if status.resumed:
            action = "Continuation of the previous refresh"
        else:
            action = "Full build" if status.mode == "full" else "Incremental update"
        return f"Knowledge base updated: {action} completed."

    if status.overall_status == "unresolved":
        message = "Knowledge base was not changed: incremental impact remains unresolved."
    elif status.overall_status == "partial":
        message = "Knowledge-base refresh is incomplete; active generation was preserved."
    else:
        message = "Knowledge-base refresh failed; active generation was preserved."
    details = [f"{failure.stage}: {failure.reason}" for failure in status.failures]
    if status.impact_plan_path:
        details.append(f"Plan: {status.impact_plan_path}")
    details.append("Run `rb-refresh` to retry or continue.")
    return "\n".join([message, *details])
