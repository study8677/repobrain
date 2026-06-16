# Multi-tenant user membership + credential model v1 (design only)

> **Note on title.** This document was originally titled "Operator multi-tenant credential model" because the founding failure (§1.2) was an operator failure. Revision 2 (2026-06-15 07 UTC+4) extends the scope to **every user who can act in more than one tenant** — operators **and** clients who run multiple businesses (§1.4). The file path stays as `OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md` for link-stability; the model itself is `user_tenant_memberships` (§2.3) and applies to both shapes.

## Stream boundary and approved vocabulary (2026-06-15 07 UTC+4)

This document belongs to the **CorpFlow multi-tenant platform stream**. It is intentionally separate from any single tenant's delivery stream. The platform stream owns:

- Core-centralised tenant switching (this doc).
- The user / tenant **membership matrix** (this doc).
- The **cross-tenant contamination audit** (`docs/operations/MULTI_TENANT_CONTAINMENT_AND_VISUAL_SEPARATION_AUDIT.md`).
- The **Core Capability / Tenant Deployment / Tenant Override / Promotion to Core** model (defined below; canonical home is the audit doc §5).
- **Tenant visual separation requirements** (`components/TenantChromeHeader.js` v1 implements the baseline — see audit doc §6).
- **Tenant isolation tests** (`node-tests/user-tenant-membership-tampering.test.mjs` — see §9.5b).
- **Audit trail requirements** for tenant-scoped actions (§7).

This document is **not** the implementation surface for any specific tenant's delivery work (Living Word, LuxeMaurice, future tenants). Living Word Mauritius and LuxeMaurice are referenced only as **illustrative tenants** — the same way "Tenant A" and "Tenant B" might be used in a generic spec. No edit anywhere in this thread may mutate Living Word artifacts, the T1 Delivery Reality Audit, Living Word chatbot scope, Living Word sandbox scope, or any Living Word tenant data unless Anton explicitly instructs that.

### Approved nouns (use these everywhere in this doc and the audit doc)

| Noun | Meaning | Examples in this repo |
|---|---|---|
| **Core Capability** | Reusable, CorpFlow-owned functional unit. Lives in `lib/`, `api/`, `pages/`, `components/`; configuration *defaults* live in `automation_playbooks` (when `tenant_scope='factory'`), `docs/`, and seeders. Code is shared by all tenants. | The `/change` Change Console route; the CMP router; the persistent `<TenantChromeHeader />`; the public-site renderer in `lib/server/tenant-site-public.js`. |
| **Tenant Deployment** | The tenant-specific *activation* of a Core Capability. A capability that has zero tenant deployments is shipped but unused; a capability with N deployments is in production for N tenants. | A `tenants` row + a `tenant_hostnames` row + a `tenant_personas` row together constitute a Tenant Deployment of the public-site + login + Change Console capabilities. |
| **Tenant Override** | A tenant-specific *difference* on top of a Tenant Deployment — config value, visual asset, instruction, process step, or workflow variant. Overrides live on the same tenant row (e.g. `tenant_personas.personaJson.website_draft`) or in a tenant-scoped child table. | LuxeMaurice's gold theme + multilingual i18n; future tenant logos uploaded under `tenant_personas.personaJson.media.logo_url`. |
| **Promotion to Core** | An anonymised improvement that started life as a Tenant Override and is rolled up into the Core Capability — typically as a new default in `automation_playbooks` (`tenant_scope='factory'`) or a new field shape in a seeder. Promotion always passes through Anton; the source tenant is anonymised; other tenants get the new default only via a separate forward-promotion packet. | Future: a CRM stage definition that a tenant refined, anonymised and promoted to become the Core default for new tenant onboardings. |

Two rules that follow from these nouns:

1. **A Tenant Override never silently affects another tenant.** Cross-tenant inheritance only happens through an explicit Promotion to Core followed by a forward-promotion packet. See audit doc §5.
2. **A Core Capability is owned by the platform stream; a Tenant Deployment + its Overrides are owned by the tenant's delivery stream.** This document only changes Core Capabilities and the membership matrix; it does not change any tenant's Deployment or Overrides. Living Word's content, branding, chatbot prompt, and CRM data are Tenant Overrides — out of scope here.

### Implementation gate

§10 of this document spells out an 8-packet implementation plan (IM-1 … IM-8). That plan exists for **design completeness** — to prove the design is decomposable into reviewable units and to give Anton a clear approval surface. It is **not** authorisation to begin implementing. Each IM packet starts only after Anton's explicit, per-packet approval, per `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md` and the auto-applied rules `.cursor/rules/security-sensitive-changes.mdc` + `.cursor/rules/predeploy-decision-checks.mdc` + `.cursor/rules/delivery-reality.mdc`.

Status: design proposal, read-only, no code or DB changes implied by this document. Implementation lives in separate packets gated by Anton's explicit approval and the security review checklist.

Author: Cursor (in session 2026-06-15 04 UTC+4) at Anton's direction; revision 2 added in session 2026-06-15 07 UTC+4 per the new owner directive "Multi-tenant membership matrix implementation plan".

Audience: Anton (PM); Cursor / future contractors / future internal agents who will implement this; security reviewer who will sign off before any auth/session change ships.

## Revision history

- **r1 — 2026-06-15 04 UTC+4 — Operator-only design.** Founding incident triage (§1.2) and target operator credential model (operator-only membership matrix; single-tenant client unchanged). Packet split IM-1 … IM-5.
- **r2 — 2026-06-15 07 UTC+4 — Extended scope to multi-tenant clients + factory-master capability + 8-packet split.** Per Anton's "Multi-tenant membership matrix implementation plan" directive: (a) the membership matrix now covers operators **and** clients who hold accounts in more than one tenant (§1.4, §2.1, §4.8); (b) the table is recommended to be named **`user_tenant_memberships`**, not `operator_tenant_memberships`, so non-operator multi-tenant clients are first-class without a future rename (§2.3.A); (c) Anton's blanket access is modelled as a single `auth_users.factory_master = true` capability rather than N seeded rows, so newly onboarded tenants are reachable by Anton without a re-seed (§2.6); (d) **users with exactly one membership skip the picker** and go straight into their tenant (§4.0); (e) **the picker UX on Core is shared** between operators and multi-tenant clients, with the only divergence being whether "Factory tools" is visible (§4.8); (f) **the packet split expands from 5 (IM-1 … IM-5) to 8 (IM-1 … IM-8)** to separate schema from APIs from UX from enforcement from audit from deprecation, so each packet is independently reviewable + rollbackable (§10); (g) explicit security tests added for the "user cannot choose an ungranted tenant via URL / host / body / query / cookie" tampering surface (§9.5b). r1's §11 non-goal "multi-tenant client sessions" is **removed** in r2.

Companion docs:

