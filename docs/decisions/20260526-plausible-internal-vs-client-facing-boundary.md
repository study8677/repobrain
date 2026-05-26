# Internal vs client-facing boundary for analytics

**Date:** 2026-05-26
**Status:** accepted
**Decided by:** Anton (CorpFlow operator) + Assistant (Cursor)
**Refines:** `docs/decisions/20260525-plausible-analytics-v1.md`

## Context

`docs/decisions/20260525-plausible-analytics-v1.md` chose Plausible as the v1 analytics provider and named `corpflowai.com` apex + `lux.corpflowai.com` as the in-scope hosts. As we approached the runtime install, two assumptions in that earlier framing turned out to be wrong:

1. **`lux.corpflowai.com` is not a public-buyer marketing surface.** It is a **CorpFlow-internal working/staging surface** where the tenant edits and previews their published site. The tenant's actual public marketing lives (or will live) on a separate real domain (e.g. `luxemaurice.com`), owned and operated by the tenant.
2. **`/lead-rescue` (path on apex) is also internal.** Operators iterate on the AI Lead Rescue product set under that path. The buyer-facing AI Lead Rescue marketing lives on the dedicated subdomain `aileadrescue.corpflowai.com`.

These two facts mean the original "one Plausible site per host" rule was over-engineered for stakeholder isolation between *future* tenants while making the *current* portfolio harder to read. We need a sharper rule that matches how CorpFlow actually operates today and scales to multiple CorpFlow marketing channels without re-architecting per tenant.

## Decision

### 1. Internal product working surfaces are paths on the apex

`corpflowai.com/<path>` hosts the spaces where CorpFlow operators iterate on a product before exposing it to clients. **They are never measured.** Today this is `/lead-rescue`; tomorrow it may be `/onboarding-internal`, `/concierge-staging`, `/<next-product>-internal`, etc. Adding a new internal path means adding it to the apex deny-list in `lib/analytics/config.js` (`APEX_DENY_PATH_PREFIXES`).

### 2. Client-facing marketing surfaces are dedicated subdomains under `*.corpflowai.com`

`aileadrescue.corpflowai.com` is the buyer-facing surface for AI Lead Rescue. Future client-facing CorpFlow products graduate from their internal apex path to their own subdomain (`<product>.corpflowai.com`). **These subdomains are measured under the CorpFlow umbrella Plausible site.**

### 3. Graduation moves a product from apex path → subdomain

When `/<product>` matures from internal to client-facing:

1. The new subdomain (`<product>.corpflowai.com`) is added to:
   - `ALLOW_HOSTS` in `lib/analytics/config.js`
   - `MARKETING_SURFACE_BY_HOST` (with a stable surface label, e.g. `concierge`, `dossier`)
   - The Plausible site's "Site Settings → Domains" list (operator action in the Plausible dashboard)
2. `/<product>` on the apex stays in `APEX_DENY_PATH_PREFIXES` — internal iteration continues there even after the public face goes live.

This makes graduation a small config diff plus one operator click; no adapter rewrite.

### 4. Tenant working subdomains are denied; tenant public domains are off-platform

`<tenant>.corpflowai.com` (e.g. `lux.corpflowai.com`, `luxe.corpflowai.com`, future `tenant-x.corpflowai.com`) are **CorpFlow-internal staging/working surfaces** for the tenant to update their published site. They never load Plausible.

The tenant's **real public marketing domain** (e.g. `luxemaurice.com` for Lux) is the tenant's responsibility:

- They register their own Plausible site under their domain, with their own snippet.
- CorpFlow code does **not** embed tenant Plausible snippets, and CorpFlow's umbrella site does **not** track tenant client-facing traffic.
- Stakeholder isolation is achieved by the registration boundary, not by per-host site IDs in CorpFlow's account.

If a tenant later wants CorpFlow to operate analytics on their behalf, that's a separate paid engagement and a future ADR — explicitly not part of v1.

### 5. The CorpFlow umbrella Plausible site (one site, multiple domains)

The single Plausible site Anton has registered (`pa-atDLaFbloSL8__2jS9sxi.js`) is the **CorpFlow umbrella site** — it gathers all *CorpFlow-owned* client-facing marketing surfaces in one dashboard, filterable by hostname and path. v1 covers `corpflowai.com` and `aileadrescue.corpflowai.com`. Future CorpFlow marketing subdomains join this same site (no new registration needed) by being added to the umbrella site's "Domains" list in Plausible and to `ALLOW_HOSTS`.

## Consequences

- Positive: one dashboard for CorpFlow's whole buyer-funnel portfolio; faster iteration on which surfaces convert; simple operator mental model ("apex paths internal; subdomains public; tenants do their own thing on their own domains").
- Positive: deny-list logic is the single decision surface — no per-page mounts, no risk of leaking analytics into operator routes, no risk of tracking tenants who have not consented.
- Positive: graduation path for new products is a small diff + one Plausible UI click, not a re-registration.
- Negative / follow-ups:
  - The earlier `20260525-plausible-analytics-v1.md` ADR is **refined**, not replaced. The earlier doc still reads correctly for the "Plausible vs alternatives" decision; readers must follow the link to this ADR for the host-grouping rule.
  - `docs/analytics/CORPFLOW_ANALYTICS_V1.md` § 1, § 2, § 3.2, § 4.5, § 5, § 10 require revision in the same change set (done in the runtime PR).
  - `docs/compliance/DATA_MAP_AND_SUBPROCESSORS.md` adds a Plausible Insights row in the same change set (gate 3 of the canonical analytics doc).
  - The runtime install PR (gate 4) ships with the kill-switch env `NEXT_PUBLIC_PLAUSIBLE_ENABLED` defaulted off; Anton flips it on (gate 5) once Plausible-side apex registration completes and `aileadrescue.corpflowai.com` is added to the Plausible site's Domains list.

## Reversibility

- Per-host rule revision: edit `ALLOW_HOSTS` / `APEX_DENY_PATH_PREFIXES` / `MARKETING_SURFACE_BY_HOST` in `lib/analytics/config.js`; redeploy.
- Disable analytics entirely: flip `NEXT_PUBLIC_PLAUSIBLE_ENABLED=false` in Vercel; refresh; no redeploy.
- Replace this rule with per-tenant-site (the original v1 framing): revert this ADR, restore the earlier "one Plausible site per host" wording in the canonical doc, register one site per tenant.

## Links

- `docs/analytics/CORPFLOW_ANALYTICS_V1.md` — canonical analytics doc (revised in the runtime PR).
- `docs/decisions/20260525-plausible-analytics-v1.md` — original Plausible-vs-alternatives ADR (refined by this one).
- `docs/decisions/JOURNAL.md` — journal entry pointing here.
- `docs/compliance/DATA_MAP_AND_SUBPROCESSORS.md` — Plausible Insights row added in the same change set.
- `lib/analytics/config.js` — runtime expression of this decision.
- `pages/_app.js` — single mount point for the conditional `<PlausibleScript />`.
