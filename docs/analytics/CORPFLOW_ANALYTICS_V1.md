# CorpFlow Analytics v1 — Plausible (canonical)

**Status:** Canonical (v1, 2026-05-25; refined 2026-05-26 with the internal-vs-client-facing boundary; **scoped 2026-05-27 to apex-only step-1 rollout**).
**Architectural decisions:**

- `docs/decisions/20260525-plausible-analytics-v1.md` — Plausible vs alternatives (provider choice).
- `docs/decisions/20260526-plausible-internal-vs-client-facing-boundary.md` — destination architecture (umbrella site, apex paths internal, subdomains client-facing, tenant domains off-platform).
- **`docs/decisions/20260527-plausible-apex-only-rollout-step1.md` — current step-1 scope (apex only; standard Plausible script + `data-domain`).**

**Owner:** Anton (operator) for accounts/sites/secrets; Cursor for adapter + audit reports.
**Companion docs (read first; this doc does not restate them):**

- `docs/operations/ANALYTICS_SEARCH_CONSOLE_ROLLOUT_PLAN.md` — order of operations across surfaces.
- `docs/execution/ANALYTICS_SEARCH_CONSOLE_INDEXING_CHECKLIST.md` — per-surface checklist.
- `docs/operations/SEARCH_CONSOLE_INDEXING_ROLLOUT.md` — Search Console operator playbook (independent of analytics).
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — buyer-intent CTA discipline that drives event names.
- `docs/compliance/DATA_MAP_AND_SUBPROCESSORS.md` — Plausible Insights row (already added).

---

## 1. Decision summary (one screen, step-1 scope)

- **Provider:** Plausible Insights.
- **Step-1 scope (live today):** `corpflowai.com` apex only — single Plausible site registered for `corpflowai.com`, standard Plausible script (`https://plausible.io/js/script.js`) with `data-domain="corpflowai.com"`. `/lead-rescue` IS measured (apex public marketing).
- **Step-2 (future packet):** add `aileadrescue.corpflowai.com` to the same Plausible site's "Domains" list and to `ALLOW_HOSTS`. Optionally move `/lead-rescue` into `APEX_DENY_PATH_PREFIXES` once that subdomain is the buyer-facing surface. Architectural shape (umbrella site, multiple domains) per the 2026-05-26 ADR is preserved as the destination.
- **Sites NOT in scope (any step):**
  - `core.corpflowai.com` — factory; never measured.
  - All `<tenant>.corpflowai.com` (`lux.corpflowai.com`, `luxe.corpflowai.com`, future tenants) — CorpFlow-internal staging/working surfaces; **never measured**.
  - Apex tenant-context paths: `/concierge`, `/properties`, `/property` (Lux concierge form, Lux property listings rendered on the apex host).
  - Operator/admin routes: `/change`, `/admin`, `/login`, `/master`, `/lux-editor`, `/lux-guide`, `/sovereign-intake`, `/core-lux-migration-repair`, `/api/*`, `/_next/*`, `/client/*`.
  - Password-reset and token-bearing URLs: anything with `?token=`, `?reset=`, `?ticket=`, or substring `reset-password` / `forgot-password`.