- docs/operations/TENANT_CLIENT_LOGIN.md (canonical tenancy + login model today)
- docs/operations/MULTI_TENANT_CONTAINMENT_AND_VISUAL_SEPARATION_AUDIT.md (MT-1 audit; MT-2 schema work corresponds to IM-1 + IM-5 in r2's packet split below)
- docs/operations/SECURITY_REVIEW_CHECKLIST.md (mandatory before any auth/session change)
- docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md sections 3.7 (auth/security logic changes) and 3.6 (tenant migration)
- lib/cmp/README.md (CMP action gates this design extends)
- artifacts/quality-audits/2026-06-11-living-word-mauritius/t1-onboarding-delivery-reality-audit.md (the live failure that motivated this design)
- .cursor/rules/security-sensitive-changes.mdc (always-on triggers)
- .cursor/rules/delivery-reality.mdc (verdict discipline for the eventual implementation packets)

Founding incident: 2026-06-15 04:12 UTC+4. After T1 onboarding for tenant living-word-mauritius, Anton signed in to https://living-word-mauritius.corpflowai.com/login from a fresh Incognito window and landed on /change rendering "LuxeMaurice - Change Console" with "Session: tenant (luxe-maurice)". Diagnostic JSON read of the four T1 DB rows confirmed all rows were correct (auth_users.tenant_id = living-word-mauritius for the bootstrap row). The login flow in lib/server/auth.js line 193 honours the row's tenant_id correctly. Conclusion: the form actually submitted a Lux-bound username because the password manager autofilled across the cookie/credential domain *.corpflowai.com. The system worked correctly; the model is the defect.

This document specifies the target model that makes today's failure mode structurally impossible.

---

## 1. Current model and failure mode observed today

### 1.1 Current model (as of 2026-06-15)

CorpFlow runs one Vercel deployment that serves multiple tenant subdomains under *.corpflowai.com. Authentication uses the auth_users table with two relevant levels:

| level | What it means today | Sees what on /change |
|---|---|---|
| tenant | Bound 1-to-1 to a single tenant via auth_users.tenant_id. Used by tenant clients (Lux Anais, future Living Word leadership, etc.). | Their tenant only. |
| admin | Factory operator (CorpFlow team, including Anton). Recognised by public/login.html line 869 to surface "factoryTools". | Factory tools. There is no UI today for an admin session to operate inside a specific tenant's /change queue. |

Login flow (lib/server/auth.js): given (username, password), look up auth_users.findUnique({ where: { username } }), validate the password against that row, set session.tenant_id = row.tenantId. The comment on line 193-194 is explicit: "Password proves identity; scope is always auth_users.tenant_id (ignore request tenant_id mismatch)."

For Anton to act inside a specific tenant's /change today, a per-tenant level=tenant credential must be provisioned (e.g. bootstrap+living-word-mauritius@corpflowai.com). That row's only purpose is to give an operator a tenant-scoped session. It is a workaround, not a real church-leadership identity.

### 1.2 Failure mode

The cookie/credential domain is *.corpflowai.com. Browsers' password managers therefore offer auto-fill suggestions for any saved credential on any *.corpflowai.com host. The operator's password manager has many credentials saved under that domain (their own admin credential, every tenant client credential they ever provisioned for testing, every bootstrap+ row).

When the operator opens https://living-word-mauritius.corpflowai.com/login and the form is empty, the password manager autofills whichever credential it considers most-recently-used or alphabetically-first. The operator presses Enter without auditing what filled. The form posts a Lux-bound username, the server validates, the session binds to luxe-maurice (correctly per the row's tenant_id), the operator lands on /change rendering Lux content (correctly, given the session). The host says living-word-mauritius; the session says luxe-maurice; today's /change does not surface that mismatch loudly.

Concretely on 2026-06-15 04:12 UTC+4:

- Host = living-word-mauritius.corpflowai.com (tenant_hostnames row resolves to tenant_id = living-word-mauritius)
- Session = luxe-maurice (auth_users.tenant_id of the row whose password matched what the form posted)
- Page heading = "LuxeMaurice - Change Console", real Lux master ticket cmosw1jx0000lj04l1jzv02 displayed.

This is a host-session mismatch. The lib/server/auth.js code does emit a tenant_host_session_mismatch flag (line 383) and public/change.html has client-side redirect logic on it (line 5253), but the live /change route on the deployment is served by pages/change.js (Next.js SSR) which does not run that redirect. Even if it did, the underlying problem - "an operator can authenticate one tenant on the wrong tenant's host" - would still be present; the redirect is a band-aid over a missing model.

### 1.3 Per-tenant credentials are not the right shape for operators

Operators (CorpFlow team) work across all tenants. Today the model forces them to maintain N credentials, one per tenant, all under the same parent domain. Three structural consequences:

1. Password manager confusion - exactly today's failure mode.
2. Provisioning friction - every new tenant onboarding requires creating a bootstrap+<tenant> row purely so the operator can verify /change works. This bootstrap row is documented in tenant-onboarding-scope.md as a "workaround", which is a tell.
3. Audit trail weakness - actions taken by Anton-via-bootstrap+living-word-mauritius and Anton-via-bootstrap+luxe-maurice are logged as different identities. There is no persistent operator identity in the audit trail; each is a tenant-scoped row.

The model that makes these three structural problems disappear is the standard SaaS workspace switcher pattern: one operator identity, an N-to-N tenant-membership table, a session field for "currently acting in tenant X", and a UI picker for switching.

### 1.4 Multi-tenant clients have the same need (added 2026-06-15 07 UTC+4, r2)

The original failure (§1.2) and the original mitigation (§1.3) were framed as operator-only. In r2, the model is widened: a **client** can also legitimately hold accounts in more than one tenant.

Worked examples of multi-tenant clients we either have or expect:

- A Mauritius business owner who operates **two villas** under one corporate identity but each villa is provisioned as its own tenant (so each has its own brand, public site, and Change Console). They must be able to sign in once and reach either villa without re-authenticating.
- A future church umbrella that runs **Living Word Mauritius** plus a second congregation as separate tenants for content / branding isolation but shares one person as the operator-of-record on the client side.
- A reseller / agency arrangement where one human represents **two paying CorpFlow clients** and needs the same picker we give operators.

Today, the only way for any of those people to access two tenants is **two separate credentials** under `*.corpflowai.com`. That re-creates the exact failure mode from §1.2 (password-manager autofill crossing tenants), this time on the client side, not just the operator side. The fix is identical: one user identity, an N-to-N membership table, a single picker on Core when there is more than one membership.

The two consequences for the rest of this document:

1. The membership table is **not operator-only.** Its schema applies to any `auth_users` row — operator (`level='admin'`) or client (`level='tenant'`) — that needs access to more than one tenant. The naming recommendation in §2.3.A reflects this.
2. The Core picker is **not operator-only.** Multi-tenant clients reach the same picker page on `core.corpflowai.com/change` when their session has more than one membership. The picker page renders without "Factory tools" for clients (§4.8). Single-membership users — whether client or operator — go straight into their tenant and never see the picker (§4.0).

The original operator-only fields (`session.acting_tenant_id`, the `requireCoreHost` gate, the audit five-tuple) generalise cleanly: replace "operator" with "user" everywhere the design treats those concepts. The few places where operator-specific behaviour stays (factory tools surface, factory-master capability) are called out explicitly.

### 1.5 Required user flows — single index (r2)

The owner specified nine flows the design must support. The table below maps each to the section of this doc that defines it and the implementation packet (§10) that ships it. CI / Preview live-tests for each flow are the responsibility of the named packet.

| # | Flow | Defined in | Shipped in |
|---|---|---|---|
| 1 | Anton logs in on Core and sees all tenants. | §2.6 (factory-master capability gives implicit access to all `tenant_status='Active'` rows) + §4.8 (operator flavour of the picker, with Factory tools visible). | IM-1 (capability) + IM-3 (picker) + IM-5 (login resolver). |
| 2 | Contractor logs in on Core and sees only granted tenants. | §2.3 (`user_tenant_memberships`) + §2.6 (`factory_master=false`) + §4.8 (operator flavour, no Factory tools when `factory_master=false`). | IM-1 + IM-3 + IM-5. |
| 3 | A client with one tenant logs in and lands directly in that tenant. | §4.0 (skip-picker rule for `memberships.length === 1`). | IM-5 (login redirect resolver). |
| 4 | A client with multiple businesses logs in and can choose among only their granted tenants. | §4.8 (client flavour of the picker — only their own tenants, no Factory tools entry). | IM-3 (picker UX) + IM-5 (session). |
| 5 | A tenant host shows "Switch workspace" only when the authenticated user has more than one allowed tenant. | §4.5 (redirect-only "Change tenant" / "Switch workspace" link on tenant hosts) — extended by r2 to apply to clients as well as operators. | IM-4 (tenant-host link). |
| 6 | Clicking "Switch workspace" returns to `core.corpflowai.com/change`. | §4.5 (link is a plain `<a href="https://<CORPFLOW_CORE_HOST>/change?mode=switch">` — no local API call). | IM-4. |
| 7 | Core sets `acting_tenant_id` server-side. | §3.2 (session payload), §6.2 (`POST /api/operator/switch-tenant`), §5.6 (Core-host-scoped). | IM-5 (session shape + switch endpoints). |
| 8 | Tenant APIs use `effective_tenant_id` only after membership validation. | §5.1 (always-derive rule), §5.2 (alignment), §6.4 (existing APIs migrate), §6.5 (`requireTenantSession` re-check). | IM-6 (enforcement). |
| 9 | Audit records `actor_user_id` and `acting_tenant_id` for every tenant-scoped action. | §7.1 (two identities per row), §7.2 (schema additions), §7.3 (canonical five-tuple for switch events). | IM-1 (columns) + IM-7 (population). |

Every flow above has at least one negative test in §9.5b. Flows 5 / 6 / 7 specifically have T-7 (tenant-host switch rejection), T-3 (body tampering on switch), T-4 (race-against-revoke); flow 8 has T-1 / T-2 / T-5 / T-11; flow 9 is verified by the post-deploy `SELECT actor_user_id, count(*) FROM automation_events WHERE ... GROUP BY 1` in IM-7's evidence step.

---

## 2. Target user credential model

### 2.1 Three user shapes (r2)

The table below replaces r1's two-tier table. It separates the **identity tier** (`auth_users.level`) from the **membership shape** (`COUNT(user_tenant_memberships WHERE user_id = ? AND revoked_at IS NULL)`), because in r2 both `level='admin'` and `level='tenant'` may have one or many memberships.

| Shape | `auth_users.level` | Effective membership count | Lands directly in a tenant on login? | Sees the Core picker? | Real-world examples |
|---|---|---|---|---|---|
| **Single-tenant client** | `tenant` | 1 (`auth_users.tenant_id` + 1 membership row OR just `auth_users.tenant_id` during the back-fill window) | **Yes — straight in** (§4.0). | No. | Living Word Mauritius leadership; Lux Anais; the vast majority of clients today. |
| **Multi-tenant client** (r2 new) | `tenant` | ≥2 (one membership row per tenant they own) | No — picker on Core (§4.8). | Yes — **client-flavoured picker** (no "Factory tools" entry). | A Mauritius business owner running two villa tenants; a future church umbrella spanning two congregation tenants. |
| **Operator without blanket access** | `admin`, `factory_master=false` | ≥1 (explicit membership rows for the subset of tenants they are granted) | If exactly 1 membership and no factory tools needed → straight in (§4.0). Otherwise picker on Core. | Yes if ≥2 memberships, or if they want to reach "Factory tools". | A future CorpFlow contractor granted access to Luxe + Living Word only. |
| **Operator with blanket access (factory master)** | `admin`, `factory_master=true` | All active tenants implicitly (§2.6); no explicit rows required | If a *single* tenant is hinted via host or `?tenant=` they land there directly with a clear "Acting in <tenant>" cue; otherwise picker on Core. | Yes — full picker including "Factory tools". | **Anton today.** |

Three properties carried by all four shapes:

1. **Tenant clients keep today's behaviour by default.** Single-tenant clients (the dominant shape) see no picker, no dropdown, no "Switch workspace" link. The model only surfaces switching when there is genuine multi-tenancy.
2. **The credential is always one identity.** Even a multi-tenant client signs in once with one credential. The picker is the *workspace* selector, not a re-authentication step.
3. **Switching always walks back to Core (§2.5).** Tenant hosts never own a switch decision; this is true regardless of whether the multi-tenant user is an operator or a client.

The asymmetry that remains: **only operators ever see "Factory tools"** (§4.8). Multi-tenant clients see a picker that lists their tenants and nothing else.

### 2.2 Why level=admin is the right home for operators

- The row schema already exists.
- public/login.html already discriminates on level === 'admin' (line 869).
- The login flow already handles the admin code path (lib/server/auth.js line 245).
- Adding a new level (e.g. operator) would fragment the model and force every existing call site to gain a new branch. Re-using admin and adding the membership and acting_tenant_id fields on top is the smaller, lower-risk change.

The semantics of admin shift slightly: today admin == "factory operator who sees factory tools". Tomorrow admin == "factory operator who can also choose to act inside any tenant they have membership in". The factory-tools surface stays available when no tenant is selected; tenant-scoped /change becomes available when a tenant is selected.

### 2.3 New table: `user_tenant_memberships` (r2 — renamed from `operator_tenant_memberships`)

```text
user_tenant_memberships
  id                cuid                PK
  user_id           string              -> auth_users.id            (level may be 'admin' OR 'tenant')
  tenant_id         string              -> tenants.tenant_id
  role              string              default 'member'            ('member' | 'operator' | 'admin' | 'owner'; see § 2.3.B)
  capability        string              nullable                    (finer cap; e.g. 'billing', 'content'; v1 always null and reserved for future)
  enabled           boolean             default true                (soft toggle; "paused" without losing the row)
  granted_at        timestamp           required
  granted_by        string              -> auth_users.id            (whoever granted access; bootstrap seed = self / 'system')
  revoked_at        timestamp           nullable                    (hard-revoked; row is no longer effective)
  disabled_at       timestamp           nullable                    (audit-friendly companion to enabled=false: WHO/WHEN turned the toggle off)
  notes             text                nullable                    (required when manually revoking/disabling; free-text "reason")

  unique  (user_id, tenant_id) WHERE revoked_at IS NULL
  index   (user_id)
  index   (tenant_id)
  index   (user_id, enabled, revoked_at)  /* the hot path: "active memberships for this user" */
```

A row grants `user_id` the right to act inside `tenant_id`. Revocation is soft (`revoked_at IS NOT NULL`) so the audit trail survives. The boolean `enabled` is the "paused" toggle for short-term suspension (e.g. operator on leave) without losing the grant; `disabled_at` records who/when turned it off; for v1, an effective membership requires `enabled=true AND revoked_at IS NULL`. Granting and revoking is gated server-side — see §9.4.

The `role` column is reserved (§2.3.B); v1 stores it for future fine-grained authorisation but does not branch on it.

Seed at IM-1 ship time:

- For every existing `level='tenant'` user with a non-null `auth_users.tenant_id`: insert one membership row `(user_id, auth_users.tenant_id, role='member')`. This makes the existing single-tenant clients first-class in the new table without changing their behaviour.
- For every existing `level='admin'` user we want to grant blanket access: set `auth_users.factory_master=true` (§2.6) — **no explicit per-tenant rows required**. For Anton, this is the canonical posture. For future contractors with curated access, leave `factory_master=false` and seed explicit `user_tenant_memberships` rows per tenant they may operate.
- Bootstrap+`<tenant>@corpflowai.com` rows are **not** touched in IM-1 (deprecated in IM-8).

### 2.3.A Naming recommendation — `user_tenant_memberships`

**Recommended name: `user_tenant_memberships`** (not `operator_tenant_memberships`).

Reasoning, in priority order:

1. **The shape is genuinely shared (§1.4, §2.1).** Multi-tenant clients have the same access pattern as operators: one identity, N tenants, picker on Core. Naming the table `operator_*` implies a tier (`level='admin'`) that the row schema does not actually enforce. Naming it `user_*` matches what the row is — a user-to-tenant grant — and avoids a future rename + foreign-key migration when the first multi-tenant client lands.
2. **Foreign keys stay correct under both shapes.** `user_id -> auth_users.id` is unambiguous; `operator_user_id -> auth_users.id` would either need a per-row constraint that the target row is `level='admin'` (lockable migration risk if a row is ever inserted before the trigger lands) or would need to be relaxed later for clients.
3. **Audit fields stay readable.** `actor_user_id` (the audit five-tuple in §7.3) and `user_id` (this table) share the same vocabulary; `operator_user_id` would force a translation column-name everywhere.
4. **Backwards-mapping is cheap.** Anywhere a code path needs to say "this is an operator membership", it can derive that from `JOIN auth_users ON auth_users.id = user_id AND auth_users.level = 'admin'`. The table itself stays generic.

Rejected alternative: `user_workspaces`, `account_tenant_grants`, `workspace_memberships`. All three would force a project-wide vocabulary swap (tenant is the canonical noun in CorpFlow code and docs) and bury the foreign-key relationship under marketing-flavoured words.

### 2.3.B Role column reservation (forward compatibility, no v1 branching)

`role` is stored but not used for permission discrimination in v1. The intended progression:

| Role value | Means | When v1 stores it |
|---|---|---|
| `member` (default for clients) | "Has access to this tenant; no special elevation." | Single-tenant client back-fill; multi-tenant client grants. |
| `operator` | "CorpFlow team operating on behalf of the tenant; sees Factory tools when `factory_master=true`." | Future operator grants where `factory_master=false`. |
| `admin` (tenant admin) | "Tenant-side admin; future: can grant other client users membership into this tenant." | Not used in v1 — reserved for the multi-tenant-client owner who will eventually grant access to colleagues. |
| `owner` | "Client owner / billing contact." | Not used in v1 — reserved for future billing surface. |

v1 reads `role` only for audit display (`actor_label`) and for the operator-vs-client picker flavour decision (§4.8); it does not branch on role for authorisation decisions. The reservation is documented now so the eventual IM-2 read API ships a stable shape, not a v0 shape that has to break.

### 2.4 What this design does not change

- Tenant clients keep exactly today's behaviour. Their auth_users row stays level=tenant, their session stays bound to one tenant_id, they never see a picker.
- Cookie domain stays *.corpflowai.com. The model addresses the failure mode at the application layer (host-acting-tenant alignment check), not by narrowing the cookie domain (which would break existing tenant-client sessions and is a heavier change).
- Existing CMP action gates (requireDormantGate, requireFactoryMasterOnly, requireTenantSession in lib/cmp/router.js) remain in force; they get a thin shim to honour acting_tenant_id for admin sessions.

### 2.5 Architectural principle: Core owns the switch decision

The tenant-switching decision is centralised on `core.corpflowai.com/change` (or the alias `core.corpflowai.com/change?mode=switch`). Core is the only host that:

- reads the user-to-tenant access matrix (`user_tenant_memberships`; see §2.3),
- displays the list of allowed tenants to the operator,
- accepts and executes a switch by setting or changing `session.acting_tenant_id` server-side,
- accepts a "leave acting mode" (clear `acting_tenant_id`),
- writes the switch audit row.

Tenant hosts (e.g. `lux.corpflowai.com/change`, `living-word-mauritius.corpflowai.com/change`) **do not own the switch decision**. They may surface a single-purpose "Change tenant" button for level=admin sessions whose membership count is greater than one; that button is a redirect-only pointer back to Core. It is never a local picker, never a dropdown that shows other tenants, and never an endpoint that can mutate `acting_tenant_id` from the tenant host.

This principle is binding on every implementation packet below. Where a section in this document discusses the picker, the workspace switcher, or the leave-tenant affordance, it refers to Core unless explicitly stated otherwise.

Why Core and not the tenant host:

- **Neutral context.** Core has no tenant context bound to its host (`tenant_hostnames` does not map `core.corpflowai.com` to any tenant), so the picker can list every tenant the user has access to without violating the host-acting-tenant alignment rule (§3.4).
- **Single trust boundary.** All switch logic, all membership reads, all audit writes happen on one host. Reviewers, security gates, and rate limits target one surface, not N.
- **No cross-tenant chrome on tenant hosts.** Tenant hosts only ever render their own tenant's chrome. The user never sees a list of other tenants while inside a tenant — the only way to leave is to click back to Core.
- **Confused-deputy resistance.** A tenant host cannot be coerced (via a malicious form, CSRF, or open redirect) into switching the user into a different tenant context, because tenant hosts have no switch endpoint.

### 2.6 Factory-master capability — Anton's blanket access (r2)

Anton must reach every tenant — present and future — without depending on someone (or a cron) remembering to insert a fresh row into `user_tenant_memberships` whenever a tenant is onboarded. r1 proposed seeding one row per tenant for Anton; r2 replaces that with a single boolean capability.

**New column:** `auth_users.factory_master boolean NOT NULL DEFAULT false`.

Semantics:

- `factory_master = true` AND `level = 'admin'` ⇒ the user has **implicit membership in every tenant where `tenants.tenant_status = 'Active'`**, with `role='operator'`. No explicit `user_tenant_memberships` rows are required. New tenants are automatically reachable as soon as the `tenants` row exists.
- `factory_master = true` AND `level = 'tenant'` ⇒ rejected at write time. The capability is operator-only; a write attempt that combines them is a 400 in the membership grant API and a CI test (IM-1 unit test).
- `factory_master = false` (the default) ⇒ behaviour as today; effective memberships are exactly the rows in `user_tenant_memberships` for that `user_id`.

Helper (referenced throughout §6 and §10):

```text
function getEffectiveMemberships(user_id) {
  const user = auth_users.findUnique({ id: user_id });
  if (!user) return [];
  if (user.level === 'admin' && user.factory_master === true) {
    return tenants.findMany({ where: { tenant_status: 'Active' } })
                  .map(t => ({ tenant_id: t.tenant_id, role: 'operator', source: 'factory_master' }));
  }
  return user_tenant_memberships.findMany({
    where: { user_id, revoked_at: null, enabled: true },
  }).map(m => ({ tenant_id: m.tenant_id, role: m.role, source: 'membership' }));
}
```

Why a capability and not "seed one row per tenant":

- **No re-seed step at tenant onboarding.** Today, every new tenant onboarding would need a `user_tenant_memberships` insert for Anton or he would be locked out until someone runs a script. A boolean removes that operational coupling.
- **Honest audit.** Every audit row produced by Anton in any tenant still carries `actor_user_id = anton.id` (§7.3). The `source = 'factory_master'` field on the helper output lets the audit query distinguish "explicit grant" from "implicit blanket access" if a future review wants that.
- **Easy revocation.** Demoting Anton to non-blanket is a single column flip; rebuilding explicit memberships is also one script. Less brittle than maintaining a denormalised list of rows.
- **Composable.** The picker UX (§4.8) reads `getEffectiveMemberships(user_id)` once — it does not need a branch for "is this user a factory master". The single code path keeps the UI honest.

Interaction with `requireFactoryMasterOnly` (the existing CMP gate):

- Today `requireFactoryMasterOnly` checks `session.level === 'admin'` only.
- In r2 (IM-6) it tightens to `session.level === 'admin' AND auth_users.factory_master === true AND session.acting_tenant_id === null`. This is the right shape: factory-only endpoints (tenant onboarding, hostname mapping) should only be reachable by a true factory master who is currently in the picker / factory context. A non-blanket operator (`factory_master=false`) operating in tenant X gets a 403 on those endpoints, as do all clients.
- The tightening is a **breaking change** for any future contractor who is given `level='admin'` but should not have factory-master capability; they would lose access to today's factory endpoints. v1 has exactly one operator (Anton) so the tightening is safe to ship at IM-6 time, but the change must be flagged in the security review (§9.4).

Seed at IM-1 ship time:

- `UPDATE auth_users SET factory_master = true WHERE id = '<anton>'` — exactly one row affected, verifiable.
- No `user_tenant_memberships` rows required for Anton.
- Every other existing `level='admin'` row (if any) keeps `factory_master = false`; they get explicit memberships in a separate scoped seed if/when they need them.

---

## 3. Proposed session shape

The session cookie payload extends. Today's tenant-session shape stays unchanged. The admin-session shape gains two fields.

### 3.1 Tenant client session (unchanged)

```text
{
  "ok":          true,
  "level":       "tenant",
  "user_id":     "<auth_users.id>",
  "username":    "<email>",
  "tenant_id":   "<tenant_id, fixed>",
  "iat":         <issued-at-seconds>,
  "exp":         <expiry-seconds>
}
```

### 3.2 Operator session (extended)

```text
{
  "ok":               true,
  "level":            "admin",
  "user_id":          "<auth_users.id>",     // persistent operator identity
  "username":         "<email>",
  "acting_tenant_id": "<tenant_id> | null",  // null = factory chrome / picker; non-null = tenant context
  "iat":              <issued-at-seconds>,
  "exp":              <expiry-seconds>
}
```

Two key invariants:

1. user_id is the persistent operator identity. It is the same across every acting_tenant_id the operator sets. Audit events log user_id alongside acting_tenant_id so every action has a real-person attribution and a tenant context.
2. acting_tenant_id is server-set only. It is mutated via POST /api/operator/switch-tenant after server-side validation that the operator has membership in the target tenant. It is never trusted from a client-supplied form value or query parameter.

### 3.3 Cookie versus payload

The cookie name and signing secret stay the same (CORPFLOW_SESSION_COOKIE, SOVEREIGN_SESSION_SECRET). The payload changes. Old tenant-client sessions remain valid - the new fields are absent, the absence is interpreted as "tenant client" by the auth code's level check. This is forward-compatible.

Old admin sessions in flight at deploy time will not have acting_tenant_id; they read as null, which is the correct "show the picker" state. No forced logout required at cutover.

### 3.4 Host-acting-tenant alignment rule

For every server-side request, compute three values:

```text
host_tenant_id   = lookup tenant_hostnames where host = req.host
session_level    = session.level
effective_tenant_id =
  if session_level === 'tenant'   -> session.tenant_id
  if session_level === 'admin'    -> session.acting_tenant_id
  else                            -> null (anonymous)
```

Then enforce the alignment rule on every tenant-scoped surface:

```text
if effective_tenant_id is null:
  -> render anonymous chrome / login form (login_route from /api/ui/context decides which one)

if effective_tenant_id !== host_tenant_id:
  -> respond 409 (or redirect to picker) with hint:
     "This host belongs to <host_tenant_id>; your session is acting on
      <effective_tenant_id>. Switch tenant or change host."

if effective_tenant_id === host_tenant_id:
  -> proceed; load tenant-scoped data filtered by effective_tenant_id
```

This single rule, enforced server-side on every tenant-scoped request, makes today's failure structurally impossible. Anton's autofill scenario would either present the picker (acting_tenant_id null) or fail loudly (acting_tenant_id mismatch) - it cannot silently render a different tenant's content.

---

## 4. Tenant picker UX (Core-centralised)

The picker is **only on Core**. Tenant hosts surface a redirect-only "Change tenant" link for users with multi-tenant access; they never render a local picker or local dropdown of other tenants.

### 4.0 Single-membership users skip the picker entirely (r2)

The picker is a *workspace* selector. A user with **exactly one effective membership** has no workspace to pick. Such users must land directly inside their tenant on login. This applies symmetrically to clients and operators:

| User shape (from §2.1) | Effective memberships | Login UX |
|---|---|---|
| Single-tenant client | 1 (back-filled from `auth_users.tenant_id` at IM-1) | After signing in on `<tenant>.corpflowai.com/login`, lands directly on `<tenant>.corpflowai.com/change`. Never sees Core. Never sees the picker. |
| Operator with exactly one explicit membership and `factory_master=false` | 1 | After signing in on `core.corpflowai.com/login` or on the tenant host, lands directly on `<tenant>.corpflowai.com/change`. The "Change tenant" link on the tenant host (§4.5) stays **hidden** for them. |
| Multi-tenant client | ≥2 | Picker on Core (§4.8). |
| Operator with `factory_master=true` (Anton) | All active tenants implicitly + Factory tools | Picker on Core unless a single-tenant hint is supplied (e.g. they signed in directly on the tenant host with a host-bound bookmark). |

Server-side rule, enforced inside `handleAuthLogin` and in the post-login redirect resolver (IM-5):

```text
const memberships = getEffectiveMemberships(session.user_id);
if (memberships.length === 1 && session.level === 'tenant') {
  session.acting_tenant_id = memberships[0].tenant_id;       // implicit; clients always have acting=primary
  redirect = canonicalTenantHostUrl(memberships[0].tenant_id) + '/change';
} else if (memberships.length === 1 && session.level === 'admin' && !user.factory_master) {
  session.acting_tenant_id = memberships[0].tenant_id;
  redirect = canonicalTenantHostUrl(memberships[0].tenant_id) + '/change';
} else {
  session.acting_tenant_id = null;
  redirect = `https://${CORPFLOW_CORE_HOST}/change?mode=switch`;
}
```

Important: the "skip picker" rule **does not** weaken the host-acting-tenant alignment rule (§3.4). The redirect lands on the canonical tenant host; the alignment rule then runs as usual on that host's first request and confirms `acting_tenant_id === host_tenant_id`. The picker is bypassed for usability, never bypassed for security.

If a multi-tenant client tries to brute-force their way into a tenant they do not have membership in (by editing the URL after login, by changing the host header, by setting a tenant_id query parameter, or by manually editing the cookie before the server re-signs it on switch), the alignment rule + the `requireTenantSession` re-check (§6.5) blocks them with `403 NO_MEMBERSHIP` or `409 TENANT_HOST_ACTING_MISMATCH`. The tampering tests in §9.5b cover every vector.

### 4.1 The two surfaces

| Surface | Host | What it shows for level=admin sessions | What it shows for level=tenant sessions |
|---|---|---|---|
| **Core picker** | `core.corpflowai.com/change` (also reachable as `core.corpflowai.com/change?mode=switch`) | The full list of tenants the operator has membership in, plus "Factory tools" and "Sign out". This is the only place that lists other tenants. | Not applicable — tenant clients never reach Core. The host-policy gate on Core rejects level=tenant sessions (or redirects them to their own tenant host). |
| **Tenant host /change** | `<tenant>.corpflowai.com/change` (e.g. `lux.corpflowai.com/change`, `living-word-mauritius.corpflowai.com/change`) | Normal Change Console for the active tenant, **plus** a single "Change tenant" button (redirect-only) when the operator has membership in more than one tenant. No dropdown. No list of other tenants visible on this host. | Normal Change Console for that tenant. **No "Change tenant" button. No picker affordance of any kind.** |

The asymmetry is deliberate. Tenant clients see exactly one tenant — their own. Operators see one tenant at a time on tenant hosts; the only way to switch is to walk back to Core.

### 4.2 First load after operator login

After sign-in, an operator (level=admin) lands at the host they posted credentials to. Two cases:

1. **Operator signs in on Core.** `session.acting_tenant_id` is null. Core renders the picker view (operator identity + membership list + "Factory tools" entry + sign-out). No tenant-scoped data is loaded.
2. **Operator signs in directly on a tenant host** (e.g. they bookmarked `lux.corpflowai.com/login`). The host-acting-tenant alignment rule (§3.4) sees `acting_tenant_id === null` on a tenant host as a mismatch and redirects the operator to `https://core.corpflowai.com/change?mode=switch`. Core then renders the picker as in case 1.

