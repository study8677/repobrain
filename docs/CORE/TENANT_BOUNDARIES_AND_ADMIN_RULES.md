# Core vs tenant boundaries and admin rules

This document defines **how CorpFlowAI separates operator (“Core”) surfaces from client (“tenant”) surfaces**, and how **authenticated admin sessions** relate to privileged CMP and factory APIs. It is written for operators and implementers; it does **not** document secret values or break-glass custody.

**Related code (source of truth for behavior):**

- Host / surface resolution: `lib/server/host-tenant-context.js` (`buildCorpflowHostContext`, `CORPFLOW_CORE_HOSTS`)
- CMP host boundary + Dormant Gate: `lib/cmp/router.js` (`enforceCmpTenantBoundary`, `requireDormantGate`, `verifyDormantGateCredentials`, `FACTORY_ONLY_CMP_ACTIONS`)
- Session cookies: `lib/server/session.js` (`getSessionFromRequest`, `CORPFLOW_SESSION_COOKIE`)

---

## 1. Surfaces: Core vs tenant

| Surface | Meaning | Typical host |
|--------|---------|----------------|
| **Core** | Factory / operator plane. **No** client `tenant_id` is inferred from the hostname alone (avoids treating `core` as a tenant slug). | e.g. `core.corpflowai.com` when listed in `CORPFLOW_CORE_HOSTS`, or other hosts you explicitly configure as Core. |
| **Tenant** | Client workspace. `tenant_id` is resolved from **hostname map**, **subdomain under `CORPFLOW_ROOT_DOMAIN`**, apex defaults, and (when applicable) **Postgres `tenant_hostnames`** and **signed-in tenant session**. | e.g. `lux.corpflowai.com` → Lux workspace patterns in code and config. |

**LuxeMaurice marketing only:** the island / developer-led tenant homepage shell (`components/LuxeMauriceTenantPresentation.js`) renders **only** when SSR sets `site.client_ui.lux_acquisition` for `luxe-maurice`. Other tenants continue to use the generic tenant homepage component; Core and factory APIs are unchanged.

**Rule:** Anything that mutates **cross-tenant** or **factory-only** CMP state must assume **Core host + correct session**, not a tenant marketing hostname.

---

## 2. CMP: factory-only actions on tenant hosts

Certain CMP `action`s are **factory-only**: they are rejected on **tenant** surfaces before handlers run (`FACTORY_ACTION_FORBIDDEN_ON_TENANT_HOST` in `lib/cmp/router.js`).

**Operator implication:** Do not expect overseer-style or factory-queue tools to run from `lux.*` or other tenant origins; use **Core** (or the documented factory URL) for those actions.

---

## 3. Dormant Gate (privileged CMP)

For gated CMP actions, the server enforces a **Dormant Gate**: the request must present an allowed **session**, **tenant sovereign JWT** (only for explicitly allowlisted actions and env), or **factory master token** transport as implemented in `verifyDormantGateCredentials` — see `lib/cmp/router.js`.

**Non-goals for operators:**

- Do not ask others to paste **`MASTER_ADMIN_KEY`** or **`ADMIN_PIN`** into chat or tickets.
- Do not weaken or bypass Dormant Gate to “speed up” a repair; add a **narrow, Core-only, session-authenticated** maintenance path instead, then remove or disable it.

---

## 4. Admin session vs break-glass master token

| Mechanism | Role |
|-----------|------|
| **Admin HttpOnly session** (after login on Core) | Preferred for human operators: same-origin browser calls send `corpflow_session` without pasting long secrets. Some flows require **admin** payload type in addition to passing Dormant Gate (e.g. overseer audit surface). |
| **Factory master token** (`MASTER_ADMIN_KEY` / `ADMIN_PIN` in env, compared to request `token` / `x-session-token` per code) | Automation and break-glass; treat as **high sensitivity** and rotate on exposure. |

**Rule:** Product and runbooks should default to **“log in on Core, use the UI or session-credentialed POST”** for one-off repairs when possible.

---

## 5. `cmp_tickets.tenant_id` (Lux vs Core tickets)

- **`tenant_id` non-null** → ticket belongs to that **tenant workspace** (Lux queue, tenant `/change`, etc.).
- **`tenant_id` null** → ticket is treated as **Core / factory-scoped** in CMP host rules (e.g. core host must not apply tenant-only mutations the wrong way — see hard-close and host checks in `lib/cmp/router.js`).

**Rule:** “Move work to Core” means **create Core-scoped tickets** (`tenant_id` null) and **close Lux copies with an explicit migration note**, not silent reassignment of ownership in ad-hoc SQL.

---

## 6. Temporary Core-only repairs

When Infisical/Vercel env sync is unreliable but **operators can still log in on Core**, one-off repairs may expose:

- A **POST** route under `/api/factory/...` that requires **Core host + admin session only**, and
- A small **static helper page** on Core that uses `fetch(..., { credentials: 'include' })` (no secret fields).

Such endpoints must be **idempotent** (e.g. `automation_events` idempotency keys), **audited**, and **removed or disabled** (`CORPFLOW_*_ENABLED=false`) after the migration is verified. Delete the module and rewrites when retired.

---

## 7. Checklist before shipping privileged Core behavior

- [ ] Rejects **tenant** host (`surface === 'tenant'` → 403).
- [ ] Accepts only **admin** session where required (`getSessionFromRequest` → `typ === 'admin'`).
- [ ] Does not log or return secret material.
- [ ] Does not weaken Dormant Gate for normal CMP routes.
- [ ] Idempotent second call (no duplicate tickets / duplicate audit rows for the same repair version).
- [ ] Documented disable path and REMOVEME for temporary routes.

---

## 8. Where to go next

- Deployment and env loading: `docs/VERCEL_DEPLOYMENT.md`
- Security / incident: `docs/runbooks/SECURITY_OR_INCIDENT.md`
- High-level operating defaults: `docs/CORPFLOW_OPERATING_PLAYBOOK.md`
