# Data map & subprocessors (starter)

**Purpose:** Foundation for **B2B contracts, DPAs, and EU/Africa client questions**. Expand with your legal/commercial review — this is **technical scaffolding**, not legal advice.

## Roles (typical)

- **CorpFlow (you):** data processor or controller depending on contract; operates the app, Postgres, and configured integrations.
- **Client (tenant):** their users’ business data entered via Change Console, tickets, uploads (where enabled).

## Categories of data (high level)

| Category | Examples | Primary storage | Notes |
|----------|-----------|-----------------|--------|
| Identity / access | Email, password hashes, PIN hashes, session tokens | Postgres (`auth_users`, `tenants`) | Passwords not reversible |
| Tenant content | Ticket text, estimates, console JSON | Postgres | Scope by `tenant_id` |
| Automation metadata | Event types, payloads, idempotency keys | Postgres (`automation_events`, etc.) | May contain operational snippets |
| Logs | Vercel / platform logs | Vendor retention | Avoid PII in application logs |
| Email delivery | Reset links, notifications | Resend / n8n / Workspace SMTP | Configure per `docs/CORPFLOW_SHARED_TODO.md` |

## Subprocessors & infrastructure (maintain this list)

Review quarterly or before signing a DPA. Replace placeholders with your actual vendors and regions.

| Vendor | Role | Data touched | Region / notes |
|--------|------|--------------|----------------|
| Vercel | Hosting / edge | HTTP logs, env secrets runtime | Per Vercel account settings |
| **Neon** (`*.neon.tech`) | **Postgres database** (sole production data store; accessed via Prisma ORM) | All application data — tenants, auth, CMP tickets, automation events | AWS region per Neon project (e.g. `us-east-1`). Connection details + rotation in `docs/operations/POSTGRES_PROVIDER.md`. **Not** Prisma Postgres (`*.prisma.io`); see that doc for the naming hazard. |
| GitHub | Code, Actions, dispatch | Repo, workflow metadata | If CMP uses GitHub |
| n8n (self/hosted) | Workflow automation | Event payloads forwarded from CorpFlow | Your deployment |
| Resend (if used) | Transactional email | Email addresses, reset URLs | Per Resend DPA |

**Action:** When you add a new integration that stores or processes tenant data, add a row and link the operator runbook.

## Related docs

- `docs/operations/POSTGRES_PROVIDER.md` (Neon — canonical for the database)
- `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` (outbound email model — canonical for which events, which aliases, which approval rules)
- `docs/operations/TENANT_CLIENT_LOGIN.md`  
- `docs/operations/SECURITY_REVIEW_CHECKLIST.md`  
- `docs/runbooks/SECURITY_OR_INCIDENT.md`  
- `docs/CORPFLOW_SHARED_TODO.md` (P2 DPA / residency notes)