- **Tenant client-facing marketing on tenants' own real domains** (e.g. `luxemaurice.com`): the tenant runs **their own** Plausible registration. CorpFlow's site does not track them.
- **GA4:** **not added in v1.** A future tenant-scoped exception is allowed via a separate ADR.
- **Hard gates (`docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §3):** Plausible-account creation, DNS records (custom subdomain proxy), runtime snippet install — all Anton-approved.
- **Kill switch:** `NEXT_PUBLIC_PLAUSIBLE_ENABLED` (Vercel env). Defaults OFF. Flip on once Plausible-side apex registration is verified.
- **Privacy posture:** no cookies, no fingerprint, no PII in event props. EU/UK/CH visitors do **not** see a consent banner because Plausible's collection is non-personal.

---

## 2. Stakeholder grouping — internal vs client-facing vs tenant-owned

**Refined 2026-05-26** by `docs/decisions/20260526-plausible-internal-vs-client-facing-boundary.md`. CorpFlow runs marketing across three categories of surfaces, and the analytics layer treats them very differently:

| Surface type | Examples | Plausible? | Why |
|---|---|---|---|
| **Internal product working surfaces** (apex paths) | `corpflowai.com/lead-rescue`, future `/concierge`, `/properties`, `/property/*` | **Never** | Operators iterate on the product set here before exposing to clients. Tracking would create noise from operator clicks and pollute buyer-funnel attribution. |
| **CorpFlow client-facing marketing** (apex root + dedicated subdomains) | `corpflowai.com/`, `corpflowai.com/about`, `corpflowai.com/standards`, `aileadrescue.corpflowai.com`, future `<product>.corpflowai.com` | **Yes — umbrella Plausible site** | One dashboard, filterable by hostname (apex vs lead_rescue) and path. Lets CorpFlow read its whole portfolio in one place. |
| **Tenant working surfaces** (tenant subdomains under CorpFlow) | `lux.corpflowai.com`, `luxe.corpflowai.com`, future `<tenant>.corpflowai.com` | **Never** | These are *CorpFlow-internal* preview/edit surfaces where tenants update their published sites. Not buyer-facing. |
| **Tenant client-facing marketing** (tenants' own real domains) | `luxemaurice.com`, future tenant domains | **Tenant runs their own.** Out of CorpFlow's umbrella site and out of CorpFlow code. | Stakeholder isolation by registration boundary. Each tenant's data stays with the tenant. |

### Concrete properties of the umbrella

| Concern | Approach |
|---|---|
| **Site identity** | One Plausible site (umbrella). All in-scope hostnames are added to that site's "Site Settings → Domains" in the Plausible dashboard. Switching from "one site per host" to umbrella is the 2026-05-26 refinement; per-tenant isolation is achieved by tenants' own off-platform Plausible registrations on their own domains, not by per-host site IDs in CorpFlow's account. |
| **Event-name namespacing** | All custom events carry a `marketing_surface` prop (`apex` \| `lead_rescue` \| future labels) so the dashboard can group by surface even when filtering by hostname is not enough. |
| **Cross-tenant data leakage** | The adapter never sends `tenant_id`, ticket IDs, email addresses, or any free-text input as an event prop. Plausible Auto auto-tracks pageviews; custom events strip forbidden keys (§3.4) before send. |
| **Internal/private surfaces** | Single deny-list in `lib/analytics/config.js` decides for the whole app — operator routes, internal apex paths, tenant subdomains. The script never loads on a denied surface. |
| **Dev / preview deployments** | `NEXT_PUBLIC_PLAUSIBLE_ENABLED=false` (or unset) for Preview. `*.vercel.app` and `localhost` are also deny-listed in code so a misconfigured env never leaks Preview traffic into production analytics. |

---

## 3. Event taxonomy (v1)

Every event is **(a) named by buyer intent**, **(b) tied to a specific page or component**, and **(c) free of PII**. Event names use `lower-case-kebab-with-dots` for the prefix and `Title Case With Spaces` for the human-readable Plausible "Goal" name (Plausible accepts both styles; we keep both consistent).

### 3.1 Apex (`corpflowai.com`)

| Plausible goal name (display) | Internal event name | Trigger | Props (allowed) | Props (forbidden) |
|---|---|---|---|---|
| Page view | (provider default) | Plausible auto | `path`, `referrer` | full URL with query containing tokens, `email`, `ticket_id`, `tenant_id` |
| Lead Rescue CTA Click | `apex.lead-rescue.cta-click` | Click of any of the lead-rescue buyer-intent CTAs in `components/AiLeadRescueLanding.js` | `cta_label` (canonical name from doctrine, not the visible localised text), `placement` (`hero` / `pricing` / `footer`) | none |
| Onboarding CTA Click | `apex.onboarding.cta-click` | Click of the onboarding CTA on `/onboarding` | `cta_label`, `placement` | none |
| Contact Click | `apex.contact.click` | Click of any `mailto:` / `tel:` link in apex marketing | `link_kind` (`email` \| `phone`) | the actual email/phone literal |
| Lead Rescue Form Submit | `apex.lead-rescue.form-submit` | Successful POST to the apex lead-rescue intake | `form_variant` (if A/B), `currency` (if pricing path) | `name`, `email`, `phone`, free-text fields |

### 3.2 Lead Rescue (`aileadrescue.corpflowai.com`)

> Reference table for the next event-wiring packet. v1 ships pageviews only; custom events land in a follow-up PR alongside the click handlers in `components/AiLeadRescueLanding.js`.

| Plausible goal name (display) | Internal event name | Trigger | Props (allowed) | Props (forbidden) |
|---|---|---|---|---|
| Page view | (provider default) | Plausible auto | `path`, `referrer` | full URL with token query, any PII |
| Lead Rescue CTA Click | `lead_rescue.cta-click` | Click of any of the buyer-intent CTAs in `components/AiLeadRescueLanding.js` | `cta_label` (canonical name from doctrine), `placement` (`hero` / `pricing` / `footer`), `marketing_surface: 'lead_rescue'` | the visible localised text, `email`, `name`, `phone` |
| Lead Rescue Form Submit | `lead_rescue.form-submit` | Successful POST to the Lead Rescue intake | `form_variant` (if A/B), `currency` (if pricing path), `marketing_surface: 'lead_rescue'` | `name`, `email`, `phone`, free-text fields |
| Pricing Path Click | `lead_rescue.pricing-path-click` | Click of a pricing-path card (`stripe` / `eft` / etc.) | `path_kind`, `marketing_surface: 'lead_rescue'` | none |

### 3.3 Tenant client-facing marketing — out of scope

For tenants who publish their own marketing on their own real domains (e.g. `luxemaurice.com` for Lux), the tenant runs **their own** Plausible registration. CorpFlow does not define an event taxonomy for those — the tenant decides their own goals, sender stakeholder, and access. CorpFlow's umbrella never receives that data.

Earlier drafts of this doc carried a `lux.*` event taxonomy targeted at `lux.corpflowai.com`. That was replaced on 2026-05-26 because `lux.corpflowai.com` is a CorpFlow-internal working/staging surface, not Lux's public marketing. The reference table below survives as a pattern for whatever future tenant taxonomy is needed (on the tenant's own domain, owned by the tenant) — not as in-scope work for CorpFlow's umbrella.

| Plausible goal name (display, reference) | Internal event name | Trigger | Props (allowed) | Props (forbidden) |
|---|---|---|---|---|
| Page view | (provider default) | Plausible auto | `path`, `referrer` | tenant-data fields, `console_*` |
| Concierge CTA Click | `<tenant>.concierge.cta-click` | Click of "Private concierge" / "Private enquiry" CTA | `placement` (`hero` / `card-row` / `footer`) | none |
| Property Detail View | `<tenant>.property.detail-view` | Visit to `/property/<slug>` | `property_slug` | property price, owner, internal notes |
| Property Enquiry Click | `<tenant>.property.enquiry-click` | Click of "Request details" / "Private enquiry" on a property card | `property_slug`, `placement` | property price, contact info |
| WhatsApp Click | `<tenant>.whatsapp.click` | Click of any `wa.me/…` link | `placement` | the WhatsApp number literal |

### 3.4 What never gets an event (not just forbidden, but **must not load the script**)

- `core.corpflowai.com` (factory).
- All `<tenant>.corpflowai.com` (Lux, future tenant working surfaces).
- `*.vercel.app` (Preview deployments) and `localhost` (dev).
- `/change` and any sub-route (operator console).
- `/admin/*`.
- `/login`, `/master`, `/lux-editor`, `/lux-guide`, `/sovereign-intake`, `/core-lux-migration-repair`.
- `/api/*`, `/_next/*` (these are JSON / framework internals; analytics is for HTML pages only).
- Password-reset URLs (any path containing `reset-password`, `forgot-password`).
- Any URL whose query string contains a one-time token (`?token=`, `?reset=`, `?ticket=…`).
- On the apex specifically: `/lead-rescue`, `/concierge`, `/properties`, `/property/*` (internal product working space — see ADR `20260526-plausible-internal-vs-client-facing-boundary.md`).

The adapter's deny-list (`lib/analytics/config.js`) is the single source of truth — see §5.

### 3.5 Forbidden prop values (no matter the event)

- Email addresses, phone numbers, names, free-text input.
- Tenant identifiers (`tenant_id`), ticket identifiers, lead IDs.
- Reset tokens, session tokens, JWTs, API keys.
- Full URLs with query strings (Plausible's auto path is fine; custom event paths must be the canonical pattern, not the resolved string).

If a future event needs aggregate revenue or lead-volume reporting, that lives in our own DB (`automation_events`, `cmp_tickets`, `telemetry_events`), not in Plausible.

---

## 4. Adapter design (no runtime install yet)

The runtime install is a **separate PR** Anton must approve per surface (`docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §3 hard gate). This section describes the design so the next PR can land cleanly.

### 4.1 Module layout

```
lib/analytics/
  index.js                  # public API: trackEvent, isAnalyticsEnabledForPath, getProvider
  providers/
    plausible.js            # Plausible-specific snippet + window.plausible() wrapper
    null-provider.js        # used when analytics is disabled (no-op, logs in dev)
  config.js                 # surface allow/deny lists, per-host site IDs, env reads
  events/
    apex.js                 # apex event helpers (typed)
    lux.js                  # lux event helpers (typed)
components/
  analytics/
    PlausibleScript.js      # next/script tag; conditionally rendered in pages/_app.js
```

### 4.2 Adapter contract

```js
// lib/analytics/index.js (signatures only - reference design)
export function isAnalyticsEnabledForPath(host, pathname) { /* deny-list first, allow-list second */ }
export function trackEvent(name, props = {}) { /* validates name + strips forbidden props + delegates to provider */ }
export function getProvider() { /* returns 'plausible' | 'null' based on env */ }
```

- `trackEvent` always **strips** any prop key in the per-host forbidden list (§3.4) before delegating. If the strip removes everything, the event still fires with no props (the event count itself is the signal).
- `isAnalyticsEnabledForPath` reads from `lib/analytics/config.js` deny + allow lists; it is the single gate. The script tag **does not** load on a deny-listed surface. The `trackEvent` helper additionally no-ops if the provider is `null`.

### 4.3 Provider-swappable

`lib/analytics/providers/` is the only place Plausible-specific code lives. To add Fathom or self-hosted Umami later, drop a new file in that folder, register it in `getProvider()`, switch `NEXT_PUBLIC_ANALYTICS_PROVIDER`. All event call sites stay identical. This is what makes the provider decision in `docs/decisions/20260525-plausible-analytics-v1.md` reversible.

### 4.4 Host config (apex-only step-1; umbrella shape is the destination)

`lib/analytics/config.js` (step-1, 2026-05-27):

```js
// Step-1: apex only. Step-2 will append aileadrescue.corpflowai.com per ADR 20260527.
export const ALLOW_HOSTS = Object.freeze([
  'corpflowai.com',
]);

