# CorpFlow Change Workflow (Canonical)

This document defines the **canonical product flow** for delivering client changes in CorpFlow.

If the UI, backend, and operator behavior disagree, **this doc wins** and the product must be corrected.

## Canonical stages

1. **Intake**
2. **Clarify**
3. **Draft Response**
4. **Review**
5. **Approve / Send**
6. **Build / Deliver**
7. **Verify / Close**

## Required rule: client decisions are first-class (non-optional)

If client input is needed:

- The system **MUST** create `client_decisions` automatically (the 4 required questions).
- The system **MUST** expose a **single stage action**:
  - **“Send client decision request”**
- That action **MUST**:
  - mint a secure one-time link
  - allow copy/send
  - **not require login** for the client
  - **not require admin/factory access** for the operator (tenant-session safe)

## Failure prevention (non-negotiable)

At **no point** should:

- client input depend on hidden endpoints
- an operator require database access
- the UI silently fail due to missing data

If `client_decisions` is missing when the system needs it, the backend must **auto-seed** it before returning payloads or attempting link minting.

