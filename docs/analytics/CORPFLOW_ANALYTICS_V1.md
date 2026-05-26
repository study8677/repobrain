# CorpFlow Analytics v1 — Plausible (canonical)

**Status:** Canonical (v1, 2026-05-25)
**Architectural decision:** `docs/decisions/20260525-plausible-analytics-v1.md`
**Owner:** Anton (operator) for accounts/sites/secrets; Cursor for adapter + audit reports.
**Companion docs (read first; this doc does not restate them):**

- `docs/operations/ANALYTICS_SEARCH_CONSOLE_ROLLOUT_PLAN.md` — order of operations across surfaces.
- `docs/execution/ANALYTICS_SEARCH_CONSOLE_INDEXING_CHECKLIST.md` — per-surface checklist.
- `docs/operations/SEARCH_CONSOLE_INDEXING_ROLLOUT.md` — Search Console operator playbook (independent of analytics).
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — buyer-intent CTA discipline that drives event names.
- `docs/compliance/DATA_MAP_AND_SUBPROCESSORS.md` — must list Plausible before any runtime install.

---

## 1. Decision summary (one screen)

- **Provider:** Plausible Insights.
- **Sites in scope:** `corpflowai.com` (apex), `lux.corpflowai.com` (Lux marketing), future tenant marketing subdomains.
- **Sites NOT in scope:** `core.corpflowai.com`, any factory route, `/change`, `/admin`, `/login`, `/master`, `/lux-editor`, `/lux-guide`, `/sovereign-intake`, `/api/*`, password-reset routes, any authenticated tenant-private surface.
- **GA4:** **not added in v1.** A future tenant-scoped exception is allowed via a separate ADR.
- **Hard gates (`docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §3):** Plausible-account creation, DNS records (custom subdomain proxy), runtime snippet install — all Anton-approved.
- **Privacy posture:** no cookies, no fingerprint, no PII in event props. EU/UK/CH visitors do **not** see a consent banner because Plausible's collection is non-personal.

---

## 2. Tenant-aware analytics — what it means here

CorpFlow runs **multiple marketing surfaces on different hostnames**, each owned by a different stakeholder (apex = CorpFlow itself; `lux.corpflowai.com` = Lux client; future tenants = future clients). The analytics layer must reflect that:

| Concern | Approach |
|---|---|
| **Site separation** | One Plausible "site" per public hostname. Apex traffic ≠ Lux traffic ≠ future-tenant traffic. Operator dashboards are independent. |
| **Event-name namespacing** | All custom events are prefixed by surface (`apex.*` / `lux.*`) so a single internal report can group by tenant if ever federated. |
| **Cross-tenant data leakage** | Forbidden by design. The adapter never sends a tenant's identifier off-domain in event props (e.g. no `tenant_id` field, no ticket IDs). The Plausible site = the host = the only tenant scope that ever leaves our origin. |
| **Internal/private surfaces** | Adapter early-returns on configured deny-paths (factory routes, `/change`, `/admin`, etc.). Even loading the snippet there would create a false event count. |
| **Dev / preview deployments** | `NEXT_PUBLIC_PLAUSIBLE_ENABLED=false` (or unset) on Preview environments and `localhost`. Production-only snippet attach. |

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

### 3.2 Lux (`lux.corpflowai.com`)

| Plausible goal name (display) | Internal event name | Trigger | Props (allowed) | Props (forbidden) |
|---|---|---|---|---|
| Page view | (provider default) | Plausible auto | `path`, `referrer` | tenant-data fields, `console_*` |
| Concierge CTA Click | `lux.concierge.cta-click` | Click of the "Private concierge" / "Private enquiry" CTA | `placement` (`hero` / `card-row` / `footer`) | none |
| Property Detail View | `lux.property.detail-view` | A visit to `/property/<slug>` (Plausible can also auto-handle this as a custom path goal) | `property_slug` (slug only — already in URL) | property price, owner, internal notes |
| Property Enquiry Click | `lux.property.enquiry-click` | Click of "Request details" / "Private enquiry" on a property card | `property_slug`, `placement` | property price, contact info |
| WhatsApp Click | `lux.whatsapp.click` | Click of any `wa.me/…` link in Lux marketing (when added) | `placement` | the WhatsApp number literal |
| Client Login Visit | `lux.client-login.visit` | Page-view of the client-login destination on the Lux host (count only — **no event props**) | none | none |

### 3.3 What never gets an event (not just forbidden, but **must not load the script**)

- `core.corpflowai.com` (factory).
- `/change` and any sub-route (operator console).
- `/admin/*`.
- `/login`, `/master`, `/lux-editor`, `/lux-guide`, `/sovereign-intake`.
- `/api/*` (these are JSON; analytics is for HTML pages only).
- Password-reset URLs (any path containing `reset-password`, `reset-token`, `forgot-password`).
- Any URL whose query string contains a one-time token (`?token=`, `?reset=`, `?ticket=…`).

The adapter's deny-path matcher is the single source of truth — see §5.

### 3.4 Forbidden prop values (no matter the event)

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

### 4.4 Tenant/domain awareness

`lib/analytics/config.js` exports a host → site-config map:

```js
export const SITE_CONFIG = Object.freeze({
  'corpflowai.com':       { siteId: 'corpflowai.com',       enabled_when: 'production' },
  'lux.corpflowai.com':   { siteId: 'lux.corpflowai.com',   enabled_when: 'production' },
  // future tenants append here
  'core.corpflowai.com':  { siteId: null,                   enabled_when: 'never' },
  // Preview / development hosts: not listed → null provider.
});
```

The Plausible "site ID" matches the hostname by convention, which keeps operator setup trivial (one Plausible site per host).

### 4.5 Snippet load strategy

- **Where:** `pages/_app.js`, after `<Head>`, via `next/script` with `strategy="afterInteractive"`. Never inlined; never blocking.
- **When:** only when `isAnalyticsEnabledForPath(host, router.pathname)` returns `true` AND `process.env.NEXT_PUBLIC_PLAUSIBLE_ENABLED === 'true'`.
- **Where the script comes from:** `NEXT_PUBLIC_PLAUSIBLE_SRC` (typically `https://plausible.io/js/script.js` or a custom-domain proxy when Anton sets one up). Custom-domain proxy is recommended for ad-blocker resilience but is itself a DNS gate.
- **Domain attribute:** `data-domain={NEXT_PUBLIC_PLAUSIBLE_DOMAIN || hostname}`. Falls back to `window.location.hostname` if the env is unset, so a misconfigured domain does not collapse to "all hosts share a site".
- **No analytics on private routes by default:** even with the env on, the deny-list in `config.js` early-returns. The deny-list is shipped in code, not env, so it cannot drift.

### 4.6 Suggested env placeholders

These are **suggestions** for the runtime PR, not changes for this docs-only PR. Mirror existing `NEXT_PUBLIC_*` conventions where possible.

| Variable | Purpose | Default if unset |
|---|---|---|
| `NEXT_PUBLIC_PLAUSIBLE_ENABLED` | Master kill-switch (string `"true"` to enable) | `false` (no script loads) |
| `NEXT_PUBLIC_PLAUSIBLE_SRC` | Script URL (Plausible-hosted or custom-domain proxy) | `https://plausible.io/js/script.js` |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Forced domain attribute | `window.location.hostname` |
| `NEXT_PUBLIC_ANALYTICS_PROVIDER` | Future provider switch | `plausible` when enabled, else `null` |

These are **public** envs (`NEXT_PUBLIC_*`) — not secrets. Plausible site identity is the public hostname; nothing here belongs in Infisical's encrypted scope.

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

### 5.2 Deny-hosts

```
core.corpflowai.com           (factory; never marketing)
localhost                     (dev)
*.vercel.app                  (preview deployments)
```

### 5.3 Allow-paths default

`/` and any path **not** matched by 5.1, when host is in 5.2's allow set. This is the **whitelist-by-default-on-public-marketing-host** posture.

### 5.4 Allow-hosts

```
corpflowai.com
lux.corpflowai.com
luxe.corpflowai.com           (alias of Lux; same site ID)
<future-tenant>.corpflowai.com (added per migration packet)
```

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

Per `docs/operations/ANALYTICS_SEARCH_CONSOLE_ROLLOUT_PLAN.md`, deliberately apex-first:

1. **Apex** (`corpflowai.com`) — Plausible site created → `DATA_MAP_AND_SUBPROCESSORS.md` updated → runtime PR with the §4 adapter + apex-only enable → smoke-test in Plausible dashboard within an hour of deploy → first-week evidence captured under `artifacts/audits/<date>-apex-analytics-rollout/`.
2. **Lux** (`lux.corpflowai.com`) — only after apex is COMPLETE. Same recipe with Lux site ID. Conversion goals from §3.2 configured before snippet flips on. Per-tenant migration audit (`docs/execution/CURRENT_CLIENT_MIGRATION_AUDIT_TEMPLATE.md` Section D) is updated to PASS.
3. **Future tenants** — per migration packet. The adapter does not change; only `lib/analytics/config.js` adds the new host row.

The order is not negotiable: shipping Lux before apex would mean the apex (CorpFlow's own marketing surface, where every other surface links) has no measurement.

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

## 10. Status (2026-05-25)

| Stage | State | Owner |
|---|---|---|
| Decision recorded | ✅ `docs/decisions/20260525-plausible-analytics-v1.md` | done |
| Canonical doc (this file) | ✅ this PR | done |
| Plausible site for apex created | ⏳ Anton | gated |
| Plausible site for Lux created | ⏳ Anton (after apex) | gated |
| `DATA_MAP_AND_SUBPROCESSORS.md` updated | ⏳ separate small PR before runtime | Cursor (next packet) |
| Runtime adapter PR (apex) | ⏳ awaits Anton's go-ahead per §6 gate 4 | Cursor |
| Runtime enablement (apex env flip) | ⏳ awaits adapter merge | Anton |
| Runtime adapter PR (Lux) | ⏳ awaits apex COMPLETE | Cursor |
| Runtime enablement (Lux env flip) | ⏳ | Anton |

When a row flips, update this section in the same PR as the change.