export const MARKETING_SURFACE_BY_HOST = Object.freeze({
  'corpflowai.com': 'apex',
});
```

Adding a new CorpFlow client-facing host is two lines: append to `ALLOW_HOSTS`, append to `MARKETING_SURFACE_BY_HOST`. Then add the same hostname to the same Plausible site's "Site Settings → Domains" in the Plausible dashboard so events count under the same site.

Tenant client-facing domains (`luxemaurice.com`, etc.) are **not added here** — they're outside CorpFlow's site. See §2.

### 4.5 Snippet load strategy (standard Plausible script + `data-domain`)

- **Where:** `pages/_app.js`, conditionally rendered after `<Head>`. The mount uses `next/script` with `strategy="afterInteractive"`. Never inlined; never blocking.
- **When:** only when **all** of these are true:
  1. `process.env.NEXT_PUBLIC_PLAUSIBLE_ENABLED === 'true'` (kill switch on),
  2. `host` is in `ALLOW_HOSTS` (resolved client-side from `window.location.hostname`),
  3. `path` is not in any deny-list (`DENY_PATH_PREFIXES`, `APEX_DENY_PATH_PREFIXES` if apex, `DENY_PATH_SUBSTRINGS`, `DENY_QUERY_KEYS`).
- **Standard Plausible script (not Auto):** the Plausible site for `corpflowai.com` was registered as a standard site (verification expects `<script src=".../script.js" data-domain="…">`). The script URL is read from `NEXT_PUBLIC_PLAUSIBLE_SRC` (default `https://plausible.io/js/script.js`); the site identity is read from `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` (default `corpflowai.com`) and emitted as the `data-domain` attribute. This matches the Plausible verification probe exactly.
- **Two `<Script>` tags:** the loader (`script.js`) and a tiny init shim that attaches `window.plausible` so callers can fire custom events. Both `afterInteractive`.
- **SSR safety:** the conditional mount only renders client-side (host comes from `window.location.hostname` after hydration). The SSR HTML never contains the script tags — so a misconfigured Vercel build never leaks the snippet into a denied environment.
- **No analytics on private routes by default:** even with the env on, the deny-list in `config.js` early-returns. The deny-list is shipped in code, not env, so it cannot drift.

