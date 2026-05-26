# Plausible v1 — apex-only rollout (step-1)

**Date:** 2026-05-27
**Status:** accepted
**Decided by:** Anton (CorpFlow operator)
**Refines:** `docs/decisions/20260526-plausible-internal-vs-client-facing-boundary.md` (umbrella ADR — still authoritative for the *destination* architecture; this ADR scopes the *first step*).

## Context

After PR #228 (Track 2 docs) merged, runtime install in PR #229 was prepared as the umbrella site (apex + `aileadrescue.corpflowai.com`) per the 2026-05-26 ADR. While preparing the live verification, two things turned out to be the actual operator state today:

1. **Plausible verification for `corpflowai.com` was failing** because the live HTML did not yet contain the snippet. The Plausible site is registered under the **standard** Plausible flow (script `https://plausible.io/js/script.js` + `data-domain="corpflowai.com"`), not the "Plausible Auto" hashed-URL flow PR #229 implemented.
2. **Anton's actual rollout intent for "now"** is **`corpflowai.com` only** — `aileadrescue.corpflowai.com` either does not yet exist as a routed host, or has not yet been added to the Plausible site's "Domains" list, so including it in `ALLOW_HOSTS` would push the runtime ahead of the operator state.

The umbrella architecture is still the right destination shape; we just need a sharper step-1 that matches the operator state today and whose env contract matches the standard Plausible flow.

## Decision

### 1. Step-1 scope: **`corpflowai.com` only**

`lib/analytics/config.js` `ALLOW_HOSTS` lists exactly one entry: `corpflowai.com`. Every other `*.corpflowai.com` host (factory, tenant working surfaces, `aileadrescue.corpflowai.com`, future product subdomains) is implicitly off because it is not in `ALLOW_HOSTS`.

`MARKETING_SURFACE_BY_HOST` lists exactly one entry: `corpflowai.com → "apex"`.

### 2. `/lead-rescue` on the apex IS apex public marketing in step-1

The 2026-05-26 ADR put `/lead-rescue` in `APEX_DENY_PATH_PREFIXES` because that ADR planned for Lead Rescue to graduate to its own subdomain "now". In practice, the buyer-facing Lead Rescue page **lives at `corpflowai.com/lead-rescue` today** and there is no `aileadrescue.corpflowai.com` traffic yet. Excluding `/lead-rescue` from analytics in step-1 would mean we measure CorpFlow's apex *without* its single most converting page — defeating the point of the rollout.

`APEX_DENY_PATH_PREFIXES` therefore drops `/lead-rescue`. It keeps `/concierge`, `/properties`, `/property` because those are tenant-context routes (Lux concierge form, Lux property listings) that should not be measured under the apex Plausible site even though they happen to render on the apex host.

### 3. Standard Plausible flow (script + `data-domain`)

`components/analytics/PlausibleScript.js` emits the **standard** Plausible script tag:

```html
<script
  defer
  data-domain="corpflowai.com"
  src="https://plausible.io/js/script.js"
></script>
```

Site identity is in the `data-domain` attribute (read from `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, defaulting to `corpflowai.com`). The script URL is read from `NEXT_PUBLIC_PLAUSIBLE_SRC`, defaulting to `https://plausible.io/js/script.js`. This matches the Plausible verification probe exactly.

### 4. Env contract (operator-set in Vercel Production after merge)

| Env name | Required value (apex step-1) | Why |
|---|---|---|
| `NEXT_PUBLIC_PLAUSIBLE_ENABLED` | `true` | Master kill-switch. Default OFF; operator flips on after Plausible-side verification. |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | `corpflowai.com` | Plausible site identity. The component falls back to `corpflowai.com` if unset, but setting it explicitly is correct and forward-compatible. |
| `NEXT_PUBLIC_PLAUSIBLE_SRC` | `https://plausible.io/js/script.js` | Standard Plausible script URL. The component falls back to this value if unset; setting it explicitly mirrors the Plausible setup screen verbatim. |

These are **public** envs (`NEXT_PUBLIC_*`) — not secrets. Placement: Vercel **Production** scope only (Preview + Development scopes leave them empty so the kill-switch reads OFF in non-production).

### 5. Step-2 graduation (out of scope for this ADR)

When Anton wants to add `aileadrescue.corpflowai.com` (or any future CorpFlow marketing subdomain), the change is:

1. Add the subdomain to the Plausible site's "Domains" list (operator click in dashboard).
2. Append the host to `ALLOW_HOSTS` and `MARKETING_SURFACE_BY_HOST` in `lib/analytics/config.js`.
3. (Optional) Move `/lead-rescue` back into `APEX_DENY_PATH_PREFIXES` if the apex page becomes operator-only at that point.

Each addition is a small one-file diff + one operator click. The 2026-05-26 ADR's umbrella shape is preserved as the destination; this ADR just delays the second host until after the apex is verified live.

## Consequences

- Positive: matches operator state today; Plausible verification can succeed on the next deploy with the kill-switch flipped.
- Positive: `/lead-rescue` is measured under the apex Plausible site — captures the CorpFlow funnel in one place.
- Positive: env contract uses standard Plausible script + `data-domain`, so the snippet in the page source is byte-identical to what the Plausible setup screen shows.
- Negative / follow-ups:
  - The 2026-05-26 ADR's "umbrella site with multiple domains" remains the destination architecture but is now a step-2 packet — a separate small PR + ADR amendment when Anton is ready.
  - If Anton later wants `/lead-rescue` to **stop** being measured under the apex (e.g. once `aileadrescue.corpflowai.com` goes live), that's a one-line config change.

## Links

- Canonical analytics doc: `docs/analytics/CORPFLOW_ANALYTICS_V1.md` (§3 / §5 updated to reflect step-1 scope).
- Companion plan: `docs/operations/ANALYTICS_SEARCH_CONSOLE_ROLLOUT_PLAN.md`.
- Search Console operator playbook: `docs/operations/SEARCH_CONSOLE_INDEXING_ROLLOUT.md`.
- Quality reporting: `docs/operations/WEBSITE_QUALITY_REPORTING_STANDARD.md`.
- Adapter code: `lib/analytics/config.js`, `lib/analytics/index.js`, `components/analytics/PlausibleScript.js`, `pages/_app.js`.
- Tests: `node-tests/analytics-policy.test.mjs`.
