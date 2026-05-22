# Security review checklist (CorpFlow)

**When to use:** Before **commit/push** whenever the diff touches **authentication, sessions, cookies, tenant scoping, factory gates, Prisma/data access, automation ingest/forward secrets, webhooks, or new/changed API routes** under `api/` or `lib/server/` (and related `lib/cmp/` auth paths). Humans run this for PR review; agents treat it as definition of done for those paths.

**Canonical context:** tenant and host rules — `docs/operations/TENANT_CLIENT_LOGIN.md`; automation trust — `docs/automation-framework.md`, `docs/n8n/automation-forward-recipe.md`; production bar — `docs/strategy/PRODUCTION_GRADE_CLIENT_OUTCOMES.md`.

---

## 1. Authentication & sessions

- [ ] New or changed login/session flows use **server-side** validation; secrets (`SOVEREIGN_SESSION_SECRET`, etc.) are **never** sent to the client or logged.
- [ ] Cookies use **appropriate** `HttpOnly`, `Secure`, `SameSite` for the environment (production HTTPS).
- [ ] Session lifetime and logout behavior are intentional; no “sticky” cross-tenant session without an explicit reconcile rule (see factory router / host-session gate).

## 2. Authorization & tenant isolation

- [ ] **Factory-only** routes remain gated (master admin / designated secrets), not callable from tenant browsers without auth.
- [ ] **Tenant-scoped** handlers resolve `tenant_id` from **authoritative** sources (host map, session, validated body) and **reject** cross-tenant access (`TENANT_ID_HOST_MISMATCH` pattern where applicable).
- [ ] **No** trust of client-supplied tenant id alone when it conflicts with host map or session.

## 3. Redirects & open redirects

- [ ] **`next=`**, `returnUrl`, or similar query/body parameters are **validated** (same-site allowlist or path-only) before issuing redirects after login — no arbitrary open redirect to attacker domains.

## 4. Secrets & configuration

- [ ] No new **secrets** in repo, `artifacts/`, `chat_history`, or client bundles. `.env.template` documents placeholders only; real values live in Vercel / operator vault.
- [ ] New env vars are listed in **`.env.template`** with purpose and prod/staging notes where relevant.

## 5. Webhooks, ingest, forward, outbound HTTP

- [ ] **HMAC/shared-secret** headers for automation and callbacks are **verified** (timing-safe compare where applicable).
- [ ] **SSRF:** server-side `fetch` to URLs from user or ticket content uses **allowlists** or known-safe patterns; no blind fetch to internal IPs/metadata URLs unless explicitly designed and gated.
- [ ] **Idempotency** for ingest/bootstrap remains respected when touching automation paths.
- [ ] **Outbound email** (any new path that may send mail): the change is reflected in **`docs/communications/CORPFLOW_COMMUNICATIONS_V1.md`** (event type, sender alias, approval rule), no freeform `to` / `subject` / `body` is accepted from non-server callers, the n8n webhook secret never reaches the browser, and tokens / email bodies are excluded from logs.

## 6. Data access (Prisma / SQL)

- [ ] Queries are **scoped** by tenant (or explicitly factory-global with a comment and gate).
- [ ] Raw SQL uses **parameterized** values; no string-concatenated user input into SQL.
- [ ] Schema migrations reviewed for **PII** exposure or broader table access.

## 7. Logging, errors, and responses

- [ ] Errors returned to **tenants** do not leak stack traces, internal hostnames, or secrets.
- [ ] Logs avoid **passwords, tokens, full session payloads, or raw PII**; prefer ids and redaction.

## 8. Dependencies & supply chain

- [ ] `npm audit --audit-level=high` (or CI equivalent) considered; **critical/high** issues addressed or explicitly documented with timeline.
- [ ] Lockfile **`package-lock.json`** committed; no unreviewed `npm install` of high-risk packages for trivial convenience.

## 9. Documentation

- [ ] If behavior or trust model changed, **canonical docs** updated in the same change set (`TENANT_CLIENT_LOGIN.md`, `lib/cmp/README.md`, `.env.template`, or this file’s parent ops docs as appropriate).
- [ ] If a **security or trust boundary** decision is architectural, add or reference an entry under **`docs/decisions/`** (see `docs/decisions/README.md`).

---

*Last updated: 2026-04-04 — extend when new surfaces (e.g. uploads, billing) ship.*