### 4.6 Env contract (step-1, set in Vercel Production)

All three are **public** envs (`NEXT_PUBLIC_*`) — not secrets. Set them in **Production** scope only; leave Preview + Development empty so the kill-switch reads OFF outside Production.

| Variable | Apex step-1 value | Default if unset | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_PLAUSIBLE_ENABLED` | `true` | `false` (no script loads) | Master kill-switch. |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | `corpflowai.com` | `corpflowai.com` | Plausible site identity emitted as `data-domain`. |
| `NEXT_PUBLIC_PLAUSIBLE_SRC` | `https://plausible.io/js/script.js` | `https://plausible.io/js/script.js` | Standard Plausible script URL. |

The defaults are designed so a missing-env Production deploy still produces a valid apex-only tag once the kill-switch is `true`. Setting all three explicitly mirrors the Plausible setup screen verbatim.

### 4.7 Never call analytics from tenant-private code paths

The adapter is `lib/analytics/`. It must **not** be imported from any module under `lib/cmp/`, `lib/server/`, `pages/api/`, or any factory/admin route — those all run server-side and have no business firing browser analytics. Server-side observability already lives in `automation_events`, `cmp_tickets`, `telemetry_events`. ESLint rule (suggested in the runtime PR): `no-restricted-imports` for `lib/analytics/*` from any path matching `lib/cmp/**`, `lib/server/**`, `pages/api/**`, `pages/admin/**`, `pages/change*`.