The picker page does not load any tenant-scoped data. It only knows the user identity, the list of tenants they may switch into (from `getEffectiveMemberships(user_id)` — see §2.6 — which reads `user_tenant_memberships` plus the `factory_master` implicit expansion), and (for operators with factory-master) "Factory tools". This separation is deliberate — the picker must work even when the user's previous `acting_tenant_id` pointed at a tenant that has since been disabled or had memberships revoked.

### 4.3 Selecting a tenant on Core

Clicking "Switch to this tenant" on the Core picker calls `POST /api/operator/switch-tenant` (the endpoint is host-scoped to Core — see §6.2). The server:

1. Validates the operator session (level=admin).
2. Validates the request host is Core.
3. Validates membership via `getEffectiveMemberships(session.user_id)` (§2.6): the helper returns either the explicit `user_tenant_memberships` rows (`revoked_at IS NULL AND enabled = true`) or the factory-master implicit expansion. The target `tenant_id` must appear in the helper's output.
4. Validates the target tenant exists and `tenant_status === 'Active'`.
5. Sets `session.acting_tenant_id = <chosen>` and re-issues the cookie (cookie domain remains `*.corpflowai.com` so it carries to the tenant host on redirect).
6. Writes the switch audit row (see §7.3 for the exact five-tuple).
7. Responds with the canonical tenant host's `/change` URL.

The browser then either follows the redirect (Option A below) or stays on Core (Option B below). The recommended choice is **Option A**.

### 4.4 Option A vs Option B for what happens after the switch

**Option A — redirect operator to the chosen tenant host's `/change` (recommended).**

The Core picker responds with `{ ok: true, acting_tenant_id: <chosen>, redirect: "https://<chosen>.corpflowai.com/change" }`. The browser navigates to that URL. The session cookie set by Core (with domain `*.corpflowai.com`) is presented at the tenant host. The tenant host computes `host_tenant_id === acting_tenant_id`, the alignment rule (§3.4) passes, and the tenant's Change Console renders with that tenant's chrome.

Pros:

- Preserves the host-acting-tenant alignment invariant (§3.4) without exception. Every tenant-scoped request continues to satisfy `host_tenant_id === effective_tenant_id`.
- Preserves tenant chrome. Lux looks like Lux. Living Word looks like Living Word. There is no second rendering path that has to "look like tenant X" while running on Core.
- Source-host attribution in audit rows aligns with the tenant being acted upon (every action on tenant X happens on tenant X's host), which makes log triage simpler.
- Keeps Core narrow. Core only has to render the picker, the Factory chrome, and a small set of operator endpoints — no tenant content rendering on Core.

Cons:

- One extra redirect hop after the switch.
- If the chosen tenant host is having a transient outage, the redirect lands on a 5xx; the operator can navigate back to Core and pick a different tenant (acceptable degradation).

**Option B — render `/change` on Core in the chosen tenant's context.**

The Core picker stays on Core after the switch. Core's `/change` then loads tenant data filtered by `effective_tenant_id` and renders Core chrome (or attempts to render the chosen tenant's chrome on Core).

Pros:

- No extra redirect.
- One host through the entire operator session.

Cons:

- **Breaks the alignment invariant.** `host_tenant_id` (Core, which maps to no tenant) ≠ `acting_tenant_id` (the chosen tenant). The §3.4 rule would have to be relaxed for Core, which weakens the model and adds a per-host special case.
- **Forks tenant chrome.** Either Core renders generic chrome and tenant CSS / branding is stripped (operators see different visuals than clients on the same data), or tenant CSS is loaded into Core (introducing a second rendering path that has to track every tenant's branding choices). Both are worse than letting the tenant host render its own chrome.
- **Weakens audit-source attribution.** Every operator action on tenant X then logs `source_host = core.corpflowai.com`, which is correct but less informative than logging the actual tenant host the operator was working on.
- **Larger blast radius for any Core bug.** Today Core hosts factory tools and a small operator surface. Option B would make Core also a tenant-data renderer, doubling the surface that has to be hardened.

**Recommendation — Option A.** Cleaner alignment, cleaner chrome, smaller new surface. Option B is rejected for v1. If a future packet wants the no-redirect feel, the right path is to make the redirect imperceptible (e.g. Core responds with the new cookie + a 302 + the tenant host serves /change quickly), not to fork chrome onto Core.

### 4.5 Tenant-host "Change tenant" button (redirect-only)

When an operator (level=admin) is acting inside a tenant on a tenant host and has more than one membership, the tenant host's `/change` shows a single "Change tenant" button in the chrome (top bar or sidebar). The button:

- Is a plain `<a href="https://core.corpflowai.com/change?mode=switch">Change tenant</a>` (or equivalent `Link` in Next.js).
- Does **not** trigger any local API call.
- Does **not** open a dropdown listing other tenants.
- Does **not** know the operator's full membership set; that information lives on Core.
- Is hidden from level=tenant sessions and from level=admin sessions whose membership count is exactly one.

This button is the only switching affordance ever shown on a tenant host. It is a pointer, not a switcher.

The button text is "Change tenant" or "Switch workspace" (the implementation packet picks one and is consistent). The implementation must not include a caret or any visual hint that it expands; treat it as a navigation link.

### 4.6 Leaving tenant context

A "Leave tenant context" affordance lives on Core only. From a tenant host, the operator clicks "Change tenant" to return to Core; on Core, they can either pick another tenant (calls `POST /api/operator/switch-tenant`) or click "Leave tenant context" (calls `POST /api/operator/leave-tenant`, which clears `acting_tenant_id` and renders the picker / Factory chrome).

Tenant hosts do not surface a "Leave tenant context" affordance. The only way out of a tenant is via Core.

### 4.7 Picker host policy

`core.corpflowai.com` must not be mapped to any tenant in `tenant_hostnames`. This is what gives Core its neutral host. The implementation packet must include a check-and-document step: "Confirm `tenant_hostnames` has no row whose `host` is `core.corpflowai.com` (or any other configured Core host)." If a future change ever wants to bind Core to a tenant, this design must be revisited because the alignment rule then no longer permits the picker to list other tenants.

The Core host is held in env: `CORPFLOW_CORE_HOST` (default `core.corpflowai.com`). All host-scoping checks below read from this env, so changing it is a one-line config change, not a code search.

### 4.8 Client-flavoured picker on Core (r2)

A multi-tenant **client** (`level='tenant'`, ≥2 memberships per §2.1) lands on the same `core.corpflowai.com/change?mode=switch` page as an operator. The page renders one of two **flavours** based on session level, computed entirely server-side:

| Section of the picker | Operator flavour (`level='admin'`) | Client flavour (`level='tenant'`) |
|---|---|---|
| Identity line | "Signed in as `<email>` — operator." | "Signed in as `<email>`." |
| Membership list | All tenants where `getEffectiveMemberships(user_id)` returns a row, with role badge ("operator" for factory-master implicit rows, "operator" for explicit operator rows, "member" / "admin" / "owner" for client rows once §2.3.B roles are wired). | Only the client's own tenants — exactly the rows in `user_tenant_memberships` for the client's `user_id`. No implicit factory-master expansion (clients are never factory masters per §2.6). |
| "Factory tools" entry | Visible when `auth_users.factory_master = true`. Hidden otherwise (so a non-blanket operator does not see factory chrome). | **Never visible.** A client never has access to factory tools regardless of how many tenants they own. |
| "Leave tenant context" entry | Visible when `session.acting_tenant_id !== null`. | Visible when `session.acting_tenant_id !== null`. Returns the client to the picker, not to factory chrome. |
| Sign-out button | Visible. | Visible. |

What stays identical between flavours:

- Both flavours call exactly the same `POST /api/operator/switch-tenant` endpoint (the endpoint name keeps its `operator` prefix for r2 to avoid renaming the route + breaking link history; the endpoint is generic — see §6.2 for the r2 update). Both flavours go through Core (§5.6); both write the same canonical five-tuple audit row (§7.3); both honour the alignment rule (§3.4) on the redirect.
- Both flavours use the same `data-tenant-chrome-switcher` slot on tenant hosts (today reserved by the v1 MT-5 chrome — see `components/TenantChromeHeader.js`).
- Both flavours forbid local switcher UI on tenant hosts (§4.5, §9.6b).

Why the same page, two flavours, instead of two pages:

- One reviewer surface; one set of CSRF, host-scoping, and grant checks.
- A client who is later granted operator status (or vice versa) does not need a different URL.
- The factory-tools-only difference is a single conditional render, not a fork.

Implementation note (IM-3): the page is gated on `session.level !== 'anonymous'` and accepts both `tenant` and `admin`. Today's "Factory tools" branch already keys on `level === 'admin'`; the new "client-flavoured picker" branch is the same gate inverted plus a check that `getEffectiveMemberships(user_id).length >= 2`. Single-membership users never reach this page (§4.0 redirects them straight into their tenant).

---

## 5. Server-side tenant isolation rules

### 5.1 Always derive effective_tenant_id

Every tenant-scoped API handler derives effective_tenant_id at the top of the handler. There is no case where the handler trusts a tenant_id supplied in the body, query, or path. effective_tenant_id is a derived value, not an input.

```text
function deriveEffectiveTenantId(req) {
  const session = decodeSession(req);
  const hostTenantId = lookupTenantHostname(req.host);
  let effectiveTenantId = null;

  if (session?.level === 'tenant') {
    effectiveTenantId = session.tenant_id;
  } else if (session?.level === 'admin') {
    effectiveTenantId = session.acting_tenant_id ?? null;
  }

  return { hostTenantId, effectiveTenantId, session };
}
```

### 5.2 Enforce alignment

Every tenant-scoped handler returns 409 (or a 302 redirect) when `hostTenantId !== effectiveTenantId`. The redirect target is **always** `https://<CORPFLOW_CORE_HOST>/change?mode=switch` (Core picker) for level=admin sessions, never a local picker on the tenant host. Anonymous (`effectiveTenantId === null`) on a tenant host renders the login form; anonymous on Core renders the picker (or the login form if the operator is not signed in); anonymous everywhere else gets a 401 / login redirect.

### 5.3 Filter every DB query

Every Prisma query against tenant-scoped tables (cmp_tickets, automation_events, telemetry_events, tenant_personas, tenant content tables, etc.) MUST include where: { tenantId: effectiveTenantId } (or its equivalent for tables that key off tenant_id by other column names). No exceptions, no defaults, no fallback-to-first-row. A missing effectiveTenantId is an error, not a permission to read.

This is already the de-facto rule today (see lib/cmp/router.js gating); the design simply codifies that the rule continues to apply in admin sessions, with effectiveTenantId derived from acting_tenant_id rather than session.tenant_id.

### 5.4 Factory-only endpoints

Endpoints gated by requireFactoryMasterOnly (e.g. tenant onboarding, hostname mapping, host-map management) remain restricted to admin sessions. They additionally require acting_tenant_id === null, i.e. the operator is in factory chrome, not in a tenant context. An admin session with acting_tenant_id set should hit factory-only endpoints with a 403 ("Leave tenant context to use factory tools"). This protects the operator from accidentally running a factory action while their visual context is a specific tenant.

### 5.5 No cross-tenant DB query from a level=admin tenant context

When acting_tenant_id is set, the level=admin session is logically equivalent to a level=tenant session for the duration of that tenant context, with the audit-trail addition that user_id is the operator's persistent identity. The same isolation rules apply. There is no "operator can see across tenants while in tenant X's context" capability in v1; if a future packet wants cross-tenant reporting, it ships as a separate factory-only surface, not as a hidden privilege of in-tenant admin sessions.

### 5.6 Core owns the switch decision

The endpoints that mutate `acting_tenant_id` (`POST /api/operator/switch-tenant`, `POST /api/operator/leave-tenant`) are **host-scoped to Core**. The handler reads `req.host`, normalises it (lower-case, strip port), and rejects with `403 SWITCH_NOT_ALLOWED_FROM_HOST` when `req.host !== CORPFLOW_CORE_HOST`. This is enforced at the handler entry point, before session validation, so a tenant host cannot even probe the endpoint to learn membership state.

Tenant hosts must not import or expose any code path that calls `switch-tenant` or `leave-tenant`. The "Change tenant" button on tenant hosts is a navigation link to Core, not an API call. A code-level review item in IM-2 and IM-3 (§9, §10) is "grep tenant-host pages and confirm no fetch / form post targets `/api/operator/switch-tenant` or `/api/operator/leave-tenant`".

If Core is ever extended to multiple hosts (e.g. a backup `corpflow-core.example`), the env value becomes a comma-separated allow-list and the host check matches any entry in the list. The list is small and explicit; tenant hosts never appear in it.

### 5.7 APIs reject acting on a tenant outside membership

Independent of the host check, every call to `switch-tenant` re-validates membership at the moment of the call (not at login time) via `getEffectiveMemberships(session.user_id)` (§2.6). A user whose membership is revoked while their session is live cannot continue to switch into the revoked tenant. The next switch attempt fails with `403 NO_MEMBERSHIP`. If they were already acting inside the revoked tenant when the revoke happened, the next tenant-scoped request from their session fails alignment (or fails an explicit "membership-still-valid" check inside `requireTenantSession`, see §6.5). This is the canonical "no acting on a tenant not granted in `user_tenant_memberships` (and not implicitly granted via `factory_master`)" rule.

---

## 6. API behavior for admin/operator sessions vs tenant sessions

### 6.1 GET /api/ui/context (extended)

Existing fields preserved. New fields for admin sessions:

```text
{
  ...
  "session": {
    "logged_in":          true,
    "level":              "admin",
    "user_id":            "<auth_users.id>",
    "username":           "<email>",
    "tenant_id":          null,                    // legacy field; null for operator sessions
    "acting_tenant_id":   "<tenant_id> | null",    // new
    "operator_memberships": [                      // new; only present for level=admin
      { "tenant_id": "luxe-maurice",          "name": "Luxe-Maurice",          "host": "lux.corpflowai.com" },
      { "tenant_id": "living-word-mauritius", "name": "Living Word Mauritius", "host": "living-word-mauritius.corpflowai.com" }
    ]
  },
  "tenant_host_session_mismatch": <derived>,       // see below
  ...
}
```

For tenant-client sessions, operator_memberships is absent (or empty); the rest is unchanged. tenant_host_session_mismatch evaluates as today for tenant clients (host_tenant_id !== session.tenant_id) and as host_tenant_id !== session.acting_tenant_id for admin sessions; null acting_tenant_id on a tenant host is mismatch=true (operator must pick before continuing).

### 6.2 POST /api/operator/switch-tenant (new) — Core host only

```text
Request:
  Method: POST
  Host:    must equal CORPFLOW_CORE_HOST (e.g. core.corpflowai.com)
  Headers: cookie (session), CSRF token (see 9.5)
  Body:    { "tenant_id": "<target>" }

Server:
  1. Require req.host === CORPFLOW_CORE_HOST
       -> on mismatch, respond 403 SWITCH_NOT_ALLOWED_FROM_HOST (do not reveal whether session is valid)
  2. Require session.level === 'admin'
  3. Require getEffectiveMemberships(session.user_id) (§2.6) to include tenant_id
     (rejects revoked / disabled rows; honours factory_master implicit expansion for operators)
  4. Require tenants row exists for tenant_id with tenant_status === 'Active'
  5. Capture from_tenant_id = session.acting_tenant_id (may be null)
  6. Set session.acting_tenant_id = tenant_id; re-issue cookie (domain *.corpflowai.com)
  7. Insert automation_events row (the audit five-tuple, see §7.3):
       event_type   = 'cmp.operator.switched_tenant'
       actor_user_id = session.user_id
       payload      = {
         operator_user_id:   session.user_id,
         from_tenant_id:     <captured>,
         to_tenant_id:       tenant_id,
         timestamp:          <ISO 8601 UTC>,
         source_host:        req.host,        // always equals CORPFLOW_CORE_HOST when this row is written
         ip:                 req.ip,
         ua:                 req.headers['user-agent']
       }
       tenant_scope = 'factory'   (operator-level event, not tenant-level)
  8. Respond:
       { "ok": true, "acting_tenant_id": tenant_id, "redirect": "https://<canonical-host>/change" }

Errors:
  403 SWITCH_NOT_ALLOWED_FROM_HOST   (req.host !== CORPFLOW_CORE_HOST)
  401 NOT_LOGGED_IN
  403 LEVEL_NOT_OPERATOR
  403 NO_MEMBERSHIP
  404 TENANT_NOT_FOUND
  409 TENANT_NOT_ACTIVE
  403 CSRF_INVALID
```

The host check is the first check, before session validation, so a tenant host cannot use the endpoint to probe membership state. It is also an explicit defence-in-depth: even if a future code path on a tenant host accidentally targets this endpoint, the server rejects it.

### 6.3 POST /api/operator/leave-tenant (new) — Core host only

```text
Request:
  Method: POST
  Host:    must equal CORPFLOW_CORE_HOST
  Headers: cookie (session), CSRF token

Server:
  1. Require req.host === CORPFLOW_CORE_HOST
       -> on mismatch, respond 403 SWITCH_NOT_ALLOWED_FROM_HOST
  2. Require session.level === 'admin'
  3. Capture from_tenant_id = session.acting_tenant_id (may be null already)
  4. Set session.acting_tenant_id = null; re-issue cookie
  5. Insert automation_events row:
       event_type    = 'cmp.operator.left_tenant'
       actor_user_id = session.user_id
       payload       = {
         operator_user_id:   session.user_id,
         from_tenant_id:     <captured>,
         to_tenant_id:       null,
         timestamp:          <ISO 8601 UTC>,
         source_host:        req.host,
         ip:                 req.ip,
         ua:                 req.headers['user-agent']
       }
       tenant_scope = 'factory'
  6. Respond:
       { "ok": true, "acting_tenant_id": null, "redirect": "https://<CORPFLOW_CORE_HOST>/change" }
```

### 6.3a Tenant-host UX endpoints

There is **no** `POST /api/operator/switch-tenant-from-tenant-host` endpoint and no equivalent. Tenant hosts surface only the "Change tenant" link (an `<a href>` to Core), so they need no API surface for switching at all. `GET /api/ui/context` on a tenant host still returns `operator_memberships.length` so the UI knows whether to render the link, but the membership-list array itself MAY be omitted (or returned) on tenant hosts — the implementation packet decides; the design constraint is that the tenant-host UI does not need the full list to render the redirect-only button.

### 6.4 Existing tenant-scoped APIs

Every existing tenant-scoped API in api/ and lib/cmp/ replaces its current "trust session.tenant_id" pattern with a call to deriveEffectiveTenantId(req), then enforces the alignment rule and filters the DB query by effectiveTenantId. Most call sites are already using lib/cmp/router.js gates; the change is therefore localised to those gates plus a small number of direct handlers.

The visible behaviour for tenant-client sessions does not change. The visible behaviour for admin sessions changes only in that they now respect acting_tenant_id consistently.

### 6.5 CMP router gates

Three gates already exist in `lib/cmp/router.js`. One new gate is added in r2.

| Gate | Today | After (r2) |
|---|---|---|
| `requireTenantSession` | Allows `level=tenant` on the matching tenant host | Allows `level=tenant` on the matching tenant host AND the tenant is in `getEffectiveMemberships(session.user_id)` (re-checked per request — closes the multi-tenant-client membership-revoked-mid-session gap as well as the operator one), OR allows `level=admin` with `acting_tenant_id === host_tenant_id` AND the tenant is in `getEffectiveMemberships(session.user_id)`. |
| `requireDormantGate` | High-impact tenant action gate | Same; additionally records `actor_user_id` alongside `tenant_id` in the audit row. Applies symmetrically to multi-tenant clients (the gate does not distinguish operator from client; the user just has to have a valid membership for the acting tenant). |
| `requireFactoryMasterOnly` | `level === 'admin'` only | `level === 'admin'` AND `auth_users.factory_master === true` AND `session.acting_tenant_id === null`. This is a deliberate tightening (§2.6). Today's behaviour ships safely because the only `level='admin'` row is Anton; future non-blanket operators get a 403 from factory endpoints as intended. |
| **`requireCoreHost` (new)** | n/a | Allows the request only when `req.host === CORPFLOW_CORE_HOST`. Wraps `POST /api/operator/switch-tenant`, `POST /api/operator/leave-tenant`, the future `POST /api/membership/grant`, `POST /api/membership/revoke`, and any other user-management mutation endpoint. Returns `403 SWITCH_NOT_ALLOWED_FROM_HOST` on mismatch. |

The membership re-check inside `requireTenantSession` is what closes both:

- The original operator gap r1 identified: "operator was already inside tenant X when their membership got revoked".
- The r2 multi-tenant-client gap: "client had an active session with `acting_tenant_id = T2` when their membership in `T2` was revoked or `enabled=false`". Without the re-check, the client would keep operating until session expiry.

The check is one indexed lookup per request (covered by the `(user_id, enabled, revoked_at)` index in §2.3) and is a small cost relative to the rest of the handler.

Each existing gate gets a small extension; no gate is removed.

---

## 7. Audit trail requirements

### 7.1 Two identities per audit row

Every audit row written by an operator session must record both:

- actor_user_id - the persistent operator identity (auth_users.id of the level=admin row).
- tenant_id - the acting tenant context the row was produced under (session.acting_tenant_id at the time of the action).

Tenant-client rows are simpler: actor_user_id = session.user_id (the level=tenant row's id), tenant_id = session.tenant_id.

### 7.2 Schema additions

| Table | Today | Add |
|---|---|---|
| automation_events | tenant_id, event_type, payload, ... | actor_user_id (string nullable, for backfill safety; required for new rows produced by operator-mediated actions). Index on actor_user_id. |
| telemetry_events | tenant_id, ... | actor_user_id (same rules). |
| cmp_tickets.console_json.history[] | Existing free-form history entries | Each operator-authored history entry includes { actor_user_id, actor_label } so the client-facing change log can render "CorpFlow operator" or the operator's actual name per tenant policy. |

The actor_user_id column is added as nullable to avoid a long backfill blocking deploy. New rows must populate it; existing rows stay null.

### 7.3 Operator switch event — required five-tuple

`POST /api/operator/switch-tenant` emits `cmp.operator.switched_tenant`. `POST /api/operator/leave-tenant` emits `cmp.operator.left_tenant`. Both events are tagged `tenant_scope = 'factory'` (`tenant_id = null` on the row itself) because they are operator-level, not tenant-level.

Every switch event row MUST carry the following five fields. This is the canonical operator-switch audit shape:

| Field | Source | Meaning |
|---|---|---|
| `actor_user_id` | `session.user_id` (level=admin) | The persistent operator identity. Same value across every switch event the operator ever produces. |
| `from_tenant_id` (a.k.a. `previous_acting_tenant_id`) | `session.acting_tenant_id` captured **before** the switch | The tenant the operator was acting as immediately before the switch. `null` means "operator was at the picker / Factory chrome". |
| `to_tenant_id` (a.k.a. `new_acting_tenant_id`) | The validated target tenant_id (or `null` for `leave-tenant`) | The tenant the operator is acting as immediately after the switch. |
| `timestamp` | server clock at the moment the row is inserted | ISO 8601 UTC, second-precision or finer. Stored alongside the standard `created_at` row column for redundancy. |
| `source_host` | `req.host` (lower-cased, port stripped) | The host that received the switch request. By design this always equals `CORPFLOW_CORE_HOST` because the endpoints are Core-host-scoped (§5.6, §6.2, §6.3); it is recorded anyway so that any future deviation from the rule is auditable, and so the audit is robust against a misconfigured allow-list. |

`ip` and `ua` are recorded as supplementary forensic fields but are not part of the canonical five-tuple. They live in the same payload row.

These rows sit in a new "operator activity" view that factory master can query. Because every row carries `actor_user_id`, the query "every action operator X has taken across all tenants in the last 30 days" is a single indexed scan.

### 7.4 Client-facing visibility

Tenants do not see the operator's email or auth_users.id by default. The cmp_tickets.console_json.client_view layer continues to render "CorpFlow operator" as the actor for operator-mediated actions. The actor_user_id is recorded server-side for audit but not exposed in the client view unless a tenant explicitly requests transparent operator attribution (a future, opt-in policy not in this design).

### 7.5 Querying operator activity

Factory master can query "every action taken by operator X across all tenants" via SELECT ... FROM automation_events WHERE actor_user_id = ? - the actor_user_id index makes this cheap. Today, equivalent queries require joining auth_users on email patterns and are brittle; the new schema makes operator audit a first-class shape.

---

## 8. Migration path from current per-tenant / bootstrap credentials

> **r2 note:** The packet-level migration sequence (IM-1 … IM-8) is in §10. This section now holds only (a) the human-readable migration narrative and (b) the Living Word Mauritius specifically clause. r1's Phase 0 … Phase 5 enumeration in this section has been superseded by §10's 8-packet split.

### 8.1 Narrative

The migration adds a membership matrix and an acting-tenant session field on top of today's `auth_users` model **without breaking any existing single-tenant client session**. The order, in plain language:

1. **Add the table and the capability column** (IM-1). Nothing else changes; live behaviour is identical.
2. **Add the read APIs and the security tests** (IM-2). The tampering surface is closed by tests before any UI or session change ships.
3. **Ship the Core picker for the two flavours** (IM-3) and **the tenant-host "Switch workspace" link** (IM-4). At this point, multi-tenant users have a visible affordance but the underlying session field is not yet live.
4. **Extend the session payload + skip-picker login redirect resolver** (IM-5). Now single-membership users land directly inside their tenant, multi-membership users go through the picker, and the cookie carries `acting_tenant_id` consistently.
5. **Enforce the alignment rule everywhere** (IM-6). The Living Word Mauritius incident scenario becomes structurally impossible from this point.
6. **Populate the audit trail** (IM-7). Every action now carries `actor_user_id` + `acting_tenant_id`.
7. **Disable bootstrap rows** (IM-8) after one full billing cycle of zero usage by them, then delete in a follow-on ticket.

Each step is independently rollback-safe. The schema additions in IM-1 + IM-7 columns are additive (rollback = drop the column / table; live tenant clients unaffected). IM-5 is the highest-risk packet because it changes session payload; rollback = revert the cookie payload and the gates; old admin sessions become invalid (acceptable — operators sign in again). IM-3, IM-4 are UI; rollback = revert the page. IM-8 is reversible (re-enable rows with a single UPDATE).

### 8.2 Living Word Mauritius specifically

The `bootstrap+living-word-mauritius@corpflowai.com` row provisioned during T1 (artifacts/quality-audits/2026-06-11-living-word-mauritius/t1-onboarding-delivery-reality-audit.md) stays in place through IM-1 … IM-7 and is deprecated in IM-8. The live church-leadership `level='tenant'` credential gets provisioned in a separate packet whenever the church owner is ready (commercial path, out of scope here). When that credential is created, the IM-1 back-fill rule (one membership row per `auth_users.tenant_id`) ensures it ships as a single-tenant client and skips the picker on login (§4.0).

---

## 9. Security review checklist triggers

Per .cursor/rules/security-sensitive-changes.mdc and docs/operations/SECURITY_REVIEW_CHECKLIST.md, every implementation packet (IM-1 through IM-5) hits multiple triggers. The security reviewer must walk the checklist before merge and again before live verification.

### 9.1 Trigger paths

| Path | Why |
|---|---|
| api/operator/switch-tenant.* | New auth-flow endpoint that mutates session state. **Core-host-scoped.** |
| api/operator/leave-tenant.* | Same. **Core-host-scoped.** |
| api/ui/context.* | Context surface gains operator_memberships - reflected output sensitivity. |
| lib/server/auth.js | Session payload shape change. |
| lib/server/session.* | Cookie re-issue path on switch. |
| lib/server/host-policy.* (or new) | New `requireCoreHost` gate (§6.5). |
| lib/cmp/router.js | Gate semantics change for admin sessions. |
| prisma/schema.prisma | New table, new columns, indexes. |
| prisma/migrations/* | Migration ordering and reversibility. |
| public/login.html | Possibly minor changes if login flow advertises operator path. |
| pages/change.js | Picker branch on Core; "Change tenant" redirect-link branch on tenant hosts. **Two distinct render paths in the same file (or split into two files); review both.** |
| .env.template | New `CORPFLOW_CORE_HOST` env value (default `core.corpflowai.com`). |

### 9.2 Tenant-isolation review

- Every new query must filter by effective_tenant_id; no fallback.
- Operator with acting_tenant_id set must not be able to read any other tenant's data via any endpoint.
- Operator with acting_tenant_id null must not be able to read a specific tenant's data without going through switch-tenant.
- Cookie domain is *.corpflowai.com; the host-acting-tenant alignment rule is the protection. Verify it is enforced before any tenant-scoped DB read.

### 9.3 Session integrity

- Cookie is signed; payload tampering changes signature.
- acting_tenant_id is server-set only; reject any client attempt to set it via header, query, or body.
- Re-issuing the cookie on switch must use the same secret and same expiry semantics as login.
- Old (pre-Phase-2) admin sessions read as acting_tenant_id null - confirm this does not silently leak tenant data.

### 9.4 Membership grant / revoke

- Granting a new `user_tenant_memberships` row is a factory-master-only action via a new CMP action `membership.grant` (gated by `requireFactoryMasterOnly` + `requireCoreHost`).
- Revoking is a factory-master-only action via `membership.revoke` (same gating).
- Toggling `enabled=false` / `enabled=true` (paused membership without losing the grant) is a factory-master-only action via `membership.set-enabled` (same gating); the action populates `disabled_at` accordingly.
- Granting a `factory_master = true` capability is a factory-master-only action via `auth_user.set-factory-master` (same gating). The grantee must be `level='admin'`; a write that combines `level='tenant' + factory_master=true` is rejected with 400 (also tested in IM-1).
- All four actions emit `automation_events` with `actor_user_id` (the grantor) and the affected `user_id` + `tenant_id` (or capability). A `notes` field is required on the request body for revoke / disable / factory-master flip; the value is stored on the row and on the audit payload.
- Self-grant is forbidden — a factory master cannot grant themselves a membership or flip their own `factory_master` bit via the API. Initial seed in IM-1 is run via a script under repo control (`scripts/seed-user-tenant-memberships.mjs`), not via the API; the script logs every row it creates and writes a synthetic audit row with `actor_user_id = 'system'`.

### 9.5 CSRF

- `POST /api/operator/switch-tenant`, `POST /api/operator/leave-tenant`, `POST /api/membership/grant`, `POST /api/membership/revoke`, `POST /api/membership/set-enabled`, `POST /api/auth-user/set-factory-master` all require a CSRF token. Cookie-only auth is not enough; an attacker could otherwise embed a switch (or grant) request via CSRF in another tab and silently move the user into a different tenant context (or silently expand a grant).
- The CSRF token discipline matches existing `/api/cmp/*` mutating endpoints.
- The Core picker page (§4.8) embeds the CSRF token in a `<meta name="csrf-token">` tag plus an `X-CSRF-Token` header on every fetch; tenant hosts do not embed any CSRF token for the switcher because they have no switcher endpoints to call (§5.6).

### 9.5b Tampering / "user picks an ungranted tenant" — required failing tests (r2)

The threat model below is what §9.5 + §5.6 + §6.5 + §4.0 are designed to defeat. Every IM-2 / IM-5 / IM-6 packet ships **all** the tests below; CI gates merges on them.

For every test row, the precondition is: signed session cookie is valid for `user_A`; `user_A` is granted membership in `tenant_T1` only; `tenant_T2` exists and is Active but `user_A` has **no** membership in `tenant_T2`.

| # | Vector | Concrete request shape | Expected response |
|---|---|---|---|
| T-1 | **URL path** — user types `https://t2.corpflowai.com/change` directly in the URL bar after logging into `t1`. | GET `https://t2.corpflowai.com/change` with `user_A`'s session cookie. Session has `acting_tenant_id = t1`. | Host-acting-tenant alignment fires (§3.4). For `level='admin'` → 302 to `core.corpflowai.com/change?mode=switch`. For `level='tenant'` → 403 `TENANT_HOST_ACTING_MISMATCH` with a "sign in on this site" hint. **`t2` data MUST NOT be rendered.** |
| T-2 | **Host header** — attacker hand-crafts a request claiming `Host: t2.corpflowai.com` while pointing at the same TLS endpoint. | Any tenant-scoped GET against the request, e.g. `GET /api/cmp/router?action=ticket-list`. | Server reads `req.host = t2`. Without a valid session pointing at `t2`, the alignment rule blocks. With `acting_tenant_id = t1`, the alignment rule blocks. Status: `409 TENANT_HOST_ACTING_MISMATCH`. |
| T-3 | **Body** — user POSTs to `/api/operator/switch-tenant` with `{ tenant_id: "t2" }` from Core. | `POST https://core.corpflowai.com/api/operator/switch-tenant` with valid CSRF, valid session, body `{ tenant_id: "t2" }`. | Membership check on step 3 of §6.2 fails. Status: `403 NO_MEMBERSHIP`. No cookie re-issue. No audit row written. |
| T-4 | **Body — race against revoke** — user is in `tenant_T1`, has a brief stale-cache view of "your tenants include T2", clicks "Switch to T2" between revocation and the next request. | `POST /api/operator/switch-tenant` body `{ tenant_id: "t2" }`, same conditions as T-3. | Membership check is **re-checked at the moment of the call** (§5.7); revoked rows are excluded by the `revoked_at IS NULL` filter. Status: `403 NO_MEMBERSHIP`. |
| T-5 | **Query string** — user tries `?tenant=t2` on a tenant-scoped read endpoint, hoping it overrides session. | `GET /api/cmp/router?action=ticket-list&tenant=t2` from `lux.corpflowai.com` with `user_A`'s session (acting on `t1`). | `deriveEffectiveTenantId` ignores `req.query.tenant` (it is not an input — §5.1). The query is filtered by `effective_tenant_id = t1`. The `tenant` query parameter is silently dropped (no error, no leak). |
| T-6 | **Cookie tampering** — attacker modifies the session cookie payload to change `acting_tenant_id` from `t1` to `t2`. | Any tenant-scoped GET with the tampered cookie. | Cookie signature verification fails first (HMAC mismatch). Status: `401 SESSION_INVALID`. The tampered payload is never decoded into `req.session`. |
| T-7 | **Switch from a tenant host** — user POSTs to `/api/operator/switch-tenant` directly to the tenant host. | `POST https://lux.corpflowai.com/api/operator/switch-tenant` body `{ tenant_id: "t1" }`, valid CSRF, valid session. | `requireCoreHost` (§5.6) rejects **before** session validation. Status: `403 SWITCH_NOT_ALLOWED_FROM_HOST`. No cookie re-issue. Bonus assertion: the response body does **not** echo whether the user is logged in. |
| T-8 | **CSRF — no token** — user (or attacker tab) POSTs to switch without `X-CSRF-Token`. | `POST https://core.corpflowai.com/api/operator/switch-tenant`, valid cookie, no CSRF header, body `{ tenant_id: "t1" }`. | `403 CSRF_INVALID` from the existing CSRF middleware. No cookie re-issue. |
| T-9 | **CSRF — token from another origin** — replayed CSRF token from a different session. | Same as T-8 but with a stale or wrong token. | `403 CSRF_INVALID`. |
| T-10 | **Open redirect** — user POSTs `/api/operator/switch-tenant` body `{ tenant_id: "t1", redirect_override: "https://evil.example/" }`. | Core endpoint, valid CSRF + cookie. | `redirect_override` is **not read**. Server builds the redirect from `tenant_hostnames.canonical_host` (§9.6c). Response `redirect` is `https://t1.corpflowai.com/change`. |
| T-11 | **Skip-picker bypass attempt** — user with `getEffectiveMemberships().length === 0` (e.g. all memberships revoked) tries to reach `https://t1.corpflowai.com/change`. | GET tenant host with valid session, no effective memberships. | Alignment rule (§3.4) sees `effective_tenant_id = null` on a tenant host. `level='tenant'` → 302 to their own `/login` (they have no tenant to land in). `level='admin'` → 302 to Core picker, which then renders "no memberships" (empty list) per §9.7. |
| T-12 | **Multi-tenant client picks operator-only Factory tools** — multi-tenant client (`level='tenant'`) edits the Core picker DOM to inject a "Factory tools" choice and POSTs the implied factory-only action. | `POST /api/cmp/router?action=...` for a `requireFactoryMasterOnly` action, body crafted, valid CSRF + cookie. | `requireFactoryMasterOnly` fails on `level === 'admin' AND factory_master === true`. Status: `403 NOT_FACTORY_MASTER`. The client never reaches factory tools. |

All twelve test rows live in `node-tests/user-tenant-membership-tampering.test.mjs` (named per IM-2 in §10). They run on every PR. A regression in any of them blocks merge.

Code-review checklist item: in IM-2 PR review, the reviewer mentally walks the 12 vectors and confirms the handler under review does not introduce a thirteenth (e.g. accepting a `tenant_id` body field on a read endpoint that today does not read it). Any new acceptance widens the threat model and demands a new test row in this section before merge.

### 9.6 Logging

- No password, token, cookie, or PII in logs.
- Operator switch event is structured per the canonical five-tuple in §7.3 (`actor_user_id`, `from_tenant_id`, `to_tenant_id`, `timestamp`, `source_host`) plus supplementary `ip` and `ua`. `ip` and `ua` live in payload and are not auto-redacted, so confirm logging policy on those two fields.
- Audit rows are append-only.

### 9.6a Switch endpoints are Core-host-scoped

- `POST /api/operator/switch-tenant` and `POST /api/operator/leave-tenant` MUST reject any request whose `req.host` is not in the configured `CORPFLOW_CORE_HOST` allow-list. The check happens before session validation so a tenant host cannot use the endpoints to probe membership state.
- A test in IM-2 must exercise the rejection: send a valid signed session cookie + valid CSRF + valid body to the endpoint with `Host: lux.corpflowai.com`; expect `403 SWITCH_NOT_ALLOWED_FROM_HOST`. Repeat for at least two tenant hosts.
- Code-review item: `grep -R "switch-tenant\|leave-tenant" pages/ public/ components/` and confirm the only call sites that POST to these endpoints live on Core (e.g. `pages/change.js` Core branch, or a dedicated Core-only component). Tenant-host code paths must not reference these endpoints at all.

### 9.6b Tenant hosts must not host a local switcher

- Code-review item: `grep -R "operator_memberships\|switch-tenant\|workspace.*switcher\|tenant.*picker" pages/ public/ components/` and confirm no tenant-host render path exposes a list of other tenants. The "Change tenant" affordance on tenant hosts is a plain navigation link to Core.
- The link's `href` is read from a single helper (e.g. `coreSwitchUrl()`) so a security review can confirm it cannot be poisoned to redirect to anything other than `https://<CORPFLOW_CORE_HOST>/change?mode=switch`.
- The link is rendered only when `session.level === 'admin'` and `operator_memberships.length > 1`. Both checks happen server-side; the rendered HTML on tenant hosts for level=tenant sessions has no element matching the link selector.

### 9.6c Cookie domain interaction

- Cookie domain remains `*.corpflowai.com`. The cookie set by Core after a switch is presented at the tenant host on the redirect (Option A in §4.4); this is the intended flow.
- The redirect URL returned by `switch-tenant` is constructed server-side from `tenant_hostnames` (canonical host for the chosen tenant_id), not from any client input. There is no open-redirect vector via this endpoint.

### 9.7 Membership absence

- An operator whose memberships are all revoked sees an empty picker. They cannot reach any tenant; they cannot reach factory tools either if revocation also strips factory-master role (out of scope; document behaviour explicitly).
- A tenant deletion (rare) cascades to revoke memberships referencing it.

### 9.8 Pre-deploy gate

Per .cursor/rules/predeploy-decision-checks.mdc:

- Production identification: deployment ID, commit SHA, live URLs tested.
- Live URLs to verify after each phase: /login, /api/ui/context, /change, /api/operator/switch-tenant on the picker host and on at least two tenant hosts.
- Health-only verification is not sufficient; client-facing flows must be exercised end to end.

---

## 10. Implementation packet breakdown (r2 — 8 packets, replaces r1's 5)

Each packet follows `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md`. Below is the spine; the actual packet docs are written when each phase is approved to start.

**Why 8 packets and not r1's 5.** r1 bundled "schema + session + APIs + UX + audit" into IM-1 … IM-5 with IM-2 doing five distinct things at once. Anton's r2 directive separates schema from APIs from picker UX from tenant-host link from session shape from enforcement, so each PR is **single-purpose**, single-review, and individually rollback-safe. The trade-off is two more PRs; the benefit is no PR larger than one reviewer can hold in their head and a clean rollback boundary at every step.

**Order and dependency graph:**

```text
IM-1 schema only ────────────► IM-2 read APIs ────────► IM-3 Core picker UX
                  │                                       │
                  ├────► IM-5 session shape ──────────────┤
                  │             │                         ├─► IM-6 enforcement ──► IM-7 audit ──► IM-8 deprecation
                  │             ▼                         │
                  └────► IM-4 tenant-host "Switch workspace" link
```

- IM-1 ships first (schema is additive; safe even if nothing else lands).
- IM-2 (read APIs) and IM-5 (session shape) both depend on IM-1; they can ship in either order.
- IM-3 (Core picker UX) needs IM-2 (membership read) + IM-5 (session shape with `acting_tenant_id`).
- IM-4 (tenant-host link) needs IM-2 (to know `memberships.length`).
- IM-6 (enforcement) needs IM-5 + IM-3 in production so the picker is reachable from a 409.
- IM-7 (audit) needs IM-6 to populate `actor_user_id` on the new write paths.
- IM-8 (deprecate bootstrap rows) needs everything else live + verified for at least one full week.

**Mapping to MT-N audit packets** (`docs/operations/MULTI_TENANT_CONTAINMENT_AND_VISUAL_SEPARATION_AUDIT.md` §11):

| IM (this doc) | MT (audit doc) | Notes |
|---|---|---|
| IM-1 schema | MT-2 (partial — schema half) | |
| IM-2 membership read APIs | MT-2 (partial — APIs half) | |
| IM-3 Core picker UX | MT-3 | |
| IM-4 tenant-host link | MT-4 | |
| IM-5 `acting_tenant_id` session | MT-2 (partial — session half) | |
| IM-6 `/change` + CMP enforcement | MT-6 (negative tests) | |
| IM-7 audit trail | MT-7 | |
| IM-8 bootstrap deprecation | (not in audit; r2 lifecycle close-out) | |

### Packet IM-1 — `user_tenant_memberships` table + audit columns + factory_master capability (schema only)

**Status (2026-06-15 UTC+4): shipped locally on a feature branch.** All schema deltas, the back-fill seed script, the factory-master promotion script, and 10 new unit tests are in the repo; full `npm test` is 792/792; `npx next build` is clean; `npx prisma validate` is green. Not yet merged, not yet deployed on Vercel Production, Anton's `factory_master=true` flip is **NOT** yet applied (it is a separate operator step run after the migration deploys and Anton has confirmed his row via the read-only query in the IM-1 Delivery Reality Audit). Implementation files:

- DDL (idempotent, applied on every Vercel build via `scripts/apply-ensure-schema-build.mjs`): `lib/server/postgres-ensure-schema-statements.js` — appended at end-of-file with the comment marker `IM-1 (2026-06-15)`.
- Prisma migration (formal record; non-idempotent, expected to be marked `--applied` if ensure-schema ran first): `prisma/migrations/20260615080000_im_1_user_tenant_memberships/migration.sql`.
- Prisma schema additions (so the Prisma client knows the new model + columns): `prisma/schema.prisma` — `AuthUser.factoryMaster`, `AutomationEvent.actorUserId`, `TelemetryEvent.actorUserId`, new `model UserTenantMembership`.
- Back-fill: `scripts/seed-user-tenant-memberships.mjs` (idempotent; supports `--dry-run`; seeds `level='tenant' AND tenant_id IS NOT NULL` only; skips `level='admin'`, orphans, and disabled rows).
- Factory-master promotion (separate, one-off, operator-run): `scripts/promote-factory-master.mjs --username=<name>` (supports `--dry-run` and `--demote`; refuses to set `factory_master=true` on a `level='tenant'` row; idempotent).
- Tests (no live DB required): `node-tests/im-1-schema-shape.test.mjs` (DDL contract: presence of CHECK, partial unique, every column + index from §2.3), `node-tests/im-1-seed-idempotency.test.mjs` (fake-DB; idempotent re-run; never seeds admin / orphan / disabled / already-active rows; revoked rows do not block fresh seed).

- Goal: ship `user_tenant_memberships` + `auth_users.factory_master` + `automation_events.actor_user_id` + `telemetry_events.actor_user_id`. Backfill membership rows for every existing `level='tenant'` user from `auth_users.tenant_id`; flip `factory_master=true` for Anton.
- Definition of Done:
  - Prisma migration deployed to live; `SELECT * FROM user_tenant_memberships` shows one row per existing tenant client; `SELECT id FROM auth_users WHERE factory_master = true` returns exactly Anton's id; no behavioural change visible in `/change`, `/login`, or any tenant client flow (additive schema only — no code reads the new columns yet).
  - Unit test: insert with `level='tenant' + factory_master=true` is rejected at the DB constraint level (CHECK constraint or trigger).
  - Unit test: the soft-delete unique `(user_id, tenant_id) WHERE revoked_at IS NULL` works (insert two rows for the same `(user_id, tenant_id)` with one revoked, second insert succeeds).
- Scope: `prisma/schema.prisma` (new table + two new columns), new migration, `scripts/seed-user-tenant-memberships.mjs` (one-time idempotent backfill: reads `auth_users` where `level='tenant' AND tenant_id IS NOT NULL`, inserts memberships with `granted_by='system'`, `granted_at=NOW()`, `notes='IM-1 back-fill from auth_users.tenant_id'`), `scripts/promote-factory-master.mjs` (one-time, takes `--user-id` arg).
- Constraints: additive only; no column removal; no rename of existing columns; no read-side change (IM-2 ships the read APIs).
- Risks: migration drift between Preview and Production — mitigate via `vercel-env` smoke and `prisma migrate status`. CHECK constraint syntax differences (Postgres supports them; verify before merge). Seed script idempotency — re-runnable without duplicate-key error.
- Approval gates: Anton approves migration apply on Production; security reviewer signs off on the schema delta + the `factory_master` capability semantics (§2.6).
- Verification evidence: migration log; row count of seeded memberships (one per existing tenant client); `SELECT factory_master FROM auth_users WHERE username = '<anton>'` returns true; CHECK-constraint regression test passes locally.
- Rollback: `prisma migrate resolve --rolled-back`; drop the new table and columns; the seed script is purely additive so rollback leaves no orphan rows in `auth_users`.
- Owner: Cursor; reviewer: Anton (and security reviewer for the schema change + capability semantics).

### Packet IM-2 — membership read APIs + the 12-test tampering suite (no session-shape change yet)

- Goal: ship the read endpoints + the `getEffectiveMemberships(user_id)` helper + the full security test suite (§9.5b). **No session payload change**, **no UI change**, **no enforcement change** — IM-2 only exposes read APIs that the next two packets consume.
- Definition of Done:
  - `GET /api/membership/effective` (Core-host-scoped, requires session) returns `getEffectiveMemberships(session.user_id)` for both client and operator sessions (only the user's own memberships; never another user's).
  - `GET /api/membership/list?user_id=...` (Core-host-scoped, requires `factory_master`) returns the membership matrix for a specific user; used by future admin UX. Tenant hosts get `403 SWITCH_NOT_ALLOWED_FROM_HOST`.
  - All 12 tampering tests in `node-tests/user-tenant-membership-tampering.test.mjs` pass (§9.5b). The tests cover URL, host header, body, query, cookie tampering, switch-from-tenant-host rejection, CSRF gaps, open-redirect on switch, skip-picker bypass, and multi-tenant-client trying to reach factory tools.
  - Existing tenant-client + admin sessions continue to behave exactly as today (no payload change, no gate change).
- Scope: `api/membership/effective.js`, `api/membership/list.js`, `lib/server/effective-memberships.js` (the helper from §2.6), `lib/server/host-policy.js` (or new file) for `requireCoreHost`, `node-tests/user-tenant-membership-tampering.test.mjs`, `.env.template` for `CORPFLOW_CORE_HOST`.
- Constraints: no change to `lib/server/auth.js` session payload yet (that is IM-5). The helper is callable but no production code reads it for authorisation; tests do. No tenant-host endpoint exposes membership info.
- Risks: helper performance — verify the `(user_id, enabled, revoked_at)` index makes the query a single index seek; verify the factory-master implicit expansion does not N+1 (one `SELECT` per `tenants` row). Mitigate with a benchmark in the test file.
- Approval gates: Anton approves Preview verification (all 12 tests green) before Production deploy.
- Verification evidence: Preview logs of `GET /api/membership/effective` for Anton (returns all active tenants) + a single-tenant client (returns one row); 12 tampering tests green in CI on PR.
- Rollback: revert PR; no schema change to undo; live behaviour unaffected (no production code yet reads the endpoints).
- Owner: Cursor; reviewer: Anton + security reviewer.

### Packet IM-3 — Core tenant picker UX (Core-only; admin + multi-tenant client flavours)

- Goal: render the Core picker on `core.corpflowai.com/change` (and `?mode=switch`) for both admin sessions (with optional Factory tools per §2.6) and multi-tenant client sessions (client-flavoured per §4.8). Single-membership users never reach this page; they are redirected past it by IM-5.
- Definition of Done:
  1. Anton signs in on `core.corpflowai.com`; the picker lists every active tenant + "Factory tools" + "Sign out". Clicking "Switch to Living Word Mauritius" calls `POST /api/operator/switch-tenant` (Core-scoped) and redirects to `living-word-mauritius.corpflowai.com/change` (Option A in §4.4).
  2. A multi-tenant client (test row with `level='tenant'` and two `user_tenant_memberships` rows) signs in on `core.corpflowai.com` and sees the client flavour: only their own two tenants, **no** "Factory tools" entry.
  3. Tenant clients with exactly one membership (the dominant shape) never reach the picker — IM-5 redirects them straight in.
  4. Tenant hosts have **no local picker UI** in the rendered HTML (verified by inspecting page source from a non-Core host).
- Scope: `pages/change.js` Core branch; new helper `lib/ui/picker-flavour.js` (the flavour decision — operator vs client); rendering wired to `GET /api/membership/effective` from IM-2. Calls `POST /api/operator/switch-tenant` and `POST /api/operator/leave-tenant` from IM-5.
- Constraints: zero visual change for any tenant client whose login lands them directly in their tenant; the picker page must render server-side (or with SSR fallback) so first paint shows the membership list rather than a blank-then-hydrate flash; the picker must not pre-fetch any tenant-scoped data (it knows the membership matrix and nothing else).
- Risks: client cache leakage between tenant contexts on switch (mitigate by forcing a navigation; the cookie re-issue + redirect dumps in-memory React state); multi-tenant client accidentally rendered the operator flavour (mitigate by the `picker-flavour.js` unit test asserting flavour matches `session.level`).
- Approval gates: Anton approves Preview UX before Production.
- Verification evidence: Preview screenshots — (a) Anton's operator picker with Factory tools, (b) multi-tenant client picker without Factory tools, (c) HTML source on a tenant host with no picker / no membership list embedded.
- Rollback: revert PR; the IM-5 redirect rule (sub-clause for "0 memberships") sends the user to a static "no memberships" page; live tenant-client sessions unaffected.
- Owner: Cursor; reviewer: Anton.

### Packet IM-4 — Tenant-host "Switch workspace" link (redirect-only, ≥2 memberships)

- Goal: render a single redirect-only "Switch workspace" link in the persistent tenant chrome (`components/TenantChromeHeader.js`) when the session user has more than one effective membership. The link is a plain `<a href="https://<CORPFLOW_CORE_HOST>/change?mode=switch">` with no local behaviour. v1 MT-5 left a `data-tenant-chrome-switcher-stub="pending-mt-4"` marker for this slot.
- Definition of Done:
  - Anton, on `lux.corpflowai.com/change`, sees a "Switch workspace" link in the top chrome (he has factory-master → effective memberships count > 1).
  - A single-tenant client on `lux.corpflowai.com/change` sees no link, no button, no dropdown.
  - A multi-tenant client (two tenants) sees the same link with the same wording; clicking it lands them on the Core picker (client flavour from IM-3).
  - HTML source on tenant hosts contains no list of other tenants and no `tenant_id` value other than the active tenant's.
- Scope: `components/TenantChromeHeader.js` (extend the slot already in place from MT-5 / `data-tenant-chrome-switcher-stub`); helper `lib/ui/operator-affordances.js` (the single `coreSwitchUrl()` helper required by §9.6b); reads `memberships.length` from `/api/membership/effective` (cached for the page lifetime).
- Constraints: link wording must be consistent (recommend "Switch workspace" per the user's directive; the previous draft used "Change tenant" — IM-4 picks one and commits). Link must be a navigation `<a>` with no `onClick`. Hidden when `memberships.length <= 1`, regardless of level. Hidden for anonymous sessions.
- Risks: incorrect membership count cached after a grant/revoke during the session lifetime — mitigate by invalidating the cache on visibility change + every 5 minutes; explicit re-fetch on click.
- Approval gates: Anton approves Preview UX before Production.
- Verification evidence: Preview screenshots — (a) operator on `lux.corpflowai.com/change` with the link visible, (b) single-tenant client on the same host with no link, (c) multi-tenant client on the same host with the link → Core (client flavour).
- Rollback: revert PR; the MT-5 chrome stays in place; tenant hosts revert to "no Switch workspace link" state.
- Owner: Cursor; reviewer: Anton.

### Packet IM-5 — `acting_tenant_id` session shape + login redirect resolver (skip-picker rule)

- Goal: extend the session payload with `acting_tenant_id` for both `level='admin'` and `level='tenant'`; add the post-login redirect resolver that implements §4.0 (single-membership users skip the picker); add the Core-host-scoped `POST /api/operator/switch-tenant` and `POST /api/operator/leave-tenant` endpoints (the endpoint names keep their `operator` prefix to avoid breaking link history per §4.8; they accept both `level='admin'` and `level='tenant'` requests).
- Definition of Done:
  - Existing tenant-client sessions read `acting_tenant_id = tenant_id` (the back-fill rule: a `level='tenant'` session with one membership has `acting_tenant_id` set to that membership). No re-login required at deploy.
  - Existing admin sessions read `acting_tenant_id = null` (need to pick).
  - `POST /api/operator/switch-tenant` works on Core, rejected `403 SWITCH_NOT_ALLOWED_FROM_HOST` on every tenant host (verified for at least two tenant hosts in Preview per the test row T-7 in §9.5b).
  - `POST /api/operator/leave-tenant` works on Core only, same rejection elsewhere.
  - `GET /api/ui/context` on Core returns `acting_tenant_id` and `operator_memberships` (for `level='admin'`) / the equivalent client array (for `level='tenant'`).
  - Login redirect resolver: `level='tenant'` user with one membership lands at `<tenant>.corpflowai.com/change` directly; `level='tenant'` user with ≥2 memberships lands at the Core picker; `level='admin'` with `factory_master=true` lands at the Core picker; `level='admin'` with one explicit membership and `factory_master=false` lands at that tenant.
  - All 12 tampering tests from IM-2 (§9.5b) still pass.
- Scope: `lib/server/auth.js` (session payload + login redirect), `lib/server/session.js` (if separate; cookie re-issue path), `lib/server/host-policy.js` (consume `requireCoreHost` from IM-2), `api/operator/switch-tenant.js`, `api/operator/leave-tenant.js`, `api/ui/context.js` (`acting_tenant_id` + memberships exposure), `.env.template` for any new envs.
- Constraints: tenant-client session payload must stay backward-compatible (existing fields untouched; `acting_tenant_id` added; absent fields read as null). Switch endpoints MUST reject non-Core hosts **before** session validation (§5.6). No behaviour change for single-tenant clients whose login already lands them in their tenant host.
- Risks: cookie re-issue race conditions on switch (mitigate with `Set-Cookie` on the response of `switch-tenant` + immediate redirect; no subsequent request in the same response cycle); CSRF gaps (covered by §9.5 / T-8 / T-9 tests); host-allow-list misconfiguration (covered by T-7).
- Approval gates: Anton approves Preview verification before Production deploy; security reviewer signs off on the session payload change.
- Verification evidence: Preview logs of `/api/operator/switch-tenant` Core success + tenant-host rejection; cookie payload before/after switch (decoded server-side, never logged client-side); login redirect for each of the four user shapes (§2.1) captured in Preview screenshots.
- Rollback: revert PR; old admin sessions still valid (payload extension is additive); IM-3 picker continues to work (it reads from IM-2 endpoints, not from session payload).
- Owner: Cursor; reviewer: Anton + security reviewer.

### Packet IM-5.5 — Operator identity bootstrap (hard prerequisite for IM-6) — added 2026-06-16 11 UTC+4

- Discovery: the IM-6 readiness gate run on 2026-06-16 06:37 UTC against production Neon returned **zero** `auth_users` rows at `level='admin'`. Production admin access today is via the legacy env-master lane (`CORPFLOW_ADMIN_USERNAME` / `CORPFLOW_ADMIN_PASSWORD`), which IM-5 correction #3 intentionally preserved unchanged. IM-6's tightening (`requireFactoryMasterOnly`, `acting_tenant_id` enforcement, DB-backed membership recheck) therefore has no DB-backed admin identity to bind against, and the Living Word incident class IM-6 was designed to close cannot occur today because the DB-backed admin identity itself does not yet exist.
- Goal: create exactly one `auth_users` row at `level='admin' AND enabled=true AND factory_master=true`, so that operator login transitions from the legacy env-master lane to the DB-backed lane and produces an IM-5-shaped session (`user_id`, `acting_tenant_id`, `session_version`, `factory_master`).
- Definition of Done: the read-only verification script `scripts/verify-operator-identity-bootstrap.mjs` returns `VERDICT: READY` (exit 0); login at `/api/auth/login` returns `source: "postgres"`; legacy env-master lane still returns `source: "env"` (escape hatch preserved).
- Scope: docs/runbook + read-only verification script only. **No production writes from Cursor.** Cursor does not create rows, promote anyone, generate / receive / store / print Anton's password, compute production password hashes, run non-`SELECT` SQL, modify Vercel env vars, or alter the env-master lane.
- Owner: Anton (DB row creation + promotion via the existing `scripts/promote-factory-master.mjs`); Cursor (runbook + verification script + cross-reference in this doc).
- Constraint: this packet is configuration only. No code in `lib/`, `api/`, `pages/`, or `prisma/` is modified. The legacy env-master lane is preserved throughout (revisited in IM-8).
- Verification evidence: a re-run of the IM-6 readiness gate after Anton completes the runbook steps, with `enabled AND fm=true: 1` and the verification script's `VERDICT: READY` output.
- Rollback: `UPDATE auth_users SET enabled = false WHERE id = '<id>'` (single row, reversible); env-master keeps working through the existing fallback.
- See: `docs/runbooks/OPERATOR_IDENTITY_BOOTSTRAP_IM_5_5.md` (operator runbook), `scripts/verify-operator-identity-bootstrap.mjs` (read-only verification), `scripts/promote-factory-master.mjs` (existing approved promotion script, used as-is).

### Packet IM-6 — `/change` + CMP API enforcement (alignment rule live everywhere)

- **Hard prerequisite:** Packet IM-5.5 above must complete and the verification script must return `VERDICT: READY` before IM-6 implementation begins. The previously approved IM-6 scope (chat thread 2026-06-16 10:34 UTC+4) re-applies as-is once the gate is READY; no new IM-6 approval is required, only the gate result.
- Goal: enforce the host-acting-tenant alignment rule (§3.4) on every tenant-scoped endpoint + tighten `requireFactoryMasterOnly` (§2.6 / §6.5); enforce the membership re-check inside `requireTenantSession` on every request.
- Definition of Done:
  - Every tenant-scoped read (`/api/cmp/router?action=ticket-list`, `ticket-get`, `concierge-leads-list`, `lux-*`, etc.) derives `effective_tenant_id` from session + host context and rejects on mismatch with `409 TENANT_HOST_ACTING_MISMATCH`. The Living Word Mauritius incident scenario (admin / tenant-client mismatching) becomes structurally impossible.
  - `requireFactoryMasterOnly` rejects any session where `factory_master !== true OR acting_tenant_id !== null`. Today's behaviour for Anton is preserved when he is at the picker (`acting_tenant_id = null`); from inside a tenant context he gets 403 + a hint "Leave tenant context to use factory tools".
  - Membership revoke in IM-2's `/api/membership/revoke` immediately blocks the affected user's next tenant-scoped request (covered by T-4).
  - SSR `/change` route (`pages/change.js`) mirrors the redirect on `tenant_host_session_mismatch=true` that today only lives in `public/change.html` line 5253.
  - MT-6 negative tests from the audit doc (admin acting in T1 can't see T2 tickets; client of T1 on T2 host gets 403; cross-host switch returns 403; etc.) all green.
- Scope: `lib/cmp/router.js` (every tenant-scoped action), `lib/server/auth.js` (`requireFactoryMasterOnly` tightening), `pages/change.js` (SSR mismatch redirect), `lib/server/host-tenant-context.js` if needed.
- Constraints: no breaking change for single-tenant clients; the new redirect on mismatch matches the legacy `public/change.html` redirect verbatim; `requireFactoryMasterOnly` tightening is a security gate hardening and must be flagged in the security review.
- Risks: false positives — a legitimate admin request flagged as mismatch because the host header is stale (mitigate by canonicalising `req.host` lower-cased + port-stripped consistently; covered by an existing helper in `lib/server/host-tenant-context.js`); performance regression from the per-request membership re-check (mitigate by the index added in IM-1; expected sub-millisecond cost).
- Approval gates: Anton approves Preview verification + production deploy; security reviewer signs off on the gate tightening.
- Verification evidence: Production logs showing the 409 / 403 / 302 responses for every tampering scenario (T-1 … T-12 from §9.5b); a synthetic cross-tenant ticket-get from the admin Anton session in Preview returns 403; the legacy `public/change.html` redirect path is now matched by the SSR `pages/change.js` route (both redirect to Core picker on mismatch).
- Rollback: revert PR; tenant-isolation regressions reappear (this is the highest-value packet for security, so a rollback decision must include a re-mitigation plan).
- Owner: Cursor; reviewer: Anton + security reviewer.

### Packet IM-7 — Audit trail population (`actor_user_id` + `acting_tenant_id` everywhere)

- Goal: populate `actor_user_id` on every audit row written after the cutover; emit the canonical five-tuple (§7.3) on every switch / leave / grant / revoke / set-enabled / set-factory-master event.
- Definition of Done: new audit rows always have `actor_user_id`; factory master can query "every action user X has taken across all tenants in the last 30 days" via a single indexed scan; the five-tuple is present on every `cmp.operator.switched_tenant` / `cmp.operator.left_tenant` / `cmp.membership.granted` / `cmp.membership.revoked` / `cmp.membership.enabled_toggled` / `cmp.auth_user.factory_master_set` row.
- Scope: `lib/cmp/router.js` write paths, `lib/automation/*` event writers, `lib/cmp/_lib/change-*` if they emit events, telemetry helpers; new "operator activity" view (read-only).
- Constraints: do not break existing event consumers; the column added in IM-1 is nullable for backward compat; new writes populate it.
- Approval gates: Anton approves Production deploy; security reviewer signs off on the logging surface (§9.6).
- Verification evidence: post-deploy `SELECT actor_user_id, event_type, count(*) FROM automation_events WHERE created_at > '<cutover>' GROUP BY 1,2` shows full population; old rows still null.
- Rollback: revert PR; the column stays (IM-1 schema) but is null on rows produced after rollback.

### Packet IM-8 — Deprecate bootstrap+`<tenant>@corpflowai.com` rows + per-tenant operator credentials

- Goal: disable (set `auth_users.enabled = false`) every `bootstrap+<tenant>@corpflowai.com` row that was provisioned solely as an operator workaround for the missing multi-tenant model. Keep them disabled-not-deleted for one billing cycle. After that, delete (a separate ticket).
- Definition of Done: no operator uses any `bootstrap+` row for one full billing cycle (verified by querying audit rows for `actor_user_id` matching those rows; expect zero); Anton's admin + factory-master capability is sufficient for every tenant action via the picker; disabled rows still satisfy historical foreign-key references (audit rows reference `user_id`; the row stays, login is blocked).
- Scope: a one-time DB UPDATE setting `auth_users.enabled = false` on the bootstrap rows, plus a follow-on delete pass after the cool-down (separate ticket).
- Constraints: keep rows disabled-not-deleted for one billing cycle to satisfy any audit references; the disable is auditable via a `cmp.auth_user.deprecated` event (one row per disabled user).
- Approval gates: Anton approves the disable; Anton approves the delete after the cool-down.
- Verification evidence: `SELECT id, username, enabled FROM auth_users WHERE username LIKE 'bootstrap+%@corpflowai.com'` shows all enabled=false; audit query shows no logins on those rows for one billing cycle; Anton's recent actions all carry his persistent `user_id` (not a per-tenant bootstrap `user_id`).
- Rollback: re-enable rows (one UPDATE).

---

## 11. Explicit non-goals (v1, r2)

This design intentionally excludes:

- ~~Multi-tenant client sessions.~~ **r2: removed.** Multi-tenant clients are now in scope (§1.4, §2.1, §4.8). What remains out of scope is **client-side membership grant UX** — a client-tier user cannot grant another client membership in their tenant via UI in v1. Grant / revoke remains a factory-master-only API action (§9.4) for the v1 window; client-tier delegated admin (`role='admin'` per §2.3.B) ships in a separate packet when prioritised.
- SSO / OAuth / SAML / passkeys. Future work; not required for the model defined here.
- Fine-grained roles per membership beyond what §2.3.B documents. The `role` column exists in the schema for forward compatibility but v1 only branches on it for picker flavour (operator vs client per §4.8) and audit-display (`actor_label`), not for authorisation decisions.
- Per-tenant operator policies (e.g. "operators on Living Word must show their real name in change logs"). Future opt-in; v1 always anonymises operators in client_view.
- Operator-impersonates-client UI. The operator always acts as themselves with audit attribution; they never assume a client's identity.
- Cookie-domain narrowing (e.g. issuing per-tenant subdomain cookies). Considered and rejected for v1: it forces a forced-logout-of-everyone, breaks auth across the picker host, and is a heavier change than the host-acting-tenant alignment rule, which solves the failure mode at the application layer.
- **Tenant-host-local switcher dropdowns** of any kind. Tenant hosts may surface a redirect-only "Change tenant" link (§4.5) and nothing else; they do not list other tenants, do not call switcher APIs, and do not render any picker UI. The switcher lives on Core and only on Core (§2.5, §5.6).
- **Switching from a tenant host without going through Core.** There is no `/api/operator/quick-switch` or any equivalent endpoint that mutates `acting_tenant_id` from a tenant host. Every switch is an explicit walk back to Core. Performance optimisations that "feel" like tenant-host switching must still preserve this guarantee.
- **Rendering tenant content on Core (Option B in §4.4).** Core renders the picker and Factory chrome only. Operator-tenant action happens on the canonical tenant host.
- Mobile / native client flows. Operator flows are browser-first; native clients (if any) follow the same API contracts later.
- Client-facing audit log UI ("show me every action taken on my tenant"). A separate packet; the schema additions in this design (actor_user_id, structured switch events) make that packet straightforward when prioritised.
- New operator hostnames or DNS work beyond what is required to reach the picker page (most likely the existing core.corpflowai.com or a subpath suffices; if a dedicated hostname is needed, it is its own DNS packet).
- Anything to do with the chatbot product, FOSS CRM evaluation, ERPNext sandbox, WordPress migration, or the Living Word Mauritius commercial path. Those are separate workstreams and are explicitly out of scope.
- Code, schema, session-behaviour, or DB changes. This document is a design proposal; implementation begins only when Anton approves Packet IM-1.

---

## 12. Approval gates (this document)

This document is COMPLETE on:

1. Anton has read it and confirmed the model matches his intent.
2. The companion docs above remain consistent (no implicit contradiction with TENANT_CLIENT_LOGIN.md or SECURITY_REVIEW_CHECKLIST.md).
3. The security reviewer has skimmed sections 5, 6, and 9 and confirmed no missing trigger.

Implementation begins only after Packet IM-1 is opened, scoped per docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md, and explicitly approved.