---

## 5. Allow / deny — single source of truth

`lib/analytics/config.js` exports the canonical lists. Both lists are **literal**, not regex, except where noted. The deny-list always wins.

### 5.1 Deny-paths (no script, no events, ever)

```
/change                       (and any /change/*)
/admin                        (and any /admin/*)
/login
/master                       (and any /master/*)
/lux-editor
/lux-guide
/sovereign-intake
/core-lux-migration-repair
/api/                         (prefix match — covers everything)
/_next/                       (prefix match — Next.js internals)
*?token=*                     (regex prefix — any URL with a token query param)
*?reset=*
*?ticket=*
*reset-password*              (substring — covers /forgot-password, /reset-password, etc.)
```

### 5.2 Deny-paths on apex specifically (in addition to 5.1)

```
/concierge                    (tenant-context route, not apex public marketing)
/properties                   (tenant-context)
/property                     (and any sub-paths — tenant-context)
```

`/lead-rescue` is **NOT** in `APEX_DENY_PATH_PREFIXES` in step-1 — it is the apex's primary public marketing landing page today (per ADR `20260527`). It will move into this list later if/when Lead Rescue graduates to its own subdomain.

These apex-deny entries apply **only** on the apex hostname.

### 5.3 Deny-hosts

```
core.corpflowai.com           (factory; never marketing)
lux.corpflowai.com            (tenant working surface — see §2)
luxe.corpflowai.com           (alias of Lux; same posture)
<tenant>.corpflowai.com       (any tenant working surface — denied by absence from ALLOW_HOSTS)
localhost                     (dev)
*.vercel.app                  (preview deployments)
```

The host check is positive: `ALLOW_HOSTS.includes(host)` must be true; everything else is denied by default. The exact deny-list above is defensive (catches obvious dev/preview hosts even if someone adds them to ALLOW_HOSTS by mistake).

### 5.4 Allow-hosts (step-1)

```
corpflowai.com                (apex marketing root + /lead-rescue + /about + /standards + future public apex pages)
```

**Step-2 (deferred):** append `aileadrescue.corpflowai.com` per ADR `20260527`. Future CorpFlow product subdomains follow the same pattern (ADR `20260526`).

---

## 6. Approval gates (what stops execution)

Hard gates per `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §3 — Cursor stops and posts a Telegram blocker per `docs/automation-framework.md`:

1. **Plausible-account / site creation** — Anton must create the Plausible site for each host before any runtime PR opens.
2. **Custom-domain proxy DNS record** — only if Anton wants the ad-blocker-resilient subdomain proxy (`script.<host>.com`). Pure DNS change → Anton-only.
3. **`docs/compliance/DATA_MAP_AND_SUBPROCESSORS.md` update** — must list Plausible Insights as a subprocessor before any runtime PR merges. Cursor can ship the doc-update PR, Anton merges it, then the runtime PR can land.
4. **Runtime snippet PR** — explicit Anton-approved merge per surface. The runtime PR ships only the adapter + the conditional `<PlausibleScript />` mount, with the `NEXT_PUBLIC_PLAUSIBLE_ENABLED` flag defaulting OFF until Anton flips it in Vercel.
5. **Per-host enablement (env flip)** — once merged, Anton flips `NEXT_PUBLIC_PLAUSIBLE_ENABLED=true` and the per-host Plausible site IDs. Each flip is one operator action and is reversible.

If any gate is open, this doc is the source of truth for **what work is ready to land** and **what is blocked**. The current state (2026-05-25) is **all five gates open** — Plausible decision is recorded; nothing is shipped.

---

## 7. Rollout order

Per `docs/operations/ANALYTICS_SEARCH_CONSOLE_ROLLOUT_PLAN.md`, scoped 2026-05-27 to apex-only step-1:

1. **Step-1 — `corpflowai.com` apex only:** Plausible site for `corpflowai.com` registered (Anton, done) → `DATA_MAP_AND_SUBPROCESSORS.md` updated → runtime adapter PR with the §4 design + kill-switch off (this PR) → Anton sets `NEXT_PUBLIC_PLAUSIBLE_ENABLED=true`, `NEXT_PUBLIC_PLAUSIBLE_DOMAIN=corpflowai.com`, `NEXT_PUBLIC_PLAUSIBLE_SRC=https://plausible.io/js/script.js` in Vercel **Production** → redeploy → Plausible verifies the apex (snippet now present) → smoke-test in Plausible "Realtime" dashboard within ~5 minutes → first-week evidence captured under `artifacts/audits/<date>-apex-analytics-rollout/`.
2. **Step-2 — add `aileadrescue.corpflowai.com`:** separate small packet when Anton is ready. Add the subdomain to the same Plausible site's "Domains" list, append to `ALLOW_HOSTS` + `MARKETING_SURFACE_BY_HOST`. Optionally append `/lead-rescue` to `APEX_DENY_PATH_PREFIXES` if the apex page becomes operator-only at that point.
3. **Future CorpFlow product subdomains** — graduate from `corpflowai.com/<path>` (internal, denied) to `<product>.corpflowai.com` (client-facing, allowed). Two-line code diff plus one Plausible UI click.
4. **Tenant client-facing analytics on tenants' own domains** — out of CorpFlow's site. Tenant runs their own Plausible registration on their own domain; CorpFlow does not embed it.

---

## 8. Privacy / compliance posture

- **No cookies, no fingerprinting** — Plausible's design.
- **No PII in event props** — enforced by §3.4 + the adapter's strip-and-allowlist behaviour.
- **No banner required for EU/UK/CH** because we are not setting cookies and not profiling. **However** the privacy notice should still mention that aggregate, non-personal traffic statistics are collected via Plausible — that is a one-line footnote, not a consent surface.
- **Plausible as subprocessor** — `docs/compliance/DATA_MAP_AND_SUBPROCESSORS.md` row goes in the docs-only PR before the runtime PR.
- **Data export / deletion** — Plausible exposes CSV export of aggregated data. There is no per-visitor record to "delete" because we never collect one. This simplifies any future data-subject request to "we hold no personal data on you in our analytics tool".

---

## 9. Reversibility

If v2 swaps providers:

1. Update `lib/analytics/providers/` and `getProvider()` (one provider file + one switch line).
2. Update `lib/analytics/config.js` site IDs / event names if the new provider's schema differs.
3. Remove the Plausible row from `DATA_MAP_AND_SUBPROCESSORS.md`; add the new one.
4. Disable Plausible site (operator UI) — historical data retained per Plausible's policy.

The adapter in §4 is the reason this is one-PR work, not a re-write.

---

## 10. Status (2026-05-27, step-1)

| Stage | State | Owner |
|---|---|---|
| Provider decision recorded | ✅ `docs/decisions/20260525-plausible-analytics-v1.md` | done |
| Internal-vs-client-facing boundary (destination) recorded | ✅ `docs/decisions/20260526-plausible-internal-vs-client-facing-boundary.md` | done |
| Apex-only step-1 scope recorded | ✅ `docs/decisions/20260527-plausible-apex-only-rollout-step1.md` | done |
| Canonical doc (this file) | ✅ scoped 2026-05-27 (apex-only step-1) | done |
| Plausible site for `corpflowai.com` registered | ✅ Anton (apex; standard script + `data-domain`) | done |
| `DATA_MAP_AND_SUBPROCESSORS.md` Plausible row | ✅ #229 | done |
| `lib/analytics/` adapter + `<PlausibleScript />` mount | ✅ #229 | done |
| `node-tests/analytics-policy.test.mjs` | ✅ #229 (15 tests; 395/395 total) | done |
| Kill-switch envs (`_ENABLED`, `_DOMAIN`, `_SRC`) in `.env.template` | ✅ #229 | done |
| Vercel Production env set (apex step-1) | ⏳ awaits #229 merge + Anton's env paste | Anton |
| Live HTML on `https://corpflowai.com/` contains the snippet | ⏳ post-merge + post-env-flip verification | Cursor (verifies) |
| Plausible apex verification passes | ⏳ Plausible side — auto once snippet is live | Anton |
| Step-2: add `aileadrescue.corpflowai.com` | ⏳ separate packet | Anton + Cursor |
| Custom event wiring (Lead Rescue CTAs etc.) | ⏳ separate follow-up packet | Cursor |

When a row flips, update this section in the same PR as the change.
